import { useSettings } from "@/hooks/useSettings.ts";
import { useCallback, useEffect, useState } from "react";

interface SettingsDialogProps {
  onClose: () => void;
  openImport: () => void;
  exportFlow: () => void;
  clearWorkflow: () => void;
  resetToDefault: () => void;
}

export const SettingsDialog = ({
  onClose,
  openImport,
  exportFlow,
  clearWorkflow,
  resetToDefault,
}: SettingsDialogProps) => {
  const { settings, updateSetting } = useSettings();
  const [showToken, setShowToken] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDangerAction = useCallback(
    (action: string) => {
      if (confirmAction === action) {
        if (action === "clear") clearWorkflow();
        else if (action === "reset") resetToDefault();
        setConfirmAction(null);
        onClose();
      } else {
        setConfirmAction(action);
      }
    },
    [confirmAction, clearWorkflow, resetToDefault, onClose],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-110 bg-[#0b0e14]/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#131820] border border-[#2a323d] rounded-xl shadow-2xl w-full max-w-[480px] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2630]">
          <h2 className="text-white text-sm font-bold tracking-widest">SETTINGS</h2>
          <button
            onClick={onClose}
            className="text-[#5a6b7c] hover:text-white transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6">
          {/* Hugging Face */}
          <section>
            <h3 className="text-[10px] text-[#00e5ff] font-bold tracking-widest uppercase mb-3">
              Hugging Face
            </h3>
            <label className="text-[10px] text-[#5a6b7c] font-bold tracking-wider uppercase block mb-1.5">
              Access Token
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={settings.hfToken}
                onChange={(e) => updateSetting("hfToken", e.target.value)}
                placeholder="hf_..."
                className="flex-1 bg-[#0b0e14] border border-[#1f2630] rounded px-3 py-2 text-xs text-white font-mono focus:border-[#00e5ff] focus:outline-none placeholder:text-[#5a6b7c]"
              />
              <button
                onClick={() => setShowToken((v) => !v)}
                className="px-2 py-1 text-[9px] font-bold bg-[#1f2630] border border-[#2a323d] rounded text-[#a0aec0] hover:text-white transition-colors"
              >
                {showToken ? "HIDE" : "SHOW"}
              </button>
            </div>
            <p className="text-[9px] text-[#5a6b7c] mt-1.5">
              Required for gated models (e.g. Llama, RMBG). Get one at huggingface.co/settings/tokens
            </p>
          </section>

          {/* Runtime */}
          <section>
            <h3 className="text-[10px] text-[#00e5ff] font-bold tracking-widest uppercase mb-3">
              Runtime
            </h3>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] text-[#5a6b7c] font-bold tracking-wider uppercase block mb-1.5">
                  Device Preference
                </label>
                <select
                  value={settings.devicePreference}
                  onChange={(e) => updateSetting("devicePreference", e.target.value as any)}
                  className="w-full bg-[#0b0e14] border border-[#1f2630] rounded px-3 py-2 text-xs text-white focus:border-[#00e5ff] focus:outline-none"
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
                  className="accent-[#00e5ff]"
                />
                <span className="text-xs text-[#a0aec0]">Auto-save workflow</span>
              </label>
            </div>
          </section>

          {/* Data */}
          <section>
            <h3 className="text-[10px] text-[#00e5ff] font-bold tracking-widest uppercase mb-3">
              Data
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  openImport();
                  onClose();
                }}
                className="text-left px-3 py-2 text-[10px] font-bold text-[#a0aec0] bg-[#0b0e14] border border-[#1f2630] rounded hover:border-[#00e5ff] hover:text-white transition-colors"
              >
                IMPORT WORKFLOW
              </button>
              <button
                onClick={() => {
                  exportFlow();
                  onClose();
                }}
                className="text-left px-3 py-2 text-[10px] font-bold text-[#a0aec0] bg-[#0b0e14] border border-[#1f2630] rounded hover:border-[#00e5ff] hover:text-white transition-colors"
              >
                EXPORT WORKFLOW
              </button>
              <button
                onClick={async () => {
                  const { ModelRegistry } = await import("@/utils/modelRegistry.ts");
                  await ModelRegistry.clear_cache_all();
                }}
                className="text-left px-3 py-2 text-[10px] font-bold text-[#a0aec0] bg-[#0b0e14] border border-[#1f2630] rounded hover:border-[#00e5ff] hover:text-white transition-colors"
              >
                CLEAR MODEL CACHE
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h3 className="text-[10px] text-red-400 font-bold tracking-widest uppercase mb-3">
              Danger Zone
            </h3>
            <div className="flex flex-col gap-2 border border-red-500/20 rounded p-3 bg-red-500/5">
              <button
                onClick={() => handleDangerAction("clear")}
                className="text-left px-3 py-2 text-[10px] font-bold text-red-400 bg-[#0b0e14] border border-[#1f2630] rounded hover:border-red-500 hover:bg-red-500/10 transition-colors"
              >
                {confirmAction === "clear" ? "CONFIRM CLEAR WORKFLOW?" : "CLEAR WORKFLOW"}
              </button>
              <button
                onClick={() => handleDangerAction("reset")}
                className="text-left px-3 py-2 text-[10px] font-bold text-red-400 bg-[#0b0e14] border border-[#1f2630] rounded hover:border-red-500 hover:bg-red-500/10 transition-colors"
              >
                {confirmAction === "reset" ? "CONFIRM RESET TO DEFAULT?" : "RESET TO DEFAULT"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
