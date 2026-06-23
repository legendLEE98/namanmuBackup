export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;
export const DEFAULT_OPACITY = 0.86;

export type CanvasTool = "select" | "ellipse";
export type RGB = readonly [number, number, number];

export interface PaletteColor {
  label: string;
  rgb: RGB;
}

export const COLOR_PALETTE: PaletteColor[] = [
  { label: "Blue", rgb: [25, 118, 210] },
  { label: "Pink", rgb: [239, 71, 111] },
  { label: "Green", rgb: [6, 167, 125] },
  { label: "Yellow", rgb: [242, 193, 78] },
  { label: "Purple", rgb: [124, 58, 237] },
  { label: "Black", rgb: [31, 41, 55] },
  { label: "White", rgb: [255, 255, 255] }
];

export interface EditableEllipse {
  id: string;
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
  fill: string;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface DraftEllipse {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
  visible: boolean;
}

export interface EllipseBounds {
  cx: number;
  cy: number;
  radiusX: number;
  radiusY: number;
}
