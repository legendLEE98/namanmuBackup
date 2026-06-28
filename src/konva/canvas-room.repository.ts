import { createHash } from 'crypto';
import { query } from '../db/database';

export type PersistedCanvasRoom = {
  roomId: string;
  createdAt: string;
};

export async function createPersistedCanvasRoom(password: string) {
  const passwordHash = hashPassword(password);

  const roomResult = await query<{ id: string; created_at: Date }>(
    'insert into rooms (name, password_hash) values ($1, $2) returning id, created_at',
    ['공유 캔버스 방', passwordHash],
  );

  const room = roomResult.rows[0];
  const scene = buildInitialScene(room.id);

  await query(
    'insert into canvases (room_id, title, scene) values ($1, $2, $3::jsonb)',
    [room.id, '기본 캔버스', JSON.stringify(scene)],
  );

  return {
    roomId: room.id,
    createdAt: room.created_at.toISOString(),
  };
}

export function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function buildInitialScene(roomId: string) {
  const shapes = [
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
    {
      roomId,
      id: 'circle_1',
      kind: 'circle',
      x: 420,
      y: 220,
      radius: 48,
      fill: '#38bdf8',
    },
  ];

  return {
    canvas: {
      width: 1920,
      height: 1080,
    },
    slides: [
      {
        slideId: 'slide_1',
        order: 1,
        elements: shapes.map((shape, index) => ({
          elementId: shape.id,
          type: shape.kind === 'circle' ? 'shape' : 'shape',
          x: shape.x,
          y: shape.y,
          width: shape.width ?? (shape.radius ? shape.radius * 2 : 100),
          height: shape.height ?? (shape.radius ? shape.radius * 2 : 100),
          order: index + 1,
          props: {
            kind: shape.kind,
            fill: shape.fill,
            radius: shape.radius,
          },
        })),
      },
    ],
  };
}
