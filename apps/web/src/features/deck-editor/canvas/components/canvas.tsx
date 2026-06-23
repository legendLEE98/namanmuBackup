import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Konva from "konva";
import { Stage } from "react-konva";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type CanvasTool,
  type DraftEllipse,
  type EditableEllipse,
  type SelectionBox
} from "../model/types";
import { getEllipseBoundsFromDrag } from "../model/geometry";
import { ShapeLayer } from "./shape/shape-layer";

interface CanvasProps {
  activeTool: CanvasTool;
  addEllipse: (bounds: { cx: number; cy: number; radiusX: number; radiusY: number }) => void;
  ellipses: EditableEllipse[];
  selectedEllipseIds: string[];
  setActiveTool: (tool: CanvasTool) => void;
  setEllipses: Dispatch<SetStateAction<EditableEllipse[]>>;
  setSelectedEllipseIds: Dispatch<SetStateAction<string[]>>;
  shapeFill: string;
}

export function Canvas({
  activeTool,
  addEllipse,
  ellipses,
  selectedEllipseIds,
  setActiveTool,
  setEllipses,
  setSelectedEllipseIds,
  shapeFill
}: CanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const ellipseRefs = useRef<Record<string, Konva.Ellipse | null>>({});
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    visible: false
  });
  const [draftEllipse, setDraftEllipse] = useState<DraftEllipse>({
    cx: 0,
    cy: 0,
    radiusX: 0,
    radiusY: 0,
    visible: false
  });

  useEffect(() => {
    const transformer = transformerRef.current;

    if (!transformer) {
      return;
    }

    transformer.nodes(selectedEllipseIds.map((id) => ellipseRefs.current[id]).filter((node): node is Konva.Ellipse => Boolean(node)));
    transformer.getLayer()?.batchDraw();
  }, [selectedEllipseIds, ellipses]);

  function getStagePointer(): { x: number; y: number } | null {
    return stageRef.current?.getPointerPosition() ?? null;
  }

  function isShiftPressed(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): boolean {
    return "shiftKey" in event.evt && event.evt.shiftKey;
  }

  function handleStageMouseDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const clickedEmptySpace = event.target === event.target.getStage();
    const pointer = getStagePointer();

    if (!pointer || !clickedEmptySpace) {
      return;
    }

    if (activeTool === "ellipse") {
      dragStartRef.current = pointer;
      setDraftEllipse({
        cx: pointer.x,
        cy: pointer.y,
        radiusX: 0,
        radiusY: 0,
        visible: true
      });
      setSelectionBox((currentBox) => ({ ...currentBox, visible: false }));
      setSelectedEllipseIds([]);
      return;
    }

    dragStartRef.current = pointer;
    setSelectionBox({
      x: pointer.x,
      y: pointer.y,
      width: 0,
      height: 0,
      visible: true
    });
    setSelectedEllipseIds([]);
  }

  function handleStageMouseMove(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const startPoint = dragStartRef.current;
    const pointer = getStagePointer();

    if (!startPoint || !pointer) {
      return;
    }

    if (activeTool === "ellipse") {
      setDraftEllipse({
        ...getEllipseBoundsFromDrag(startPoint, pointer, isShiftPressed(event)),
        visible: true
      });
      return;
    }

    setSelectionBox({
      x: Math.min(startPoint.x, pointer.x),
      y: Math.min(startPoint.y, pointer.y),
      width: Math.abs(pointer.x - startPoint.x),
      height: Math.abs(pointer.y - startPoint.y),
      visible: true
    });
  }

  function handleStageMouseUp(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    const startPoint = dragStartRef.current;

    if (!startPoint) {
      return;
    }

    if (activeTool === "ellipse") {
      const pointer = getStagePointer() ?? startPoint;
      const bounds = getEllipseBoundsFromDrag(startPoint, pointer, isShiftPressed(event));

      if (bounds.radiusX >= 3 && bounds.radiusY >= 3) {
        addEllipse({
          cx: bounds.cx,
          cy: bounds.cy,
          radiusX: Math.round(bounds.radiusX),
          radiusY: Math.round(bounds.radiusY)
        });
      }

      setDraftEllipse((currentEllipse) => ({ ...currentEllipse, visible: false }));
      dragStartRef.current = null;
      setActiveTool("select");
      return;
    }

    const box = {
      x: selectionBox.x,
      y: selectionBox.y,
      width: selectionBox.width,
      height: selectionBox.height
    };
    const selectedIds = ellipses
      .filter((ellipse) =>
        Konva.Util.haveIntersection(box, {
          x: ellipse.cx - ellipse.radiusX,
          y: ellipse.cy - ellipse.radiusY,
          width: ellipse.radiusX * 2,
          height: ellipse.radiusY * 2
        })
      )
      .map((ellipse) => ellipse.id);

    setSelectedEllipseIds(selectedIds);
    setSelectionBox((currentBox) => ({ ...currentBox, visible: false }));
    dragStartRef.current = null;
  }

  function handleEllipseSelect(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>, ellipseId: string): void {
    const additiveSelection = Boolean(
      "shiftKey" in event.evt && (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey)
    );

    if (additiveSelection) {
      setSelectedEllipseIds((currentIds) =>
        currentIds.includes(ellipseId) ? currentIds.filter((id) => id !== ellipseId) : [...currentIds, ellipseId]
      );
      return;
    }

    setSelectedEllipseIds([ellipseId]);
  }

  function handleEllipseDragEnd(event: Konva.KonvaEventObject<DragEvent>, ellipse: EditableEllipse): void {
    const nextX = Math.min(CANVAS_WIDTH - ellipse.radiusX, Math.max(ellipse.radiusX, event.target.x()));
    const nextY = Math.min(CANVAS_HEIGHT - ellipse.radiusY, Math.max(ellipse.radiusY, event.target.y()));

    setEllipses((currentEllipses) =>
      currentEllipses.map((currentEllipse) =>
        currentEllipse.id === ellipse.id ? { ...currentEllipse, cx: nextX, cy: nextY } : currentEllipse
      )
    );
  }

  function handleEllipseTransformEnd(event: Konva.KonvaEventObject<Event>, ellipse: EditableEllipse): void {
    const node = event.target;
    const nextRadiusX = Math.max(3, Math.round(ellipse.radiusX * node.scaleX()));
    const nextRadiusY = Math.max(3, Math.round(ellipse.radiusY * node.scaleY()));

    node.scaleX(1);
    node.scaleY(1);

    setEllipses((currentEllipses) =>
      currentEllipses.map((currentEllipse) =>
        currentEllipse.id === ellipse.id
          ? {
              ...currentEllipse,
              cx: Math.min(CANVAS_WIDTH - nextRadiusX, Math.max(nextRadiusX, node.x())),
              cy: Math.min(CANVAS_HEIGHT - nextRadiusY, Math.max(nextRadiusY, node.y())),
              radiusX: nextRadiusX,
              radiusY: nextRadiusY
            }
          : currentEllipse
      )
    );
  }

  function setEllipseNodeRef(id: string, node: Konva.Ellipse | null): void {
    ellipseRefs.current[id] = node;
  }

  return (
    <div className="preview-canvas editable-preview-canvas">
      <Stage
        className={`circle-editor-stage ${activeTool === "ellipse" ? "is-crosshair" : ""}`}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onTouchMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchEnd={handleStageMouseUp}
      >
        <ShapeLayer
          draftEllipse={draftEllipse}
          ellipses={ellipses}
          selectedEllipseIds={selectedEllipseIds}
          selectionBox={selectionBox}
          shapeFill={shapeFill}
          transformerRef={transformerRef}
          onEllipseDragEnd={handleEllipseDragEnd}
          onEllipseSelect={handleEllipseSelect}
          onEllipseTransformEnd={handleEllipseTransformEnd}
          setEllipseNodeRef={setEllipseNodeRef}
        />
      </Stage>
    </div>
  );
}
