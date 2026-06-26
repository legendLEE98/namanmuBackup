import { SLIDE_SIZE } from "../model/types";

export function CanvasViewport({ children, containerRef, scale, isDrawing }) {
  return (
    <div className="konva-wrap" ref={containerRef}>
      <div
        className={`konva-stage-shell ${isDrawing ? "drawing-mode" : ""}`}
        style={{ width: SLIDE_SIZE.width * scale, height: SLIDE_SIZE.height * scale }}
      >
        {children}
      </div>
    </div>
  );
}
