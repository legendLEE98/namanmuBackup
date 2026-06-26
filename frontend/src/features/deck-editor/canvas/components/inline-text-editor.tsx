import { useEffect, useRef } from "react";

export function InlineTextEditor({ object, scale, theme, onCommit, onCancel, onContextMenu }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const style = object.style || {};

  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.select();
  }, [object.id]);

  return (
    <textarea
      ref={textareaRef}
      className="inline-text-editor"
      defaultValue={object.content || ""}
      style={{
        left: object.x * scale,
        top: object.y * scale,
        width: object.width * scale,
        height: object.height * scale,
        color: style.fill || theme.text,
        fontFamily: style.fontFamily || theme.fontFamily,
        fontSize: (style.fontSize || 28) * scale,
        fontWeight: style.fontWeight || 500,
        textAlign: style.align || "left",
        lineHeight: style.lineHeight || 1.18,
      }}
      onBlur={(event) => onCommit?.(object.id, event.target.value)}
      onContextMenu={(event) => onContextMenu?.(event, object.id)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel?.();
        }
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          onCommit?.(object.id, event.currentTarget.value);
        }
      }}
    />
  );
}
