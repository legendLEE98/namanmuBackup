import type { CanvasTool, RGB } from "../canvas/model/types";
import { FillPopover } from "./fill-popover";

interface TopToolbarProps {
  activeFill: string;
  activeOpacity: number;
  activeRgb: RGB;
  activeTool: CanvasTool;
  hasSelection: boolean;
  isFillPopoverOpen: boolean;
  onDuplicate: () => void;
  onFillPopoverOpenChange: (isOpen: boolean) => void;
  onToolChange: (tool: CanvasTool) => void;
  onUpdateFill: (rgb: RGB, opacity?: number) => void;
}

export function TopToolbar({
  activeFill,
  activeOpacity,
  activeRgb,
  activeTool,
  hasSelection,
  isFillPopoverOpen,
  onDuplicate,
  onFillPopoverOpenChange,
  onToolChange,
  onUpdateFill
}: TopToolbarProps) {
  return (
    <div className="top-editor-bar" aria-label="Editor tools">
      <div className="tool-strip" aria-label="Tool selection">
        <button
          className={`tool-button ${activeTool === "select" ? "is-active" : ""}`}
          type="button"
          onClick={() => onToolChange("select")}
          aria-label="Select tool"
        >
          Select
        </button>
        <button
          className={`tool-button ${activeTool === "ellipse" ? "is-active" : ""}`}
          type="button"
          onClick={() => onToolChange("ellipse")}
          aria-label="Circle and ellipse tool"
        >
          Shape
        </button>
        <button className="tool-button" type="button" aria-label="Text tool" disabled>
          T
        </button>
      </div>

      <div className="toolbar-group" aria-label="Shape fill">
        <span>Fill</span>
        <FillPopover
          activeFill={activeFill}
          activeOpacity={activeOpacity}
          activeRgb={activeRgb}
          isOpen={isFillPopoverOpen}
          onOpenChange={onFillPopoverOpenChange}
          onUpdateFill={onUpdateFill}
        />
      </div>

      <div className="toolbar-group toolbar-actions" aria-label="Selected shape actions">
        <button type="button" onClick={onDuplicate} disabled={!hasSelection}>
          Duplicate
        </button>
      </div>
    </div>
  );
}
