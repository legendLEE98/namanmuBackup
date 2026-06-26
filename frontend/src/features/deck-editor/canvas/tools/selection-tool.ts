import { normalizeRect, rectsIntersect } from "../model/geometry";
import { isBackgroundObject } from "../model/fill";
import { SLIDE_SIZE } from "../model/types";

export function selectedIdsInRect(objects, start, end) {
  const rect = normalizeRect(start, end, false, SLIDE_SIZE);
  if (!rect) return [];
  return objects
    .filter((object) => !isBackgroundObject(object, SLIDE_SIZE))
    .filter((object) => rectsIntersect(rect, object))
    .map((object) => object.id);
}
