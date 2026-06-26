import { normalizeRect } from "../model/geometry";
import { SLIDE_SIZE } from "../model/types";

export function ellipseDraftRect(start, end, lockAspect) {
  return normalizeRect(start, end, lockAspect, SLIDE_SIZE);
}
