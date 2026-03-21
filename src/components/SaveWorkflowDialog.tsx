import { useCallback, useState } from "react";

interface SaveWorkflowDialogProps {
  onSave: (name: string, description: string) => void;
  onClose: () => void;
}

export function SaveWorkflowDialog({ onSave, onClose }: SaveWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
    onClose();
  }, [name, description, onSave, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-(--relax-bg-primary) border border-(--relax-border) rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--relax-border)">
          <h2 className="text-white font-bold text-sm tracking-widest font-mono">
            SAVE WORKFLOW
          </h2>
          <button
            onClick={onClose}
            className="text-(--relax-text-muted) hover:text-white text-lg transition-colors leading-none"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-(--relax-text-muted) text-[10px] font-bold tracking-wider mb-1.5">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workflow"
              className="w-full px-4 py-3 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg text-white text-xs font-mono focus:border-(--relax-accent) focus:outline-none transition-colors"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
          </div>
          <div>
            <label className="block text-(--relax-text-muted) text-[10px] font-bold tracking-wider mb-1.5">
              DESCRIPTION
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
              className="w-full px-4 py-3 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg text-white text-xs font-mono focus:border-(--relax-accent) focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-(--relax-border)">
          <button
            onClick={onClose}
            className="px-4 py-2 text-(--relax-text-muted) hover:text-white text-[10px] font-bold tracking-wider transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 bg-(--relax-accent) text-(--relax-bg-primary) rounded-lg text-[10px] font-bold tracking-wider transition-all hover:shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
