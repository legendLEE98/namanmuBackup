export function normalizeRect(start, end, lockAspect = false, bounds = null) {
  if (!start || !end) return null;
  if (!lockAspect) {
    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y),
    };
  }

  const width = bounds?.width ?? 1280;
  const height = bounds?.height ?? 720;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const maxX = dx < 0 ? start.x : width - start.x;
  const maxY = dy < 0 ? start.y : height - start.y;
  const size = Math.min(Math.max(Math.abs(dx), Math.abs(dy)), maxX, maxY);
  return {
    x: dx < 0 ? start.x - size : start.x,
    y: dy < 0 ? start.y - size : start.y,
    width: size,
    height: size,
  };
}

export function rectsIntersect(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}
