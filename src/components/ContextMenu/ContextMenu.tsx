import { NodeMenuList } from "@/components/NodeMenuList.tsx";
import { useEffect, useRef, useState } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  currentView: string | null;
  onSelect: (type: string) => void;
}

export const ContextMenu = ({ x, y, currentView, onSelect }: ContextMenuProps) => {
  const [adjustedTop, setAdjustedTop] = useState(y);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        setAdjustedTop(Math.max(10, window.innerHeight - rect.height - 10));
      } else if (y + rect.height <= window.innerHeight) {
        setAdjustedTop(y);
      }
    }
  }, [y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg shadow-2xl w-56 font-mono text-xs"
      style={{
        left: Math.min(x, window.innerWidth - 240),
        top: adjustedTop,
        maxHeight: "95vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <NodeMenuList currentView={currentView} onSelect={onSelect} />
    </div>
  );
};
