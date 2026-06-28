# socket.gateway.ts 정리

이 문서는 현재 `src/socket/socket.gateway.ts`가 어떤 역할을 하는지 정리한 문서입니다.

현재 gateway는 크게 두 가지 일을 합니다.

1. Socket.IO 접속자를 추적해서 `/socket` 화면에 보여줍니다.
2. Konva 테스트 캔버스의 도형 위치를 메모리에 저장하고, 다른 클라이언트에게 전파합니다.

아직 Yjs, Redis, DB 저장은 들어가지 않은 상태입니다. 단일 NestJS 프로세스 메모리에서만 동작하는 MVP 구조입니다.

## 전체 흐름

```txt
브라우저 /socket 접속
  -> HTML/JS 로드
  -> socket.io-client가 /socket.io 로 연결
  -> nginx가 /socket.io 요청을 127.0.0.1:8088 Nest 서버로 프록시
  -> Socket.IO handshake 완료
  -> NestJS가 handleConnection(client) 호출
  -> connectedUsers Map에 접속자 저장
  -> users:list 이벤트로 전체 접속자 화면 갱신

브라우저에서 Konva 도형 드래그
  -> socket.emit("canvas:update", shape)
  -> handleCanvasUpdate() 호출
  -> canvasShapes Map에 최신 좌표 저장
  -> client.broadcast.emit("canvas:update", shape)
  -> 다른 브라우저의 Konva stage가 도형 위치 갱신
```

## import 영역

```ts
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
```

### NestJS에서 가져오는 것

`@nestjs/websockets`에서 가져오는 것들은 NestJS가 Socket.IO를 다룰 수 있게 해주는 데코레이터와 인터페이스입니다.

| 이름 | 역할 |
| --- | --- |
| `WebSocketGateway` | 이 클래스가 WebSocket/Socket.IO gateway라는 것을 NestJS에 알려줍니다. |
| `WebSocketServer` | Socket.IO 서버 인스턴스를 클래스 필드에 주입합니다. |
| `SubscribeMessage` | 특정 Socket.IO 이벤트를 처리하는 메서드로 등록합니다. |
| `MessageBody` | 클라이언트가 보낸 이벤트 payload를 메서드 인자로 받습니다. |
| `ConnectedSocket` | 이벤트를 보낸 클라이언트 Socket 객체를 메서드 인자로 받습니다. |
| `OnGatewayConnection` | 연결 성공 hook인 `handleConnection()` 구현을 강제하는 인터페이스입니다. |
| `OnGatewayDisconnect` | 연결 해제 hook인 `handleDisconnect()` 구현을 강제하는 인터페이스입니다. |

### Socket.IO에서 가져오는 것

```ts
import { Server, Socket } from 'socket.io';
```

여기서 `Server`는 NestJS 서버가 아니라 Socket.IO 서버 타입입니다.

`Server` 인스턴스에는 다음 같은 Socket.IO 메서드가 있습니다.

```ts
this.server.emit('event-name', data);
this.server.to(roomId).emit('event-name', data);
```

`Socket`은 클라이언트 연결 하나를 나타냅니다.

```ts
client.id
client.emit(...)
client.broadcast.emit(...)
client.handshake.headers
```

C 소켓으로 비유하면 `Socket`은 `Accept()` 이후 생긴 연결 하나를 감싼 객체에 가깝습니다. 다만 실제 OS fd는 아니고 Socket.IO가 제공하는 논리적 연결 객체입니다.

## ConnectedUser 타입

```ts
type ConnectedUser = {
  id: string;
  ip: string;
  connectedAt: string;
  transport: string;
  environment: {
    browserLabel: string;
    userAgent: string;
    language: string;
  };
};
```

`ConnectedUser`는 화면에 보여줄 접속자 정보 구조입니다.

Socket.IO의 `Socket` 객체 전체를 저장하지 않고, 화면 표시와 디버깅에 필요한 값만 추려서 저장합니다.

| 필드 | 의미 |
| --- | --- |
| `id` | Socket.IO가 연결마다 발급하는 `socket.id`입니다. |
| `ip` | nginx가 넘겨준 실제 접속자 IP 또는 Socket.IO가 본 주소입니다. |
| `connectedAt` | 서버가 이 연결을 받아들인 시각입니다. |
| `transport` | 현재 전송 방식입니다. 보통 `polling` 또는 `websocket`입니다. |
| `environment.browserLabel` | user-agent를 단순 파싱한 브라우저 이름입니다. |
| `environment.userAgent` | 원본 user-agent 문자열입니다. |
| `environment.language` | 브라우저의 `accept-language` 헤더 값입니다. |

## CanvasShape 타입

```ts
type CanvasShape = {
  id: string;
  kind: 'rect' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
};
```

`CanvasShape`는 Konva stage에 그릴 도형 하나의 상태입니다.

현재는 사각형과 원만 지원합니다.

| 필드 | 의미 |
| --- | --- |
| `id` | 도형을 구분하는 ID입니다. |
| `kind` | `rect` 또는 `circle`입니다. |
| `x` | stage 안에서의 x 좌표입니다. |
| `y` | stage 안에서의 y 좌표입니다. |
| `width` | 사각형 너비입니다. |
| `height` | 사각형 높이입니다. |
| `radius` | 원 반지름입니다. |
| `fill` | 도형 색상입니다. |

이 타입은 나중에 공용 캔버스 모델이 커지면 확장 대상입니다.

예를 들면 다음 필드가 추가될 수 있습니다.

```ts
rotation?: number;
scaleX?: number;
scaleY?: number;
zIndex?: number;
locked?: boolean;
updatedBy?: string;
updatedAt?: string;
```

## connectedUsers Map

```ts
const connectedUsers = new Map<string, ConnectedUser>();
```

현재 접속 중인 사용자 목록을 단일 Node.js 프로세스 메모리에 저장합니다.

key는 `socket.id`입니다.

```txt
socket.id -> ConnectedUser
```

예시:

```txt
"iEZtJDREQEvll7XAAAAD" -> {
  id: "iEZtJDREQEvll7XAAAAD",
  ip: "1.238.129.195",
  connectedAt: "2026-06-27T01:34:59.000Z",
  transport: "websocket",
  environment: { ... }
}
```

중요한 점은 이 Map이 연결을 accept하거나 fd를 발급하는 역할이 아니라는 점입니다.

연결 생성, fd 관리, ping/pong, disconnect 감지는 OS, Node.js, Engine.IO, Socket.IO 내부에서 처리합니다.

`connectedUsers`는 이미 연결된 사용자를 화면에 보여주기 위한 애플리케이션 레벨 명부입니다.

## canvasShapes Map

```ts
const canvasShapes = new Map<string, CanvasShape>([
  [
    'rect_1',
    {
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
      id: 'circle_1',
      kind: 'circle',
      x: 420,
      y: 220,
      radius: 48,
      fill: '#38bdf8',
    },
  ],
]);
```

Konva 테스트용 캔버스 상태입니다.

현재는 서버가 도형 두 개를 기본 상태로 들고 있습니다.

```txt
rect_1   -> 주황색 사각형
circle_1 -> 하늘색 원
```

브라우저에서 도형을 드래그하면 클라이언트가 `canvas:update` 이벤트를 보냅니다.

서버는 받은 도형 상태를 검증한 뒤 `canvasShapes`에 저장합니다.

```ts
canvasShapes.set(shape.id, shape);
```

이 구조는 테스트에는 충분하지만 운영 구조는 아닙니다.

서버가 재시작되면 `canvasShapes`는 초기값으로 돌아갑니다. 여러 서버 프로세스를 띄우면 프로세스마다 다른 Map을 가지므로 상태가 갈라질 수 있습니다.

## @WebSocketGateway

```ts
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  ...
}
```

이 데코레이터는 `AppGateway`를 WebSocket gateway로 등록합니다.

현재는 CORS를 전체 허용으로 열어둔 상태입니다.

```ts
cors: {
  origin: '*',
}
```

테스트에는 편하지만 운영에서는 허용 origin을 좁히는 것이 좋습니다.

예:

```ts
cors: {
  origin: ['https://example.com'],
}
```

## @WebSocketServer

```ts
@WebSocketServer()
server: Server;
```

NestJS가 Socket.IO 서버 인스턴스를 `server` 필드에 넣어줍니다.

이 `server`는 `socket.io`의 `Server`입니다. 그래서 `emit()`을 쓸 수 있습니다.

```ts
this.server.emit('users:list', this.users());
```

의미:

```txt
현재 Socket.IO 서버에 연결된 모든 클라이언트에게
users:list 이벤트와 데이터를 보낸다.
```

## handleConnection

```ts
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
```

`handleConnection()`은 Socket.IO 연결이 성공했을 때 NestJS가 호출합니다.

정확히는 TCP accept 순간이 아니라 Socket.IO handshake가 끝나고 `Socket` 객체가 준비된 직후입니다.

흐름:

```txt
1. 브라우저가 /socket.io 로 연결 요청
2. nginx가 8088 Nest 서버로 프록시
3. Engine.IO/Socket.IO handshake 진행
4. socket.id 발급
5. NestJS가 handleConnection(client) 호출
6. buildConnectedUser(client)로 표시용 정보 생성
7. connectedUsers Map에 저장
8. 새 클라이언트에게 server:hello 전송
9. 전체 클라이언트에게 users:list 전송
```

### client.emit

```ts
client.emit('server:hello', {
  message: 'connected',
  socketId: client.id,
});
```

`client.emit()`은 해당 클라이언트 한 명에게만 이벤트를 보냅니다.

```txt
서버 -> 방금 접속한 브라우저 1명
```

### this.emitUsers

```ts
this.emitUsers();
```

접속자 목록이 바뀌었으므로 모든 클라이언트에게 현재 목록을 다시 보냅니다.

## handleDisconnect

```ts
handleDisconnect(client: Socket) {
  connectedUsers.delete(client.id);
  console.log('client disconnected:', client.id);

  this.emitUsers();
}
```

`handleDisconnect()`는 Socket.IO 연결이 끊겼다고 판단되면 NestJS가 호출합니다.

끊김 판단은 우리 코드가 직접 하지 않습니다.

아래 계층이 처리합니다.

```txt
OS TCP
Node.js net/http
Engine.IO ping/pong
Socket.IO connection state
```

정상적으로 탭을 닫거나 새로고침하면 disconnect가 빠르게 들어올 수 있습니다.

하지만 네트워크가 갑자기 끊긴 경우에는 Socket.IO의 ping timeout이 지난 후 disconnect로 판단될 수 있습니다.

Socket.IO 기본값은 보통 다음과 같습니다.

```txt
pingInterval = 25000ms
pingTimeout  = 20000ms
```

현재 코드에 이 숫자가 직접 적혀 있지는 않습니다. Socket.IO 내부 기본값입니다.

직접 설정하려면 `@WebSocketGateway()`에 추가할 수 있습니다.

```ts
@WebSocketGateway({
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 20000,
})
```

## users:list 이벤트

```ts
@SubscribeMessage('users:list')
handleUsersList() {
  return {
    event: 'users:list',
    data: this.users(),
  };
}
```

클라이언트가 다음 이벤트를 보내면 실행됩니다.

```js
socket.emit("users:list");
```

서버는 현재 접속자 목록을 돌려줍니다.

NestJS Socket.IO gateway에서 다음 형태로 return하면:

```ts
return {
  event: 'users:list',
  data: this.users(),
};
```

클라이언트는 `users:list` 이벤트로 데이터를 받습니다.

```js
socket.on("users:list", renderUsers);
```

현재 `/socket` 페이지는 3초마다 이 이벤트를 보내 목록을 갱신합니다.

```js
setInterval(refreshUsers, 3000);
```

## canvas:state 이벤트

```ts
@SubscribeMessage('canvas:state')
handleCanvasState() {
  return {
    event: 'canvas:state',
    data: this.canvasState(),
  };
}
```

새로 접속한 클라이언트가 현재 캔버스 상태를 요청할 때 사용하는 이벤트입니다.

클라이언트 흐름:

```js
socket.on("connect", () => {
  socket.emit("canvas:state");
});
```

서버 응답:

```ts
{
  event: 'canvas:state',
  data: [
    { id: 'rect_1', kind: 'rect', x: 120, y: 120, ... },
    { id: 'circle_1', kind: 'circle', x: 420, y: 220, ... },
  ],
}
```

클라이언트는 이 배열을 받아 Konva stage에 도형을 그립니다.

## canvas:update 이벤트

```ts
@SubscribeMessage('canvas:update')
handleCanvasUpdate(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
  const shape = normalizeCanvasShape(data);
  if (!shape) {
    return;
  }

  canvasShapes.set(shape.id, shape);
  client.broadcast.emit('canvas:update', shape);

  return {
    event: 'canvas:update',
    data: shape,
  };
}
```

Konva 도형을 움직이면 클라이언트가 이 이벤트를 보냅니다.

예:

```js
socket.emit("canvas:update", {
  id: "rect_1",
  kind: "rect",
  x: 180,
  y: 140,
  width: 160,
  height: 96,
  fill: "#f97316"
});
```

서버 처리 흐름:

```txt
1. MessageBody로 payload 수신
2. normalizeCanvasShape(data)로 값 검증 및 정리
3. 유효하지 않으면 무시
4. 유효하면 canvasShapes Map에 저장
5. 이벤트를 보낸 클라이언트를 제외한 다른 클라이언트에게 canvas:update broadcast
6. 이벤트를 보낸 클라이언트에게도 정리된 shape를 응답
```

### @MessageBody

```ts
@MessageBody() data: unknown
```

클라이언트가 보낸 payload입니다.

타입을 `unknown`으로 둔 이유는 클라이언트가 어떤 값을 보낼지 서버가 신뢰하면 안 되기 때문입니다.

그래서 바로 사용하지 않고 `normalizeCanvasShape()`로 검증합니다.

### @ConnectedSocket

```ts
@ConnectedSocket() client: Socket
```

이 이벤트를 보낸 클라이언트의 Socket 객체입니다.

`client.broadcast.emit()`을 쓰기 위해 필요합니다.

### client.broadcast.emit

```ts
client.broadcast.emit('canvas:update', shape);
```

의미:

```txt
이 이벤트를 보낸 클라이언트는 제외하고
나머지 모든 클라이언트에게 canvas:update를 보낸다.
```

도형을 드래그한 브라우저는 이미 자기 화면에서 도형이 움직이고 있습니다.

그래서 다른 브라우저에게만 위치를 전파합니다.

## ping 이벤트

```ts
@SubscribeMessage('ping')
handlePing(@MessageBody() data: unknown) {
  return {
    event: 'pong',
    data,
  };
}
```

이 `ping`은 Socket.IO 내부 생존 확인 ping이 아닙니다.

우리가 만든 테스트용 커스텀 이벤트입니다.

클라이언트가 직접 이렇게 보낼 때만 실행됩니다.

```js
socket.emit("ping", { hello: "world" });
```

서버는 `pong` 이벤트로 같은 payload를 돌려줍니다.

```js
socket.on("pong", console.log);
```

Socket.IO 내부 연결 유지용 ping/pong은 Engine.IO가 내부에서 처리합니다. 그 내부 ping은 이 `handlePing()`으로 들어오지 않습니다.

## broadcast 이벤트

```ts
@SubscribeMessage('broadcast')
handleBroadcast(@MessageBody() data: unknown) {
  this.server.emit('broadcast', data);
}
```

브로드캐스트 테스트용 이벤트입니다.

클라이언트가 `broadcast` 이벤트를 보내면 서버가 모든 클라이언트에게 같은 `broadcast` 이벤트를 전파합니다.

```txt
브라우저 A -> socket.emit("broadcast", data)
서버 -> 모든 브라우저에게 "broadcast" 전송
```

`this.server.emit()`은 보낸 클라이언트까지 포함합니다.

`client.broadcast.emit()`은 보낸 클라이언트를 제외합니다.

## emitUsers

```ts
private emitUsers() {
  this.server.emit('users:list', this.users());
}
```

현재 접속자 목록을 전체 클라이언트에게 전송합니다.

호출 시점:

```txt
handleConnection 이후
handleDisconnect 이후
```

그래서 누군가 들어오거나 나가면 화면이 즉시 갱신될 수 있습니다.

다만 `/socket` 페이지는 별도로 3초마다 `users:list` 요청도 보내고 있습니다.

즉 갱신 경로가 두 개입니다.

```txt
서버 push: 접속/해제 시 this.server.emit("users:list", ...)
클라이언트 poll: 3초마다 socket.emit("users:list")
```

## users

```ts
private users() {
  return [...connectedUsers.values()].sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
}
```

`connectedUsers` Map에 저장된 값을 배열로 변환하고, 접속 시간 기준으로 정렬합니다.

Map은 insertion order를 유지하지만, 화면 표시가 흔들리지 않도록 명시적으로 정렬합니다.

## canvasState

```ts
private canvasState() {
  return [...canvasShapes.values()];
}
```

현재 캔버스 도형 상태를 배열로 반환합니다.

`canvasShapes`는 Map이므로 클라이언트에게 보내기 전에 배열로 바꿉니다.

## buildConnectedUser

```ts
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
```

이 함수는 Socket.IO 연결 객체에서 화면에 보여줄 접속자 정보를 추출합니다.

### handshake.headers

Socket.IO 연결은 처음에 HTTP 요청으로 시작합니다.

그때 들어온 HTTP 헤더를 다음 위치에서 읽습니다.

```ts
client.handshake.headers
```

여기에는 다음 정보가 들어올 수 있습니다.

```txt
x-forwarded-for
x-real-ip
user-agent
accept-language
```

### IP 추출

```ts
const forwardedFor = firstHeader(headers['x-forwarded-for']);
const realIp = firstHeader(headers['x-real-ip']);
```

nginx를 거치면 Nest 서버 입장에서는 접속자가 nginx 또는 localhost처럼 보일 수 있습니다.

그래서 nginx가 원래 접속자 IP를 헤더로 넘겨줘야 합니다.

현재 우선순위:

```ts
const ip = firstForwardedIp(forwardedFor) || realIp || client.handshake.address || 'unknown';
```

의미:

```txt
1. x-forwarded-for의 첫 번째 IP
2. x-real-ip
3. Socket.IO가 직접 본 address
4. unknown
```

### transport

```ts
transport: client.conn.transport.name
```

현재 연결의 전송 방식을 읽습니다.

가능한 값:

```txt
polling
websocket
```

Socket.IO는 처음에 polling으로 붙었다가 websocket으로 upgrade할 수 있습니다.

현재 `ConnectedUser`는 연결 순간의 transport를 저장합니다. 연결 후 upgrade가 일어나면 저장된 값이 자동으로 바뀌지는 않을 수 있습니다.

정확한 최신 transport를 계속 보여주려면 transport upgrade 이벤트를 따로 감지하거나, 목록 생성 시 Socket 객체를 참조하는 구조로 바꿔야 합니다.

## normalizeCanvasShape

```ts
function normalizeCanvasShape(value: unknown): CanvasShape | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === 'string' ? value.id : '';
  const kind = value.kind === 'circle' ? 'circle' : value.kind === 'rect' ? 'rect' : null;
  const x = normalizeNumber(value.x);
  const y = normalizeNumber(value.y);

  if (!id || !kind || x === null || y === null) {
    return null;
  }

  const shape: CanvasShape = {
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
```

클라이언트가 보낸 canvas payload를 검증하고 정리합니다.

중요한 이유:

```txt
클라이언트 입력은 신뢰할 수 없음
잘못된 타입이 들어올 수 있음
NaN, Infinity 같은 숫자가 들어올 수 있음
도형 ID나 kind가 없을 수 있음
```

필수 조건:

```txt
value가 객체여야 함
id가 string이어야 함
kind가 rect 또는 circle이어야 함
x, y가 정상 number여야 함
```

이 조건을 통과하지 못하면 `null`을 반환하고 서버는 이벤트를 무시합니다.

## normalizeNumber

```ts
function normalizeNumber(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value);
}
```

숫자인지 확인하고, `NaN`이나 `Infinity`를 막습니다.

통과한 숫자는 `Math.round()`로 정수화합니다.

Konva 좌표는 소수여도 동작하지만, 테스트 단계에서는 값이 지저분해지지 않도록 정수로 저장합니다.

## isRecord

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
```

`unknown` 값을 객체처럼 다루기 전에 검사하는 타입 가드입니다.

이 검사를 통과해야 `value.id`, `value.x` 같은 속성 접근을 안전하게 할 수 있습니다.

## firstHeader

```ts
function firstHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return value || '';
}
```

Node.js HTTP 헤더 값은 다음 중 하나일 수 있습니다.

```ts
string
string[]
undefined
```

화면 표시와 파싱을 쉽게 하려고 첫 번째 문자열만 꺼냅니다.

## firstForwardedIp

```ts
function firstForwardedIp(value: string) {
  return value.split(',')[0]?.trim();
}
```

`x-forwarded-for`는 프록시를 여러 개 거치면 여러 IP가 쉼표로 들어올 수 있습니다.

예:

```txt
1.238.129.195, 127.0.0.1, 10.0.0.5
```

보통 가장 앞의 IP가 원래 클라이언트 IP입니다.

그래서 첫 번째 값을 사용합니다.

## parseBrowserLabel

```ts
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
```

`user-agent` 문자열을 보고 브라우저 이름을 대략 추정합니다.

현재는 테스트용 단순 문자열 매칭입니다.

주의할 점:

```txt
Edge는 Chrome 문자열도 포함할 수 있으므로 Edg/를 먼저 검사해야 함
Safari도 Chrome 문자열과 함께 나올 수 있으므로 Chrome이 없는 경우만 Safari로 판단
모바일 브라우저는 user-agent가 더 복잡할 수 있음
```

운영에서 더 정확한 파싱이 필요하면 user-agent parser 라이브러리를 쓰는 편이 낫습니다.

## Socket.IO 이벤트 목록

현재 gateway가 처리하거나 보내는 이벤트는 다음과 같습니다.

| 이벤트 | 방향 | 설명 |
| --- | --- | --- |
| `server:hello` | 서버 -> 새 클라이언트 | 연결 성공 메시지입니다. |
| `users:list` | 클라이언트 -> 서버 | 현재 접속자 목록 요청입니다. |
| `users:list` | 서버 -> 클라이언트 | 현재 접속자 목록 응답 또는 push입니다. |
| `canvas:state` | 클라이언트 -> 서버 | 현재 캔버스 전체 상태 요청입니다. |
| `canvas:state` | 서버 -> 클라이언트 | 현재 캔버스 전체 상태 응답입니다. |
| `canvas:update` | 클라이언트 -> 서버 | 도형 하나의 최신 상태를 보냅니다. |
| `canvas:update` | 서버 -> 클라이언트 | 도형 하나의 최신 상태를 다른 클라이언트에게 전파합니다. |
| `ping` | 클라이언트 -> 서버 | 애플리케이션 테스트용 ping입니다. |
| `pong` | 서버 -> 클라이언트 | 애플리케이션 테스트용 pong입니다. |
| `broadcast` | 클라이언트 -> 서버 | 테스트용 전체 브로드캐스트 요청입니다. |
| `broadcast` | 서버 -> 클라이언트 | 테스트용 전체 브로드캐스트 전파입니다. |

## C 소켓 서버와 대응해서 보기

예전에 배운 C 소켓 흐름과 비교하면 다음과 같습니다.

| C 소켓 서버 | 현재 NestJS/Socket.IO 코드 |
| --- | --- |
| `Open_listenfd(port)` | `app.listen(8088)`와 Socket.IO adapter 내부 처리 |
| `Accept(listenfd, ...)` | Node.js/Engine.IO/Socket.IO 내부 처리 |
| `connfd` | `client: Socket` 객체 |
| `getnameinfo(clientaddr, ...)` | `client.handshake.address`, `x-forwarded-for`, `x-real-ip` |
| `read(connfd, ...)` | `@SubscribeMessage(...)` |
| `write(connfd, ...)` | `client.emit(...)` |
| 전체 클라이언트 순회 write | `this.server.emit(...)` |
| 보낸 클라이언트 제외 broadcast | `client.broadcast.emit(...)` |
| `Close(connfd)` | Socket.IO disconnect 처리 후 `handleDisconnect()` 호출 |

가장 중요한 차이는 이겁니다.

```txt
C에서는 accept/read/write/close를 직접 다룸
NestJS/Socket.IO에서는 연결 관리 대부분이 블랙박스
우리 코드는 이벤트 단위로 들어오는 payload와 emit만 관리
```

## 현재 구조의 한계

### 1. 서버 재시작 시 상태가 사라짐

`connectedUsers`와 `canvasShapes`는 모두 메모리 Map입니다.

서버 재시작 시 현재 접속자와 캔버스 위치 상태는 사라집니다.

접속자는 어차피 재접속하면 되지만, 캔버스 상태는 DB나 파일 저장이 없으면 복원할 수 없습니다.

### 2. 여러 서버로 확장하면 상태가 갈라짐

서버를 2대 이상 띄우면 각 서버는 자기 메모리 Map만 압니다.

예:

```txt
사용자 A -> 서버 1
사용자 B -> 서버 2
```

이 경우 서버 1의 `canvas:update`가 서버 2의 사용자에게 바로 가지 않습니다.

이때 필요한 것이 Redis Pub/Sub, Socket.IO Redis Adapter, 또는 별도의 메시지 브로커입니다.

### 3. Yjs 충돌 해결이 아직 없음

현재 `canvas:update`는 마지막으로 도착한 위치가 이기는 구조입니다.

```txt
last write wins
```

두 사람이 같은 도형을 동시에 움직이면 충돌 해결을 정교하게 하지 않습니다.

Yjs를 붙이면 각 클라이언트가 CRDT update를 만들고, 서버는 그 update를 같은 room에 중계하는 구조가 됩니다.

### 4. room 개념이 아직 없음

현재 canvas update는 모든 접속자에게 전파됩니다.

프로젝트별, 발표 세션별, 문서별로 나누려면 Socket.IO room을 써야 합니다.

예:

```ts
client.join(roomId);
this.server.to(roomId).emit('canvas:update', shape);
```

## 다음 단계 추천

현재 단계는 다음을 확인하기 좋습니다.

```txt
Konva가 브라우저에서 그려지는지
Socket.IO 이벤트가 오가는지
여러 브라우저에서 도형 이동이 반영되는지
nginx /socket 경유가 정상인지
```

다음 단계는 아래 순서가 좋습니다.

1. `roomId` 추가
   - 프로젝트 또는 세션별로 캔버스 상태를 분리합니다.

2. `CanvasShape`를 실제 슬라이드 element 모델과 맞추기
   - `elementId`, `type`, `x`, `y`, `width`, `height`, `props` 같은 구조로 맞춥니다.

3. Yjs 적용
   - 서버가 도형 상태를 직접 병합하지 않고 Yjs update를 중계합니다.

4. 상태 저장
   - Yjs update 또는 snapshot을 DB/파일에 저장합니다.

5. Redis 적용
   - 여러 서버 인스턴스에서 같은 room 이벤트를 공유합니다.

## 현재 결론

현재 `socket.gateway.ts`는 운영용 공동편집 서버라기보다, 아래 기능을 검증하는 테스트 gateway입니다.

```txt
Socket.IO 연결 확인
접속자 목록 표시
클라이언트 환경/IP 확인
Konva 도형 상태를 Socket.IO로 공유
단일 서버 메모리 상태 관리
```

이 구조 위에 Yjs를 붙이면 `canvas:update`의 payload가 도형 전체 상태가 아니라 Yjs update 바이너리 또는 인코딩된 update로 바뀌게 됩니다.

Redis는 당장 필수는 아닙니다. 단일 서버 MVP는 지금처럼 메모리만으로 충분합니다. 서버를 여러 대로 늘리거나 프로세스를 여러 개 띄우는 순간 Redis 같은 공유 pub/sub 계층이 필요해집니다.
