import { useMemo, useState } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COLOR_PALETTE,
  DEFAULT_OPACITY,
  type EditableEllipse,
  type EllipseBounds,
  type RGB
} from "../model/types";
import { getFillOpacity, getFillRgb, toRgba } from "../model/fill";

export function useCanvasShapes() {
  const [shapeRgb, setShapeRgb] = useState<RGB>(COLOR_PALETTE[0].rgb);
  const [shapeOpacity, setShapeOpacity] = useState(DEFAULT_OPACITY);
  const [ellipses, setEllipses] = useState<EditableEllipse[]>([]);
  const [selectedEllipseIds, setSelectedEllipseIds] = useState<string[]>([]);

  const selectedEllipse = useMemo(
    () => (selectedEllipseIds.length === 1 ? ellipses.find((ellipse) => ellipse.id === selectedEllipseIds[0]) ?? null : null),
    [ellipses, selectedEllipseIds]
  );
  const shapeFill = toRgba(shapeRgb, shapeOpacity);
  const activeFill = selectedEllipse?.fill ?? shapeFill;
  const activeRgb = getFillRgb(activeFill) ?? shapeRgb;
  const activeOpacity = getFillOpacity(activeFill);

  function addEllipse(bounds: EllipseBounds): void {
    const nextEllipse: EditableEllipse = {
      id: `ellipse-${Date.now()}`,
      cx: bounds.cx,
      cy: bounds.cy,
      radiusX: bounds.radiusX,
      radiusY: bounds.radiusY,
      fill: shapeFill
    };

    setEllipses((currentEllipses) => [...currentEllipses, nextEllipse]);
    setSelectedEllipseIds([nextEllipse.id]);
  }

  function updateSelectedEllipses(update: Partial<Omit<EditableEllipse, "id">>): void {
    if (selectedEllipseIds.length === 0) {
      return;
    }

    setEllipses((currentEllipses) =>
      currentEllipses.map((ellipse) => (selectedEllipseIds.includes(ellipse.id) ? { ...ellipse, ...update } : ellipse))
    );
  }

  function updateShapeFill(rgb: RGB, opacity = activeOpacity): void {
    const fill = toRgba(rgb, opacity);

    setShapeRgb(rgb);
    setShapeOpacity(opacity);
    updateSelectedEllipses({ fill });
  }

  function duplicateSelectedEllipses(): void {
    const selectedEllipses = ellipses.filter((ellipse) => selectedEllipseIds.includes(ellipse.id));

    if (selectedEllipses.length === 0) {
      return;
    }

    const nextEllipses = selectedEllipses.map((ellipse, index) => ({
      ...ellipse,
      id: `ellipse-${Date.now()}-${index}`,
      cx: Math.min(CANVAS_WIDTH - ellipse.radiusX, ellipse.cx + 36),
      cy: Math.min(CANVAS_HEIGHT - ellipse.radiusY, ellipse.cy + 36)
    }));

    setEllipses((currentEllipses) => [...currentEllipses, ...nextEllipses]);
    setSelectedEllipseIds(nextEllipses.map((ellipse) => ellipse.id));
  }

  function deleteSelectedEllipses(): void {
    if (selectedEllipseIds.length === 0) {
      return;
    }

    setEllipses((currentEllipses) => currentEllipses.filter((ellipse) => !selectedEllipseIds.includes(ellipse.id)));
    setSelectedEllipseIds([]);
  }

  return {
    activeFill,
    activeOpacity,
    activeRgb,
    addEllipse,
    deleteSelectedEllipses,
    duplicateSelectedEllipses,
    ellipses,
    selectedEllipseIds,
    setEllipses,
    setSelectedEllipseIds,
    shapeFill,
    updateShapeFill
  };
}
