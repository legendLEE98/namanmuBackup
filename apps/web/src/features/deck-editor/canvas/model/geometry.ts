import type { EllipseBounds } from "./types";

export function getEllipseBoundsFromDrag(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  lockAspectRatio = false
): EllipseBounds {
  let width = Math.abs(endPoint.x - startPoint.x);
  let height = Math.abs(endPoint.y - startPoint.y);
  let nextEndPoint = endPoint;

  if (lockAspectRatio) {
    const size = Math.max(width, height);
    const directionX = endPoint.x >= startPoint.x ? 1 : -1;
    const directionY = endPoint.y >= startPoint.y ? 1 : -1;

    width = size;
    height = size;
    nextEndPoint = {
      x: startPoint.x + size * directionX,
      y: startPoint.y + size * directionY
    };
  }

  return {
    cx: startPoint.x + (nextEndPoint.x - startPoint.x) / 2,
    cy: startPoint.y + (nextEndPoint.y - startPoint.y) / 2,
    radiusX: width / 2,
    radiusY: height / 2
  };
}
