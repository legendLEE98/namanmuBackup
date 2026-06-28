export type ConnectedUser = {
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

export type CanvasShape = {
  roomId: string;
  id: string;
  kind: 'rect' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
};

export type CanvasRoom = {
  roomId: string;
  password: string;
  shapes: Map<string, CanvasShape>;
  createdAt: string;
};
