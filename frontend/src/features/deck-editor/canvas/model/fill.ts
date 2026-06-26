export function isBackgroundObject(object, slideSize) {
  return object?.x === 0
    && object?.y === 0
    && object?.width === slideSize.width
    && object?.height === slideSize.height;
}
