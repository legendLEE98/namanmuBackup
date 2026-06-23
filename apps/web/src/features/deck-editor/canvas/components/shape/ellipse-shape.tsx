import Konva from "konva";
import { Ellipse } from "react-konva";
import type { EditableEllipse } from "../../model/types";

interface EllipseShapeProps {
  ellipse: EditableEllipse;
  onDragEnd: (event: Konva.KonvaEventObject<DragEvent>, ellipse: EditableEllipse) => void;
  onSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, ellipseId: string) => void;
  onTransformEnd: (event: Konva.KonvaEventObject<Event>, ellipse: EditableEllipse) => void;
  setNodeRef: (id: string, node: Konva.Ellipse | null) => void;
}

export function EllipseShape({ ellipse, onDragEnd, onSelect, onTransformEnd, setNodeRef }: EllipseShapeProps) {
  return (
    <Ellipse
      key={ellipse.id}
      id={ellipse.id}
      ref={(node) => {
        setNodeRef(ellipse.id, node);
      }}
      x={ellipse.cx}
      y={ellipse.cy}
      radiusX={ellipse.radiusX}
      radiusY={ellipse.radiusY}
      fill={ellipse.fill}
      stroke="#0f4f94"
      strokeWidth={3}
      shadowColor="rgba(21, 33, 46, 0.25)"
      shadowBlur={18}
      shadowOffset={{ x: 0, y: 10 }}
      draggable
      onClick={(event) => onSelect(event, ellipse.id)}
      onTap={(event) => onSelect(event, ellipse.id)}
      onDragEnd={(event) => onDragEnd(event, ellipse)}
      onTransformEnd={(event) => onTransformEnd(event, ellipse)}
    />
  );
}
