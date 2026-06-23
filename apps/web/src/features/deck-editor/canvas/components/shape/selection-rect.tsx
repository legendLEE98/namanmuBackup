import { Rect } from "react-konva";
import type { SelectionBox } from "../../model/types";

interface SelectionRectProps {
  selectionBox: SelectionBox;
}

export function SelectionRect({ selectionBox }: SelectionRectProps) {
  if (!selectionBox.visible) {
    return null;
  }

  return (
    <Rect
      x={selectionBox.x}
      y={selectionBox.y}
      width={selectionBox.width}
      height={selectionBox.height}
      fill="rgba(122, 183, 255, 0.18)"
      stroke="#1976d2"
      dash={[8, 6]}
    />
  );
}
