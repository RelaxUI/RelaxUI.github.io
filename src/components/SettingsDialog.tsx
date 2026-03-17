import { DEFAULTS } from "@/config/defaults.ts";
import { useSettings } from "@/hooks/useSettings.ts";
import { useEffect, useState } from "react";

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = ({ onClose }: SettingsDialogProps) => {
  const { settings, updateSetting } = useSettings();
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sectionHeadingClass =
    "text-[10px] text-[var(--relax-accent)] font-bold tracking-widest uppercase mb-3";
  const labelClass =
    "text-[10px] text-[var(--relax-text-muted)] font-bold tracking-wider uppercase block mb-1.5";
  const inputClass =
    "w-full bg-[var(--relax-bg-primary)] border border-[var(--relax-border)] rounded px-3 py-2 text-xs text-white font-mono focus:border-[var(--relax-accent)] focus:outline-none placeholder:text-[var(--relax-text-muted)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-110 bg-[var(--relax-bg-primary)]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--relax-bg-elevated)] border border-[var(--relax-border-hover)] rounded-xl shadow-2xl w-full max-w-[480px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--relax-border)]">
          <h2 className="text-white text-sm font-bold tracking-widest">SETTINGS</h2>
          <button
            onClick={onClose}
            className="text-[var(--relax-text-muted)] hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
          {/* Hugging Face */}
          <section>
            <h3 className={sectionHeadingClass}>Hugging Face</h3>
            <label className={labelClass}>Access Token</label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={settings.hfToken}
                onChange={(e) => updateSetting("hfToken", e.target.value)}
                placeholder="hf_..."
                className={`flex-1 ${inputClass}`}
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="px-2 py-1 text-[9px] font-bold bg-[var(--relax-border)] border border-[var(--relax-border-hover)] rounded text-[var(--relax-text-default)] hover:text-white transition-colors"
              >
                {showToken ? "HIDE" : "SHOW"}
              </button>
            </div>
            <p className="text-[9px] text-[var(--relax-text-muted)] mt-1.5">
              Required for gated models (e.g. Llama, RMBG). Get one at huggingface.co/settings/tokens
            </p>
          </section>

          {/* Runtime */}
          <section>
            <h3 className={sectionHeadingClass}>Runtime</h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Device Preference</label>
                <select
                  value={settings.devicePreference}
                  onChange={(e) =>
                    updateSetting("devicePreference", e.target.value as any)
                  }
                  className={inputClass}
                >
                  <option value="auto">Auto (detect best)</option>
                  <option value="webgpu">WebGPU</option>
                  <option value="wasm">WASM</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSetting("autoSave", e.target.checked)}
                  className="accent-[var(--relax-accent)]"
                />
                <span className="text-xs text-[var(--relax-text-default)]">Auto-save workflow</span>
              </label>

              {settings.autoSave && (
                <div>
                  <label className={labelClass}>Auto-save Interval (ms)</label>
                  <input
                    type="number"
                    value={settings.autoSaveDebounceMs}
                    onChange={(e) =>
                      updateSetting(
                        "autoSaveDebounceMs",
                        Math.max(500, Math.min(30000, Number(e.target.value) || DEFAULTS.autoSaveDebounceMs)),
                      )
                    }
                    min={500}
                    max={30000}
                    step={100}
                    className={inputClass}
                  />
                  <p className="text-[9px] text-[var(--relax-text-muted)] mt-1">
                    Debounce delay before saving changes (500–30000ms)
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>Undo History Size</label>
                <input
                  type="number"
                  value={settings.undoHistorySize}
                  onChange={(e) =>
                    updateSetting(
                      "undoHistorySize",
                      Math.max(10, Math.min(500, Number(e.target.value) || DEFAULTS.undoHistorySize)),
                    )
                  }
                  min={10}
                  max={500}
                  step={10}
                  className={inputClass}
                />
                <p className="text-[9px] text-[var(--relax-text-muted)] mt-1">
                  Maximum number of undo snapshots to keep (10–500)
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
