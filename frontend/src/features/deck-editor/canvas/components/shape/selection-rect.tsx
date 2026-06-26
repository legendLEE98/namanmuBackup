import { Rect } from "react-konva";

export function SelectionRect({ rect }) {
  if (!rect) return null;
  return (
    <Rect
      x={rect.x}
      y={rect.y}
      width={Math.max(1, rect.width)}
      height={Math.max(1, rect.height)}
      fill="rgba(49, 87, 245, 0.08)"
      stroke="#3157f5"
      strokeWidth={1}
      dash={[6, 4]}
      listening={false}
    />
  );
}
