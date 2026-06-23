import { useEffect } from "react";

interface UseCanvasShortcutsOptions {
  hasSelection: boolean;
  onDeleteSelection: () => void;
}

export function useCanvasShortcuts({ hasSelection, onDeleteSelection }: UseCanvasShortcutsOptions): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

      if (isTypingTarget || !hasSelection) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        onDeleteSelection();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasSelection, onDeleteSelection]);
}
