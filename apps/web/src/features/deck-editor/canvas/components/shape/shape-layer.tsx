import type { RefObject } from "react";
import Konva from "konva";
import { Layer, Rect } from "react-konva";
import { CANVAS_HEIGHT, CANVAS_WIDTH, type DraftEllipse, type EditableEllipse, type SelectionBox } from "../../model/types";
import { DraftEllipseShape } from "./draft-ellipse";
import { EllipseShape } from "./ellipse-shape";
import { SelectionRect } from "./selection-rect";
import { KonvaTransformer } from "../konva-transformer";

interface ShapeLayerProps {
  draftEllipse: DraftEllipse;
  ellipses: EditableEllipse[];
  selectedEllipseIds: string[];
  selectionBox: SelectionBox;
  shapeFill: string;
  transformerRef: RefObject<Konva.Transformer | null>;
  onEllipseDragEnd: (event: Konva.KonvaEventObject<DragEvent>, ellipse: EditableEllipse) => void;
  onEllipseSelect: (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, ellipseId: string) => void;
  onEllipseTransformEnd: (event: Konva.KonvaEventObject<Event>, ellipse: EditableEllipse) => void;
  setEllipseNodeRef: (id: string, node: Konva.Ellipse | null) => void;
}

export function ShapeLayer({
  draftEllipse,
  ellipses,
  selectedEllipseIds,
  selectionBox,
  shapeFill,
  transformerRef,
  onEllipseDragEnd,
  onEllipseSelect,
  onEllipseTransformEnd,
  setEllipseNodeRef
}: ShapeLayerProps) {
  return (
    <Layer>
      <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#ffffff" listening={false} />
      <DraftEllipseShape draftEllipse={draftEllipse} fill={shapeFill} />
      {ellipses.map((ellipse) => (
        <EllipseShape
          key={ellipse.id}
          ellipse={ellipse}
          onDragEnd={onEllipseDragEnd}
          onSelect={onEllipseSelect}
          onTransformEnd={onEllipseTransformEnd}
          setNodeRef={setEllipseNodeRef}
        />
      ))}
      <SelectionRect selectionBox={selectionBox} />
      <KonvaTransformer ref={transformerRef} selectedCount={selectedEllipseIds.length} />
    </Layer>
  );
}
