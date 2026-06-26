import { Circle, Group } from "react-konva";

export function EllipseShape({ object, fill, stroke, strokeWidth, nodeRef, ...props }) {
  const diameter = Math.min(object.width, object.height);
  return (
    <Group {...props} ref={nodeRef}>
      <Circle
        x={object.width / 2}
        y={object.height / 2}
        radius={diameter / 2}
        scaleX={object.width / diameter}
        scaleY={object.height / diameter}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Group>
  );
}
