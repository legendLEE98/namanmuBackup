import { useEffect, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Path, Rect, Stage, Text, Wedge } from "react-konva";
import { KonvaTransformer } from "./konva-transformer";
import { CanvasViewport } from "./canvas-viewport";
import { CanvasContextMenu } from "./canvas-context-menu";
import { InlineTextEditor } from "./inline-text-editor";
import { EllipseShape } from "./shape/ellipse-shape";
import { SelectionRect } from "./shape/selection-rect";
import { DraftEllipse } from "./shape/draft-ellipse";
import { useStageScale } from "../hooks/use-canvas-shapes";
import { useShiftPressed } from "../hooks/use-canvas-shortcuts";
import { normalizeRect } from "../model/geometry";
import { isBackgroundObject } from "../model/fill";
import { SLIDE_SIZE as SLIDE } from "../model/types";
import { selectedIdsInRect } from "../tools/selection-tool";

export function KonvaSlideEditor({
  currentSlide,
  selectedObjectId,
  selectedObjectIds = [],
  setSelectedObjectId,
  setSelectedObjectIds,
  nodeRefs,
  stageRef,
  transformerRef,
  theme,
  editingTextObjectId,
  activeShapeTool,
  activeTextTool,
  onCreateShape,
  onCreateText,
  onShapeToolDone,
  onTextToolDone,
  onDragStart,
  onDragEnd,
  onMultiDragEnd,
  onTransformStart,
  onTransformEnd,
  onTextDblClick,
  onTextEditCommit,
  onTextEditCancel,
  onOrderObject,
  onCutObject,
  onCopyObject,
  onPasteObject,
  onDeleteObject,
  onGroupObjects,
  onUngroupObject,
  canGroup = false,
  isGroupedObject,
  canPaste = false,
}) {
  const { containerRef, scale } = useStageScale();
  const shellRef = useRef(null);
  const orderHoverTimerRef = useRef(null);
  const multiDragRef = useRef(null);
  const isShiftPressed = useShiftPressed();
  const [draftShape, setDraftShape] = useState(null);
  const [draftText, setDraftText] = useState(null);
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [isOrderSubmenuOpen, setIsOrderSubmenuOpen] = useState(false);
  const editingObject = currentSlide?.objects?.find((object) => object.id === editingTextObjectId && object.type === "text");

  useEffect(() => {
    const transformer = transformerRef.current;
    const nodes = selectedObjectIds.map((objectId) => nodeRefs.current[objectId]).filter(Boolean);
    if (!transformer) return;
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [currentSlide, nodeRefs, selectedObjectIds, transformerRef]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
    };
  }, [contextMenu]);

  useEffect(() => {
    return () => {
      if (orderHoverTimerRef.current) {
        window.clearTimeout(orderHoverTimerRef.current);
      }
    };
  }, []);

  function menuPositionFromClient(clientX, clientY) {
    const rect = shellRef.current?.getBoundingClientRect();
    return {
      x: Math.min((clientX - (rect?.left || 0)), (rect?.width || 240) - 190),
      y: Math.min((clientY - (rect?.top || 0)), (rect?.height || 200) - 176),
    };
  }

  function openContextMenu(event, objectId = selectedObjectId) {
    event.evt.preventDefault();
    event.evt.stopPropagation();
    event.cancelBubble = true;
    if (isDrawing) {
      setContextMenu(null);
      return;
    }
    setIsOrderSubmenuOpen(false);
    if (objectId) {
      const keepMultiSelection = selectedObjectIds.length > 1 && selectedObjectIds.includes(objectId);
      setSelectedObjectId(objectId, keepMultiSelection);
    } else {
      setSelectedObjectId(null);
    }
    setContextMenu({
      objectId: objectId || null,
      ...menuPositionFromClient(event.evt.clientX, event.evt.clientY),
    });
  }

  function openDomContextMenu(event, objectId = selectedObjectId) {
    event.preventDefault();
    event.stopPropagation();
    if (isDrawing) {
      setContextMenu(null);
      return;
    }
    setIsOrderSubmenuOpen(false);
    if (objectId) {
      const keepMultiSelection = selectedObjectIds.length > 1 && selectedObjectIds.includes(objectId);
      setSelectedObjectId(objectId, keepMultiSelection);
    }
    setContextMenu({
      objectId: objectId || null,
      ...menuPositionFromClient(event.clientX, event.clientY),
    });
  }

  function stageContextObjectId(target) {
    let node = target;
    while (node) {
      const id = node.id?.();
      if (id && currentSlide?.objects?.some((object) => object.id === id)) {
        return id;
      }
      node = node.getParent?.();
    }
    return selectedObjectId;
  }

  function applyOrder(order) {
    if (contextMenu?.objectId) {
      onOrderObject?.(contextMenu.objectId, order);
    }
    setContextMenu(null);
  }

  function applyContextAction(action) {
    const objectId = contextMenu?.objectId;
    if (action === "cut" && objectId) onCutObject?.(objectId);
    if (action === "copy" && objectId) onCopyObject?.(objectId);
    if (action === "paste") onPasteObject?.({ plain: false });
    if (action === "pastePlain") onPasteObject?.({ plain: true });
    if (action === "delete" && objectId) onDeleteObject?.(objectId);
    if (action === "group") onGroupObjects?.();
    if (action === "ungroup" && objectId) onUngroupObject?.(objectId);
    setContextMenu(null);
  }

  function scheduleOrderSubmenu() {
    if (orderHoverTimerRef.current) {
      window.clearTimeout(orderHoverTimerRef.current);
    }
    orderHoverTimerRef.current = window.setTimeout(() => {
      setIsOrderSubmenuOpen(true);
      orderHoverTimerRef.current = null;
    }, 500);
  }

  function openOrderSubmenuNow() {
    if (orderHoverTimerRef.current) {
      window.clearTimeout(orderHoverTimerRef.current);
      orderHoverTimerRef.current = null;
    }
    setIsOrderSubmenuOpen(true);
  }

  function handleObjectDragStart(objectId, node) {
    const ids = selectedObjectIds.includes(objectId) ? selectedObjectIds : [objectId];
    multiDragRef.current = {
      leaderId: objectId,
      leaderStart: { x: node.x(), y: node.y() },
      positions: Object.fromEntries(
        ids
          .map((id) => [id, nodeRefs.current[id]])
          .filter(([, item]) => Boolean(item))
          .map(([id, item]) => [id, { x: item.x(), y: item.y() }]),
      ),
    };
    onDragStart?.(objectId);
  }

  function handleObjectDragMove(objectId, node) {
    const drag = multiDragRef.current;
    if (!drag || drag.leaderId !== objectId || Object.keys(drag.positions).length <= 1) {
      return;
    }
    const dx = node.x() - drag.leaderStart.x;
    const dy = node.y() - drag.leaderStart.y;
    const positionMap = drag.positions as Record<string, { x: number; y: number }>;
    Object.entries(positionMap).forEach(([id, position]) => {
      if (id === objectId) return;
      const item = nodeRefs.current[id];
      item?.position({ x: position.x + dx, y: position.y + dy });
    });
    node.getLayer()?.batchDraw();
  }

  function handleObjectDragEnd(objectId, node) {
    const drag = multiDragRef.current;
    multiDragRef.current = null;
    if (drag && drag.leaderId === objectId && Object.keys(drag.positions).length > 1) {
      const positions = Object.fromEntries(
        Object.keys(drag.positions)
          .map((id) => [id, nodeRefs.current[id]])
          .filter(([, item]) => Boolean(item))
          .map(([id, item]) => [id, { x: item.x(), y: item.y() }]),
      );
      onMultiDragEnd?.(positions);
      return;
    }
    onDragEnd?.(objectId, node);
  }

  function stagePoint(event) {
    const stage = event.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: Math.max(0, Math.min(SLIDE.width, pointer.x / scale)),
      y: Math.max(0, Math.min(SLIDE.height, pointer.y / scale)),
    };
  }

    function textRectFromDraft(draft) {
    const rect = normalizeRect(draft.start, draft.end, false);
    if (rect && rect.width > 8 && rect.height > 8) {
      return rect;
    }
    return {
      x: Math.min(draft.start.x, SLIDE.width - 360),
      y: Math.min(draft.start.y, SLIDE.height - 96),
      width: 360,
      height: 96,
    };
  }

  const draftRect = draftShape ? normalizeRect(draftShape.start, draftShape.end, isShiftPressed) : null;
  const draftTextRect = draftText ? normalizeRect(draftText.start, draftText.end, false) : null;
  const selectionRect = selectionDraft ? normalizeRect(selectionDraft.start, selectionDraft.end, false) : null;
  const isDrawing = Boolean(activeShapeTool || activeTextTool);

  return (
    <CanvasViewport containerRef={containerRef} scale={scale} isDrawing={isDrawing}>
      <div ref={shellRef} style={{ position: "relative" }} onContextMenu={(event) => openDomContextMenu(event)}>
          <Stage
            ref={stageRef}
            width={SLIDE.width * scale}
            height={SLIDE.height * scale}
            scaleX={scale}
            scaleY={scale}
            onMouseDown={(event) => {
              setContextMenu(null);
              if (event.target === event.target.getStage()) {
                if (activeShapeTool) {
                  const point = stagePoint(event);
                  if (point) setDraftShape({ shape: activeShapeTool, start: point, end: point });
                } else if (activeTextTool) {
                  const point = stagePoint(event);
                  if (point) setDraftText({ start: point, end: point });
                } else {
                  const point = stagePoint(event);
                  if (point) setSelectionDraft({ start: point, end: point, additive: event.evt.shiftKey });
                }
              }
            }}
            onMouseMove={(event) => {
              if (!draftShape && !draftText && !selectionDraft) return;
              const point = stagePoint(event);
              if (point) setDraftShape((draft) => (draft ? { ...draft, end: point } : draft));
              if (point) setDraftText((draft) => (draft ? { ...draft, end: point } : draft));
              if (point) setSelectionDraft((draft) => (draft ? { ...draft, end: point } : draft));
            }}
            onMouseUp={() => {
              if (draftShape) {
                const rect = normalizeRect(draftShape.start, draftShape.end, isShiftPressed);
                setDraftShape(null);
                if (rect && rect.width > 8 && rect.height > 8) {
                  onCreateShape?.(draftShape.shape, rect);
                  onShapeToolDone?.();
                }
              }
              if (draftText) {
                const rect = textRectFromDraft(draftText);
                setDraftText(null);
                onCreateText?.(rect);
                onTextToolDone?.();
              }
              if (selectionDraft) {
                const rect = normalizeRect(selectionDraft.start, selectionDraft.end, false);
                setSelectionDraft(null);
                if (!rect || (rect.width < 4 && rect.height < 4)) {
                  if (!selectionDraft.additive) setSelectedObjectId(null);
                  return;
                }
                const ids = selectedIdsInRect(currentSlide?.objects || [], selectionDraft.start, selectionDraft.end);
                setSelectedObjectIds?.(ids, selectionDraft.additive);
              }
            }}
            onTouchStart={(event) => {
              if (event.target === event.target.getStage()) setSelectedObjectId(null);
            }}
            onContextMenu={(event) => {
              event.evt.preventDefault();
              if (event.target === event.target.getStage()) {
                openContextMenu(event, null);
                return;
              }
              openContextMenu(event, stageContextObjectId(event.target));
            }}
          >
            <Layer>
              {(currentSlide?.objects || []).map((object) => (
                <SlideObjectNode
                  key={object.id}
                  object={object}
                  theme={theme}
                  selected={selectedObjectIds.includes(object.id)}
                  drawingMode={isDrawing}
                  nodeRefs={nodeRefs}
                  onSelect={(additive) => {
                    const keepMultiSelection = !additive && selectedObjectIds.length > 1 && selectedObjectIds.includes(object.id);
                    setSelectedObjectId(object.id, additive || keepMultiSelection);
                  }}
                  onDragStart={handleObjectDragStart}
                  onDragMove={handleObjectDragMove}
                  onDragEnd={handleObjectDragEnd}
                  onTransformStart={onTransformStart}
                  onTransformEnd={onTransformEnd}
                  onTextDblClick={onTextDblClick}
                  onContextMenu={openContextMenu}
                />
              ))}
              {draftRect && (
                <ShapeNode
                  object={{
                    id: "draft-shape",
                    type: "shape",
                    ...draftRect,
                    rotation: 0,
                    style: { shape: draftShape.shape, fill: "rgba(49, 87, 245, 0.12)", stroke: "#3157f5", radius: 18 },
                  }}
                  theme={theme}
                />
              )}
              <DraftEllipse rect={draftTextRect} />
              <SelectionRect rect={selectionRect} />
              <KonvaTransformer transformerRef={transformerRef} snapRotation={isShiftPressed} />
            </Layer>
          </Stage>
        {editingObject && (
          <InlineTextEditor
            object={editingObject}
            scale={scale}
            theme={theme}
            onCommit={onTextEditCommit}
            onCancel={onTextEditCancel}
            onContextMenu={openDomContextMenu}
          />
        )}
        <CanvasContextMenu
          contextMenu={contextMenu}
          canPaste={canPaste}
          canGroup={canGroup}
          isGroupedObject={isGroupedObject}
          isOrderSubmenuOpen={isOrderSubmenuOpen}
          onAction={applyContextAction}
          onOrder={applyOrder}
          onScheduleOrderSubmenu={scheduleOrderSubmenu}
          onOpenOrderSubmenu={openOrderSubmenuNow}
        />
      </div>
    </CanvasViewport>
  );
}

function SlideObjectNode({ object, theme, selected, drawingMode, nodeRefs, onSelect, onDragStart, onDragMove, onDragEnd, onTransformStart, onTransformEnd, onTextDblClick, onContextMenu }) {
  const bindNode = (node) => {
    if (node) nodeRefs.current[object.id] = node;
    else delete nodeRefs.current[object.id];
  };
  const common = {
    ref: bindNode,
    id: object.id,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation || 0,
    draggable: selected && !drawingMode && !isBackgroundObject(object, SLIDE),
    listening: !drawingMode && !isBackgroundObject(object, SLIDE),
    onMouseDown: (event) => {
      event.cancelBubble = true;
      onSelect?.(event.evt?.shiftKey);
    },
    onClick: (event) => {
      event.cancelBubble = true;
      onSelect?.(event.evt?.shiftKey);
    },
    onTap: (event) => {
      event.cancelBubble = true;
      onSelect?.(event.evt?.shiftKey);
    },
    onDragStart: (event) => onDragStart?.(object.id, event.target),
    onDragMove: (event) => onDragMove?.(object.id, event.target),
    onDragEnd: (event) => onDragEnd?.(object.id, event.target),
    onTransformStart: () => onTransformStart?.(object.id),
    onTransformEnd: (event) => onTransformEnd?.(object.id, event.target),
    onContextMenu: (event) => onContextMenu?.(event, object.id),
  };

  if (object.type === "text") {
    const style = object.style || {};
    return (
      <Text
        {...common}
        text={object.content || ""}
        fill={style.fill || theme.text}
        fontFamily={style.fontFamily || theme.fontFamily}
        fontSize={Number(style.fontSize || 28)}
        fontStyle={style.fontStyle || "normal"}
        fontVariant={style.fontWeight >= 700 ? "bold" : "normal"}
        align={style.align || "left"}
        verticalAlign={style.verticalAlign || "top"}
        lineHeight={style.lineHeight || 1.18}
        padding={style.padding || 0}
        onDblClick={(event) => {
          event.cancelBubble = true;
          onTextDblClick?.(object.id);
        }}
        onDblTap={(event) => {
          event.cancelBubble = true;
          onTextDblClick?.(object.id);
        }}
        onTransform={(event) => {
          const node = event.target;
          node.width(Math.max(20, node.width() * node.scaleX()));
          node.height(Math.max(20, node.height() * node.scaleY()));
          node.scaleX(1);
          node.scaleY(1);
        }}
        onTransformEnd={(event) => {
          const node = event.target;
          node.width(Math.max(20, node.width() * node.scaleX()));
          node.height(Math.max(20, node.height() * node.scaleY()));
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd?.(object.id, node);
        }}
      />
    );
  }

  const { ref: _unusedRef, ...groupCommon } = common;

  if (object.type === "chart") {
    return <ChartNode {...groupCommon} nodeRef={bindNode} object={object} theme={theme} />;
  }

  return <ShapeNode {...groupCommon} nodeRef={bindNode} object={object} theme={theme} />;
}

function ShapeNode({ object, theme, nodeRef = null, ...props }) {
  const style = object.style || {};
  const fill = style.fill || theme.surface || "#ffffff";
  const stroke = style.stroke || "transparent";
  const strokeWidth = Number(style.strokeWidth || 1.5);
  const groupProps = {
    x: object.x,
    y: object.y,
    rotation: object.rotation || 0,
    ...props,
  };

  if (style.shape === "ellipse") {
    return <EllipseShape {...groupProps} object={object} fill={fill} stroke={stroke} strokeWidth={strokeWidth} nodeRef={nodeRef} />;
  }

  const points = shapePoints(style.shape, object.width, object.height);
  if (points) {
    return (
      <Group {...groupProps} ref={nodeRef}>
        <Line points={points} closed fill={fill} stroke={stroke} strokeWidth={strokeWidth} tension={0} />
      </Group>
    );
  }

  const symbol = shapeSymbol(style.shape, object.width, object.height, fill, stroke, strokeWidth, theme);
  if (symbol) {
    return (
      <Group {...groupProps} ref={nodeRef}>
        {symbol}
      </Group>
    );
  }

  return (
    <Group {...groupProps} ref={nodeRef}>
      <Rect width={object.width} height={object.height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} cornerRadius={style.shape === "roundRect" ? Number(style.radius || 16) : 0} />
    </Group>
  );
}

function ChartNode({ object, theme, nodeRef, ...props }) {
  const groupProps = {
    x: object.x,
    y: object.y,
    rotation: object.rotation || 0,
    ...props,
  };
  const spec = object.chartSpec || { labels: [], values: [], title: "" };
  const values = spec.values || [];
  const labels = spec.labels || [];
  const max = Math.max(...values, 1);
  const barGap = 12;
  const chartX = 28;
  const chartY = 70;
  const chartW = object.width - 56;
  const chartH = object.height - 112;
  const barW = values.length ? (chartW - barGap * (values.length - 1)) / values.length : 0;

  return (
    <Group {...groupProps} ref={nodeRef}>
      <Rect width={object.width} height={object.height} fill={object.style?.fill || theme.surface} stroke={object.style?.stroke || "#d7dee8"} cornerRadius={18} />
      <Text x={28} y={24} width={object.width - 56} text={spec.title || "Chart"} fill={theme.text} fontSize={18} fontStyle="bold" />
      {values.map((value, index) => {
        const h = Math.max(8, (value / max) * chartH);
        return (
          <Group key={`${labels[index] || index}-${value}`} x={chartX + index * (barW + barGap)}>
            <Rect y={chartY + chartH - h} width={barW} height={h} fill={object.style?.barColor || theme.primary} cornerRadius={6} />
            <Text y={chartY + chartH + 10} width={barW} text={labels[index] || ""} fill={theme.mutedText} fontSize={11} align="center" />
          </Group>
        );
      })}
    </Group>
  );
}

function shapePoints(shape, width, height) {
  const midX = width / 2;
  const midY = height / 2;
  const polygon = (count, radius = Math.min(width, height) / 2, offset = -Math.PI / 2) =>
    Array.from({ length: count }, (_, index) => {
      const angle = offset + (Math.PI * 2 * index) / count;
      return [midX + Math.cos(angle) * radius, midY + Math.sin(angle) * radius];
    }).flat();
  const star = () =>
    Array.from({ length: 10 }, (_, index) => {
      const radius = index % 2 === 0 ? Math.min(width, height) / 2 : Math.min(width, height) / 4;
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
      return [midX + Math.cos(angle) * radius, midY + Math.sin(angle) * radius];
    }).flat();
  const map = {
    triangle: [midX, 0, width, height, 0, height],
    rightTriangle: [0, 0, width, height, 0, height],
    diamond: [midX, 0, width, midY, midX, height, 0, midY],
    pentagon: polygon(5),
    hexagon: polygon(6),
    octagon: polygon(8),
    parallelogram: [width * 0.22, 0, width, 0, width * 0.78, height, 0, height],
    trapezoid: [0, 0, width, 0, width * 0.8, height, width * 0.2, height],
    chevron: [0, 0, width * 0.38, 0, width, midY, width * 0.38, height, 0, height, width * 0.62, midY],
    arrowRight: [0, height * 0.25, width * 0.62, height * 0.25, width * 0.62, 0, width, midY, width * 0.62, height, width * 0.62, height * 0.75, 0, height * 0.75],
    arrowLeft: [width, height * 0.25, width * 0.38, height * 0.25, width * 0.38, 0, 0, midY, width * 0.38, height, width * 0.38, height * 0.75, width, height * 0.75],
    plus: [width * 0.38, 0, width * 0.62, 0, width * 0.62, height * 0.38, width, height * 0.38, width, height * 0.62, width * 0.62, height * 0.62, width * 0.62, height, width * 0.38, height, width * 0.38, height * 0.62, 0, height * 0.62, 0, height * 0.38, width * 0.38, height * 0.38],
    star: star(),
    lightning: [width * 0.58, 0, width * 0.2, height * 0.55, width * 0.48, height * 0.55, width * 0.36, height, width * 0.82, height * 0.38, width * 0.54, height * 0.38],
    callout: [0, 0, width, 0, width, height * 0.72, width * 0.58, height * 0.72, width * 0.36, height, width * 0.42, height * 0.72, 0, height * 0.72],
  };
  return map[shape] || null;
}

function shapeSymbol(shape, width, height, fill, stroke, strokeWidth, theme) {
  const accent = stroke === "transparent" ? theme.primary : stroke;
  const midX = width / 2;
  const midY = height / 2;
  const size = Math.min(width, height);

  if (shape === "cylinder") {
    const top = height * 0.18;
    return (
      <>
        <Path data={`M 0 ${top} C 0 0, ${width} 0, ${width} ${top} L ${width} ${height - top} C ${width} ${height}, 0 ${height}, 0 ${height - top} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Path data={`M 0 ${top} C 0 ${top * 2}, ${width} ${top * 2}, ${width} ${top}`} fillEnabled={false} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  }

  if (shape === "cube") {
    const depth = size * 0.22;
    return (
      <>
        <Rect x={0} y={depth} width={width - depth} height={height - depth} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Line points={[depth, 0, width, 0, width, height - depth, width - depth, height, width - depth, depth, depth, depth]} closed fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Line points={[0, depth, depth, 0, width, 0, width - depth, depth, width - depth, height, width, height - depth]} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  }

  if (shape === "cloud") {
    return <Path data={`M ${width * 0.18} ${height * 0.68} C ${width * 0.02} ${height * 0.66}, ${width * 0.02} ${height * 0.42}, ${width * 0.22} ${height * 0.42} C ${width * 0.26} ${height * 0.18}, ${width * 0.58} ${height * 0.15}, ${width * 0.66} ${height * 0.38} C ${width * 0.86} ${height * 0.36}, ${width} ${height * 0.5}, ${width * 0.92} ${height * 0.68} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (shape === "heart") {
    return <Path data={`M ${midX} ${height * 0.86} C ${width * 0.08} ${height * 0.54}, 0 ${height * 0.28}, ${width * 0.2} ${height * 0.12} C ${width * 0.36} 0, ${midX} ${height * 0.14}, ${midX} ${height * 0.28} C ${midX} ${height * 0.14}, ${width * 0.64} 0, ${width * 0.8} ${height * 0.12} C ${width} ${height * 0.28}, ${width * 0.92} ${height * 0.54}, ${midX} ${height * 0.86} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (shape === "smile") {
    return (
      <>
        <Circle x={midX} y={midY} radius={size * 0.46} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Circle x={midX - size * 0.16} y={midY - size * 0.12} radius={size * 0.035} fill={accent} />
        <Circle x={midX + size * 0.16} y={midY - size * 0.12} radius={size * 0.035} fill={accent} />
        <Path data={`M ${midX - size * 0.2} ${midY + size * 0.08} C ${midX - size * 0.08} ${midY + size * 0.22}, ${midX + size * 0.08} ${midY + size * 0.22}, ${midX + size * 0.2} ${midY + size * 0.08}`} fillEnabled={false} stroke={accent} strokeWidth={Math.max(2, strokeWidth)} />
      </>
    );
  }

  if (shape === "sun") {
    const circleRadius = size * 0.27;
    const rays = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
      return {
        startX: midX + Math.cos(angle) * (circleRadius + size * 0.05),
        startY: midY + Math.sin(angle) * (circleRadius + size * 0.05),
        endX: midX + Math.cos(angle) * size * 0.5,
        endY: midY + Math.sin(angle) * size * 0.5,
      };
    });
    return (
      <>
        <Circle x={midX} y={midY} radius={circleRadius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        {rays.map((ray, index) => (
          <Line key={`sun-ray-${index}`} points={[ray.startX, ray.startY, ray.endX, ray.endY]} stroke={stroke} strokeWidth={strokeWidth} />
        ))}
      </>
    );
  }

  if (shape === "moon") {
    return <Path data={`M ${width * 0.72} ${height * 0.08} C ${width * 0.42} ${height * 0.16}, ${width * 0.24} ${height * 0.4}, ${width * 0.3} ${height * 0.64} C ${width * 0.36} ${height * 0.88}, ${width * 0.62} ${height}, ${width * 0.86} ${height * 0.9} C ${width * 0.52} ${height * 0.8}, ${width * 0.42} ${height * 0.48}, ${width * 0.72} ${height * 0.08} Z`} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (shape === "arc") {
    return <Path data={`M ${width * 0.16} ${height * 0.72} C ${width * 0.28} ${height * 0.18}, ${width * 0.72} ${height * 0.18}, ${width * 0.84} ${height * 0.72}`} fillEnabled={false} stroke={stroke} strokeWidth={Math.max(3, strokeWidth)} />;
  }

  if (shape === "brace") {
    return <Path data={`M ${width * 0.68} 0 C ${width * 0.34} ${height * 0.08}, ${width * 0.64} ${height * 0.42}, ${width * 0.28} ${midY} C ${width * 0.64} ${height * 0.58}, ${width * 0.34} ${height * 0.92}, ${width * 0.68} ${height}`} fillEnabled={false} stroke={stroke} strokeWidth={Math.max(3, strokeWidth)} />;
  }

  if (shape === "frame") {
    const pad = Math.max(6, size * 0.13);
    return (
      <>
        <Rect width={width} height={height} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Rect x={pad} y={pad} width={Math.max(1, width - pad * 2)} height={Math.max(1, height - pad * 2)} fill={theme.background || "#ffffff"} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  }

  if (shape === "target") {
    return (
      <>
        <Circle x={midX} y={midY} radius={size * 0.46} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Circle x={midX} y={midY} radius={size * 0.3} fillEnabled={false} stroke={accent} strokeWidth={strokeWidth} />
        <Circle x={midX} y={midY} radius={size * 0.12} fillEnabled={false} stroke={accent} strokeWidth={strokeWidth} />
      </>
    );
  }

  if (shape === "no") {
    return (
      <>
        <Circle x={midX} y={midY} radius={size * 0.46} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Line points={[midX - size * 0.32, midY + size * 0.32, midX + size * 0.32, midY - size * 0.32]} stroke={accent} strokeWidth={Math.max(3, strokeWidth)} />
      </>
    );
  }

  if (shape === "crosshair") {
    return (
      <>
        <Circle x={midX} y={midY} radius={size * 0.38} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Line points={[midX, 0, midX, height, 0, midY, width, midY]} stroke={accent} strokeWidth={strokeWidth} />
        <Circle x={midX} y={midY} radius={size * 0.08} fillEnabled={false} stroke={accent} strokeWidth={strokeWidth} />
      </>
    );
  }

  if (shape === "pie") {
    return (
      <>
        <Circle x={midX} y={midY} radius={size * 0.46} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
        <Wedge x={midX} y={midY} radius={size * 0.46} angle={92} rotation={-90} fill={accent} stroke={stroke} strokeWidth={strokeWidth} />
      </>
    );
  }

  return null;
}

function shapeIcon(shape) {
  return {
    star: "☆",
    cloud: "☁",
    heart: "♡",
    smile: "☺",
    sun: "☼",
    moon: "◐",
    target: "◎",
    no: "⊘",
    crosshair: "⊕",
    lightning: "ϟ",
    callout: "▱",
    pie: "◔",
    cylinder: "▭",
    cube: "◫",
    arc: "◜",
    brace: "❬",
    frame: "▣",
  }[shape] || "";
}
