import type { Dispatch, SetStateAction } from "react";
import { Canvas } from "./canvas";
import type { CanvasTool, EditableEllipse, EllipseBounds } from "../model/types";

interface CanvasViewportProps {
  activeTool: CanvasTool;
  addEllipse: (bounds: EllipseBounds) => void;
  ellipses: EditableEllipse[];
  selectedEllipseIds: string[];
  setActiveTool: (tool: CanvasTool) => void;
  setEllipses: Dispatch<SetStateAction<EditableEllipse[]>>;
  setSelectedEllipseIds: Dispatch<SetStateAction<string[]>>;
  shapeFill: string;
}

export function CanvasViewport({
  activeTool,
  addEllipse,
  ellipses,
  selectedEllipseIds,
  setActiveTool,
  setEllipses,
  setSelectedEllipseIds,
  shapeFill
}: CanvasViewportProps) {
  return (
    <section className="slide-preview" aria-label="Editor canvas">
      <div className="canvas-toolbar">
        <span>
          {activeTool === "ellipse"
            ? "Drag on the canvas to draw. Hold Shift for a perfect circle."
            : "Drag empty canvas to select multiple shapes."}
        </span>
        <span>{selectedEllipseIds.length > 0 ? `${selectedEllipseIds.length} selected` : "No selection"}</span>
      </div>
      <Canvas
        activeTool={activeTool}
        addEllipse={addEllipse}
        ellipses={ellipses}
        selectedEllipseIds={selectedEllipseIds}
        setActiveTool={setActiveTool}
        setEllipses={setEllipses}
        setSelectedEllipseIds={setSelectedEllipseIds}
        shapeFill={shapeFill}
      />
    </section>
  );
}
