import { CanvasRoom, CanvasShape } from './canvas.types';

const canvasRooms = new Map<string, CanvasRoom>();

export function createCanvasRoom(roomId: string, password: string, createdAt = new Date().toISOString()) {
  const room: CanvasRoom = {
    roomId,
    password,
    shapes: createInitialShapes(roomId),
    createdAt,
  };

  canvasRooms.set(roomId, room);
  return room;
}

export function getCanvasRoom(roomId: string) {
  return canvasRooms.get(roomId);
}

export function verifyCanvasRoomPassword(roomId: string, password: string) {
  return canvasRooms.get(roomId)?.password === password;
}

export function getCanvasState(roomId: string) {
  return [...(canvasRooms.get(roomId)?.shapes.values() || [])];
}

export function updateCanvasShape(shape: CanvasShape) {
  const room = canvasRooms.get(shape.roomId);
  if (!room) {
    return false;
  }

  room.shapes.set(shape.id, shape);
  return true;
}

export function createInitialShapes(roomId: string) {
  return new Map<string, CanvasShape>([
    [
      'rect_1',
      {
        roomId,
        id: 'rect_1',
        kind: 'rect',
        x: 120,
        y: 120,
        width: 160,
        height: 96,
        fill: '#f97316',
      },
    ],
    [
      'circle_1',
      {
        roomId,
        id: 'circle_1',
        kind: 'circle',
        x: 420,
        y: 220,
        radius: 48,
        fill: '#38bdf8',
      },
    ],
  ]);
}
