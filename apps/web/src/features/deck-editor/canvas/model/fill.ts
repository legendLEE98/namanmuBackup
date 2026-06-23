import type { RGB } from "./types";

export function toRgba(rgb: RGB, opacity: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity.toFixed(2)})`;
}

export function getFillRgb(fill: string): RGB | null {
  const match = fill.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function getFillOpacity(fill: string): number {
  const match = fill.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);

  if (!match) {
    return 1;
  }

  return Math.min(1, Math.max(0, Number(match[1])));
}

export function getRgbKey(rgb: RGB): string {
  return rgb.join(",");
}
