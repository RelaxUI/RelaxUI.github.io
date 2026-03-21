import { useMemory, type MemoryItem } from "@/hooks/useMemory.ts";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MemoryPickerProps {
  types: MemoryItem["type"][];
  onSelect: (value: string, item: MemoryItem) => void;
}

export const MemoryPicker = ({ types, onSelect }: MemoryPickerProps) => {
  const { items } = useMemory();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const filtered = useMemo(
    () => items.filter((i) => types.includes(i.type)),
    [items, types],
  );

  // Position the dropdown relative to the button
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 220),
    });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target) || dropRef.current?.contains(target))
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on scroll (ReactFlow panning)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("wheel", handler, { passive: true });
    return () => window.removeEventListener("wheel", handler);
  }, [open]);

  if (filtered.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
          open
            ? "bg-(--relax-accent) text-(--relax-bg-primary)"
            : "text-(--relax-text-muted) hover:text-(--relax-accent)"
        }`}
        title="Insert from Memory"
      >
        <svg viewBox="0 0 16 16" className="w-2.5 h-2.5" fill="currentColor">
          <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h7A1.5 1.5 0 0 1 13 1.5v13A1.5 1.5 0 0 1 11.5 16h-7A1.5 1.5 0 0 1 3 14.5v-13zM4.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-7zM6 4h4v1H6V4zm0 3h4v1H6V7zm0 3h4v1H6v-1z" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={dropRef}
            className="fixed z-9999 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg shadow-2xl w-56 max-h-64 overflow-y-auto custom-scrollbar"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="px-2 py-1.5 border-b border-(--relax-border) flex items-center justify-between">
              <span className="text-[8px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
                Memory
              </span>
              <span className="text-[8px] text-(--relax-text-muted)">
                {filtered.length} {filtered.length === 1 ? "item" : "items"}
              </span>
            </div>
            <div className="p-1 flex flex-col gap-px">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.value, item);
                    setOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-(--relax-accent)/10 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-bold uppercase px-1 py-px rounded bg-(--relax-border) text-(--relax-text-muted) shrink-0">
                      {item.type}
                    </span>
                    <span className="text-[10px] font-bold text-white truncate group-hover:text-(--relax-accent) transition-colors">
                      {item.name}
                    </span>
                  </div>
                  {item.type === "text" && (
                    <div className="text-[9px] text-(--relax-text-muted) truncate mt-0.5 pl-0.5">
                      {item.value.slice(0, 100)}
                    </div>
                  )}
                  {item.type === "image" && (
                    <img
                      src={item.value}
                      className="w-full h-12 object-cover rounded mt-1 opacity-60 group-hover:opacity-100 transition-opacity"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
