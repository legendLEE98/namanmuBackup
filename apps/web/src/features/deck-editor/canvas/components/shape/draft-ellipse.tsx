import { Ellipse } from "react-konva";
import type { DraftEllipse } from "../../model/types";

interface DraftEllipseShapeProps {
  draftEllipse: DraftEllipse;
  fill: string;
}

export function DraftEllipseShape({ draftEllipse, fill }: DraftEllipseShapeProps) {
  if (!draftEllipse.visible) {
    return null;
  }

  return (
    <Ellipse
      x={draftEllipse.cx}
      y={draftEllipse.cy}
      radiusX={draftEllipse.radiusX}
      radiusY={draftEllipse.radiusY}
      fill={fill}
      opacity={0.56}
      stroke="#1976d2"
      dash={[8, 6]}
      listening={false}
    />
  );
}
