import { Transformer } from "react-konva";
import { ROTATION_SNAPS_45 } from "../tools/tool-types";

export function KonvaTransformer({ transformerRef, snapRotation }) {
  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
      rotationSnaps={snapRotation ? ROTATION_SNAPS_45 : []}
      ignoreStroke
    />
  );
}
