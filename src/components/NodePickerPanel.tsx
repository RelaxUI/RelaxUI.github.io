import { NodeMenuList } from "@/components/NodeMenuList.tsx";
import { useEffect } from "react";

interface NodePickerPanelProps {
  currentView: string | null;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export const NodePickerPanel = ({ currentView, onSelect, onClose }: NodePickerPanelProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelect = (type: string) => {
    onSelect(type);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-110 bg-[var(--relax-bg-primary)]/80 backdrop-blur-sm flex items-center justify-center p-4 sm:justify-end sm:p-0"
      onClick={onClose}
    >
      <div
        className="bg-[var(--relax-bg-elevated)] border border-[var(--relax-border-hover)] rounded-xl sm:rounded-none shadow-2xl w-full max-w-[400px] sm:w-80 h-full sm:h-screen flex flex-col overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--relax-border)] shrink-0">
          <h2 className="text-[var(--relax-text-bright)] text-[10px] font-bold tracking-widest uppercase">Add Node</h2>
          <button
            onClick={onClose}
            className="text-[var(--relax-text-muted)] hover:text-white transition-colors text-sm leading-none px-1"
          >
            &times;
          </button>
        </div>

        <NodeMenuList currentView={currentView} onSelect={handleSelect} />
      </div>
    </div>
  );
};
