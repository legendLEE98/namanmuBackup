import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  createCanvasRoom,
  getCanvasRoom,
  getCanvasState,
  updateCanvasShape,
  verifyCanvasRoomPassword,
} from '../konva/canvas-room.store';
import { createPersistedCanvasRoom } from '../konva/canvas-room.repository';
import { CanvasShape, ConnectedUser } from '../konva/canvas.types';

const connectedUsers = new Map<string, ConnectedUser>();

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const user = buildConnectedUser(client);
    connectedUsers.set(client.id, user);

    console.log('client connected:', client.id, user.ip, user.environment.browserLabel);

    client.emit('server:hello', {
      message: 'connected',
      socketId: client.id,
    });

    this.emitUsers();
  }

  handleDisconnect(client: Socket) {
    const roomId = readSocketRoomId(client);
    connectedUsers.delete(client.id);
    console.log('client disconnected:', client.id);

    this.emitUsers();
    if (roomId) {
      this.emitRoomUsers(roomId);
    }
  }

  @SubscribeMessage('room:create')
  async handleRoomCreate(@MessageBody() data: unknown) {
    const password = readPassword(data);
    if (!password) {
      return {
        event: 'room:error',
        data: { message: '비밀번호를 입력해 주세요.' },
      };
    }

    const persistedRoom = await createPersistedCanvasRoom(password);
    const room = createCanvasRoom(persistedRoom.roomId, password, persistedRoom.createdAt);
    console.log('canvas room created:', room.roomId);

    return {
      event: 'room:created',
      data: {
        roomId: room.roomId,
        createdAt: room.createdAt,
      },
    };
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    const payload = readRoomPasswordPayload(data);
    if (!payload) {
      return {
        event: 'room:error',
        data: { message: 'Room ID and password are required.' },
      };
    }

    const room = getCanvasRoom(payload.roomId);
    if (!room) {
      return {
        event: 'room:error',
        data: { message: 'Room does not exist. Create a room from /socket.' },
      };
    }

    if (!verifyCanvasRoomPassword(payload.roomId, payload.password)) {
      return {
        event: 'room:error',
        data: { message: 'Password does not match.' },
      };
    }

    const previousRoomId = readSocketRoomId(client);
    if (previousRoomId) {
      client.leave(socketRoomName(previousRoomId));
      this.emitRoomUsers(previousRoomId);
    }

    client.join(socketRoomName(room.roomId));
    client.data.canvasRoomId = room.roomId;
    this.emitRoomUsers(room.roomId);

    return {
      event: 'room:joined',
      data: {
        roomId: room.roomId,
        joinedAt: new Date().toISOString(),
      },
    };
  }

  @SubscribeMessage('users:list')
  handleUsersList() {
    return {
      event: 'users:list',
      data: this.users(),
    };
  }

  @SubscribeMessage('room:users')
  handleRoomUsers(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    const roomId = readRoomId(data) || readSocketRoomId(client);
    if (!roomId || readSocketRoomId(client) !== roomId) {
      return {
        event: 'room:error',
        data: { message: 'Join the room before reading room users.' },
      };
    }

    return {
      event: 'room:users',
      data: this.roomUsers(roomId),
    };
  }

  @SubscribeMessage('canvas:state')
  handleCanvasState(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    const roomId = readRoomId(data) || readSocketRoomId(client);
    const room = roomId ? getCanvasRoom(roomId) : null;

    if (!room || readSocketRoomId(client) !== room.roomId) {
      return {
        event: 'room:error',
        data: { message: 'Join the room before reading canvas state.' },
      };
    }

    return {
      event: 'canvas:state',
      data: getCanvasState(room.roomId),
    };
  }

  @SubscribeMessage('canvas:update')
  handleCanvasUpdate(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    const shape = normalizeCanvasShape(data);
    if (!shape) {
      return;
    }

    const joinedRoomId = readSocketRoomId(client);
    if (joinedRoomId !== shape.roomId) {
      return {
        event: 'room:error',
        data: { message: 'You can only update the room you joined.' },
      };
    }

    if (!updateCanvasShape(shape)) {
      return {
        event: 'room:error',
        data: { message: 'Room does not exist.' },
      };
    }

    client.broadcast.to(socketRoomName(shape.roomId)).emit('canvas:update', shape);

    return {
      event: 'canvas:update',
      data: shape,
    };
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() data: unknown) {
    return {
      event: 'pong',
      data,
    };
  }

  @SubscribeMessage('broadcast')
  handleBroadcast(@MessageBody() data: unknown) {
    this.server.emit('broadcast', data);
  }

  private emitUsers() {
    this.server.emit('users:list', this.users());
  }

  private emitRoomUsers(roomId: string) {
    this.server.to(socketRoomName(roomId)).emit('room:users', this.roomUsers(roomId));
  }

  private users() {
    return [...connectedUsers.values()].sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
  }

  private roomUsers(roomId: string) {
    const socketIds = this.server.sockets.adapter.rooms.get(socketRoomName(roomId));
    if (!socketIds) {
      return [];
    }

    return [...socketIds]
      .map((socketId) => connectedUsers.get(socketId))
      .filter((user): user is ConnectedUser => Boolean(user))
      .sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
  }
}

function buildConnectedUser(client: Socket): ConnectedUser {
  const headers = client.handshake.headers;
  const forwardedFor = firstHeader(headers['x-forwarded-for']);
  const realIp = firstHeader(headers['x-real-ip']);
  const userAgent = firstHeader(headers['user-agent']) || 'unknown';
  const language = firstHeader(headers['accept-language']) || 'unknown';
  const ip = firstForwardedIp(forwardedFor) || realIp || client.handshake.address || 'unknown';

  return {
    id: client.id,
    ip,
    connectedAt: new Date().toISOString(),
    transport: client.conn.transport.name,
    environment: {
      browserLabel: parseBrowserLabel(userAgent),
      userAgent,
      language,
    },
  };
}

function normalizeCanvasShape(value: unknown): CanvasShape | null {
  if (!isRecord(value)) {
    return null;
  }

  const roomId = typeof value.roomId === 'string' ? value.roomId : '';
  const id = typeof value.id === 'string' ? value.id : '';
  const kind = value.kind === 'circle' ? 'circle' : value.kind === 'rect' ? 'rect' : null;
  const x = normalizeNumber(value.x);
  const y = normalizeNumber(value.y);

  if (!roomId || !id || !kind || x === null || y === null) {
    return null;
  }

  const shape: CanvasShape = {
    roomId,
    id,
    kind,
    x,
    y,
  };

  const width = normalizeNumber(value.width);
  const height = normalizeNumber(value.height);
  const radius = normalizeNumber(value.radius);

  if (width !== null) {
    shape.width = width;
  }
  if (height !== null) {
    shape.height = height;
  }
  if (radius !== null) {
    shape.radius = radius;
  }
  if (typeof value.fill === 'string') {
    shape.fill = value.fill;
  }

  return shape;
}

function readPassword(value: unknown) {
  if (!isRecord(value) || typeof value.password !== 'string') {
    return '';
  }
  return value.password.trim();
}

function readRoomPasswordPayload(value: unknown) {
  if (!isRecord(value) || typeof value.roomId !== 'string' || typeof value.password !== 'string') {
    return null;
  }

  return {
    roomId: value.roomId.trim(),
    password: value.password.trim(),
  };
}

function readRoomId(value: unknown) {
  if (!isRecord(value) || typeof value.roomId !== 'string') {
    return '';
  }
  return value.roomId.trim();
}

function readSocketRoomId(client: Socket) {
  return typeof client.data.canvasRoomId === 'string' ? client.data.canvasRoomId : '';
}

function socketRoomName(roomId: string) {
  return `canvas:${roomId}`;
}

function normalizeNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function firstHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}

function firstForwardedIp(value: string) {
  return value.split(',')[0]?.trim();
}

function parseBrowserLabel(userAgent: string) {
  if (userAgent.includes('Edg/')) {
    return 'Microsoft Edge';
  }
  if (userAgent.includes('Chrome/')) {
    return 'Chrome';
  }
  if (userAgent.includes('Firefox/')) {
    return 'Firefox';
  }
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    return 'Safari';
  }
  if (userAgent.includes('curl/')) {
    return 'curl';
  }
  return 'Unknown client';
}
