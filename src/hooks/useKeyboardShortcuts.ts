import { useEffect } from "react";

interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  exportFlow: () => void;
  runFlow: () => void;
  escape: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          handlers.escape();
          return;
        }
        return;
      }

      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handlers.redo();
      } else if (isMod && e.key === "z") {
        e.preventDefault();
        handlers.undo();
      } else if (isMod && e.key === "c") {
        e.preventDefault();
        handlers.copy();
      } else if (isMod && e.key === "v") {
        e.preventDefault();
        handlers.paste();
      } else if (isMod && e.key === "s") {
        e.preventDefault();
        handlers.exportFlow();
      } else if (isMod && e.key === "Enter") {
        e.preventDefault();
        handlers.runFlow();
      } else if (e.key === "Escape") {
        handlers.escape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
