import { forwardRef } from "react";
import Konva from "konva";
import { Transformer } from "react-konva";

interface KonvaTransformerProps {
  selectedCount: number;
}

export const KonvaTransformer = forwardRef<Konva.Transformer, KonvaTransformerProps>(function KonvaTransformer(
  _props,
  ref
) {
  return (
    <Transformer
      ref={ref}
      rotateEnabled={false}
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right"
      ]}
      boundBoxFunc={(oldBox, newBox) => (newBox.width < 36 || newBox.height < 36 ? oldBox : newBox)}
    />
  );
});
