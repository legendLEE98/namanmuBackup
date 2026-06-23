import { COLOR_PALETTE, type RGB } from "../canvas/model/types";
import { getRgbKey, toRgba } from "../canvas/model/fill";

interface FillPopoverProps {
  activeFill: string;
  activeOpacity: number;
  activeRgb: RGB;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateFill: (rgb: RGB, opacity?: number) => void;
}

export function FillPopover({ activeFill, activeOpacity, activeRgb, isOpen, onOpenChange, onUpdateFill }: FillPopoverProps) {
  return (
    <div className="fill-popover-anchor">
      <button
        className="fill-chip"
        type="button"
        style={{ backgroundColor: activeFill }}
        onClick={() => onOpenChange(!isOpen)}
        aria-label="Open fill palette"
        aria-expanded={isOpen}
      />
      {isOpen ? (
        <div className="color-palette-popover" role="dialog" aria-label="Fill palette">
          <div className="toolbar-swatches" aria-label="Color palette">
            {COLOR_PALETTE.map((color) => {
              const fill = toRgba(color.rgb, activeOpacity);

              return (
                <button
                  className={getRgbKey(activeRgb) === getRgbKey(color.rgb) ? "is-selected" : ""}
                  type="button"
                  key={color.label}
                  style={{ backgroundColor: fill }}
                  onClick={() => onUpdateFill(color.rgb)}
                  aria-label={`${color.label} fill`}
                />
              );
            })}
          </div>
          <label className="opacity-control">
            <span>Opacity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(activeOpacity * 100)}
              onChange={(event) => onUpdateFill(activeRgb, Number(event.target.value) / 100)}
              aria-label="Fill opacity"
            />
            <strong>{Math.round(activeOpacity * 100)}%</strong>
          </label>
        </div>
      ) : null}
    </div>
  );
}
