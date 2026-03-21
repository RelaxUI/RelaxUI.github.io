import { DEFAULTS } from "@/config/defaults.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import {
  clearAllCaches,
  getBrowserCacheStats,
  getModelCacheStats,
  type BrowserCacheStats,
} from "@/engine/transformersExecutor.ts";
import { useMemory, type MemoryItem } from "@/hooks/useMemory.ts";
import { DEFAULT_THEME, useSettings, type HandleLayout, type ThemeColors } from "@/hooks/useSettings.ts";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface SettingsDialogProps {
  onClose: () => void;
}

export const SettingsDialog = ({ onClose }: SettingsDialogProps) => {
  const { settings, updateSetting } = useSettings();
  const { globalNodes } = useContext(RuntimeContext)!;
  const { items: memoryItems, addItem, removeItem } = useMemory();
  const [showToken, setShowToken] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [addingText, setAddingText] = useState(false);
  const [newTextName, setNewTextName] = useState("");
  const [newTextValue, setNewTextValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cacheStats, setCacheStats] = useState(getModelCacheStats);
  const [browserCache, setBrowserCache] = useState<BrowserCacheStats>({
    cacheNames: [],
    totalEntries: 0,
    estimatedBytes: 0,
  });
  const [clearing, setClearing] = useState(false);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  const refreshCacheStats = useCallback(() => {
    setCacheStats(getModelCacheStats());
    getBrowserCacheStats().then(setBrowserCache);
  }, []);

  // Load browser cache stats on mount
  useEffect(() => {
    getBrowserCacheStats().then(setBrowserCache);
  }, []);

  const handleClearCache = useCallback(async () => {
    setClearing(true);
    await clearAllCaches();
    refreshCacheStats();
    setClearing(false);
  }, [refreshCacheStats]);

  // Collect unique setting keys from all macroInSettings nodes
  const settingsKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const n of globalNodes) {
      if (n.type === "macroInSettings" && n.data.param) {
        keys.add(n.data.param);
      }
    }
    return [...keys].sort();
  }, [globalNodes]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sectionHeadingClass =
    "text-[10px] text-(--relax-accent) font-bold tracking-widest uppercase mb-3";
  const labelClass =
    "text-[10px] text-(--relax-text-muted) font-bold tracking-wider uppercase block mb-1.5";
  const inputClass =
    "w-full bg-(--relax-bg-primary) border border-(--relax-border) rounded px-3 py-2 text-xs text-white font-mono focus:border-(--relax-accent) focus:outline-none placeholder:text-(--relax-text-muted)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-110 bg-(--relax-bg-primary)/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-xl shadow-2xl w-full max-w-120 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--relax-border)">
          <h2 className="text-white text-sm font-bold tracking-widest">
            SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="text-(--relax-text-muted) hover:text-white transition-colors text-lg leading-none"
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
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()} autoComplete="off">
              <input
                type={showToken ? "text" : "password"}
                value={settings.hfToken}
                onChange={(e) => updateSetting("hfToken", e.target.value)}
                placeholder="hf_..."
                className={`flex-1 ${inputClass}`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="px-2 py-1 text-[9px] font-bold bg-(--relax-border) border border-(--relax-border-hover) rounded text-(--relax-text-default) hover:text-white transition-colors"
              >
                {showToken ? "HIDE" : "SHOW"}
              </button>
            </form>
            <p className="text-[9px] text-(--relax-text-muted) mt-1.5">
              Required for gated models (e.g. Llama, RMBG). Get one at
              huggingface.co/settings/tokens
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
                  className="accent-(--relax-accent)"
                />
                <span className="text-xs text-(--relax-text-default)">
                  Auto-save workflow
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.debugMode}
                  onChange={(e) => updateSetting("debugMode", e.target.checked)}
                  className="accent-(--relax-accent)"
                />
                <span className="text-xs text-(--relax-text-default)">
                  Debug mode
                </span>
              </label>
              {settings.debugMode && (
                <p className="text-[9px] text-(--relax-text-muted) -mt-1">
                  Logs node execution, data flow, rework cascades, and errors to
                  the browser console (F12).
                </p>
              )}

              {settings.autoSave && (
                <div>
                  <label className={labelClass}>Auto-save Interval (ms)</label>
                  <input
                    type="number"
                    value={settings.autoSaveDebounceMs}
                    onChange={(e) =>
                      updateSetting(
                        "autoSaveDebounceMs",
                        Math.max(
                          500,
                          Math.min(
                            30000,
                            Number(e.target.value) ||
                              DEFAULTS.autoSaveDebounceMs,
                          ),
                        ),
                      )
                    }
                    min={500}
                    max={30000}
                    step={100}
                    className={inputClass}
                  />
                  <p className="text-[9px] text-(--relax-text-muted) mt-1">
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
                      Math.max(
                        10,
                        Math.min(
                          500,
                          Number(e.target.value) || DEFAULTS.undoHistorySize,
                        ),
                      ),
                    )
                  }
                  min={10}
                  max={500}
                  step={10}
                  className={inputClass}
                />
                <p className="text-[9px] text-(--relax-text-muted) mt-1">
                  Maximum number of undo snapshots to keep (10–500)
                </p>
              </div>
            </div>
          </section>

          {/* Handle Layout */}
          <section>
            <h3 className={sectionHeadingClass}>Handle Layout</h3>
            <div className="flex gap-3">
              {(
                [
                  ["compact", "Compact"],
                  ["space-between", "Space Between"],
                  ["space-around", "Space Around"],
                ] as const
              ).map(([value, label]) => {
                const isActive = (settings.handleLayout || "compact") === value;
                return (
                  <button
                    key={value}
                    onClick={() => {
                      updateSetting("handleLayout", value as HandleLayout);
                      setShowReloadPrompt(true);
                    }}
                    className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                      isActive
                        ? "border-(--relax-accent) bg-(--relax-accent)/10"
                        : "border-(--relax-border) bg-(--relax-bg-primary) hover:border-(--relax-border-hover)"
                    }`}
                  >
                    {/* Visual preview - mini node with handles */}
                    <div className="relative w-12 h-16 border border-(--relax-border-hover) rounded bg-(--relax-bg-elevated)">
                      <div className="w-full h-2 bg-(--relax-bg-primary)/50 rounded-t border-b border-(--relax-border)" />
                      {[0, 1, 2].map((i) => {
                        const nodeH = 64;
                        const headerH = 8;
                        const usable = nodeH - headerH;
                        let top: number;
                        if (value === "compact") {
                          top = headerH + 6 + i * 10;
                        } else if (value === "space-between") {
                          const step = usable / 4;
                          top = headerH + step * (i + 1);
                        } else {
                          const step = usable / 3;
                          top = headerH + step * i + step / 2;
                        }
                        return (
                          <div key={i} className="absolute flex items-center w-full" style={{ top }}>
                            <div className="w-2 h-2 rounded-full bg-(--relax-accent) -ml-1 shadow-[0_0_4px_var(--relax-accent)]" />
                            <div className="flex-1" />
                            <div className="w-2 h-2 rounded-full bg-(--relax-accent) -mr-1 shadow-[0_0_4px_var(--relax-accent)]" />
                          </div>
                        );
                      })}
                    </div>
                    <span className={`text-[9px] font-bold tracking-wider uppercase ${
                      isActive ? "text-(--relax-accent)" : "text-(--relax-text-muted)"
                    }`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-(--relax-text-muted) mt-2">
              How edge connection handles are positioned on nodes. Compact places handles near the top; space-between and space-around distribute them across the full node height.
            </p>
          </section>

          {/* Model Cache */}
          <section>
            <h3 className={sectionHeadingClass}>Model Cache</h3>

            {/* Browser persistent cache (downloaded files) */}
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 flex items-center gap-3 bg-(--relax-bg-primary) border border-(--relax-border) rounded px-3 py-2">
                <div className="flex-1">
                  <div className="text-xs text-white font-bold">
                    {browserCache.totalEntries}{" "}
                    {browserCache.totalEntries === 1 ? "file" : "files"}
                    {browserCache.estimatedBytes > 0 && (
                      <span className="text-(--relax-text-muted) font-normal ml-1.5">
                        (
                        {browserCache.estimatedBytes >= 1_073_741_824
                          ? `${(browserCache.estimatedBytes / 1_073_741_824).toFixed(1)} GB`
                          : browserCache.estimatedBytes >= 1_048_576
                            ? `${(browserCache.estimatedBytes / 1_048_576).toFixed(0)} MB`
                            : `${(browserCache.estimatedBytes / 1024).toFixed(0)} KB`}
                        )
                      </span>
                    )}
                  </div>
                  <div className="text-[8px] text-(--relax-text-muted) uppercase tracking-wider mt-0.5">
                    Downloaded models (persistent)
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                disabled={
                  (browserCache.totalEntries === 0 && cacheStats.total === 0) ||
                  clearing
                }
                className="px-3 py-3.5 text-[9px] font-bold bg-(--relax-border) border border-(--relax-border-hover) rounded text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {clearing ? "CLEARING..." : "CLEAR ALL"}
              </button>
            </div>

            {/* In-memory loaded instances */}
            {cacheStats.total > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {(
                  [
                    ["Pipelines", cacheStats.pipelines],
                    ["Models", cacheStats.models],
                    ["Tokenizers", cacheStats.tokenizers],
                    ["Processors", cacheStats.processors],
                  ] as const
                ).map(([label, count]) => (
                  <div
                    key={label}
                    className="bg-(--relax-bg-primary) border border-(--relax-border) rounded px-2 py-1.5 text-center"
                  >
                    <div className="text-xs text-white font-bold">{count}</div>
                    <div className="text-[8px] text-(--relax-text-muted) uppercase tracking-wider">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9px] text-(--relax-text-muted) mt-1">
              Downloaded model files persist in browser storage across page
              reloads. Clear to free disk space and RAM.
            </p>
          </section>

          {/* Workflow API Keys */}
          {settingsKeys.length > 0 && (
            <section>
              <h3 className={sectionHeadingClass}>Workflow API Keys</h3>
              <div className="flex flex-col gap-3">
                {settingsKeys.map((key) => {
                  const isKeyLike =
                    key.toLowerCase().includes("key") ||
                    key.toLowerCase().includes("token") ||
                    key.toLowerCase().includes("secret");
                  const isVisible = visibleKeys.has(key);
                  return (
                    <div key={key}>
                      <label className={labelClass}>{key}</label>
                      <div className="flex gap-2">
                        <input
                          type={isKeyLike && !isVisible ? "password" : "text"}
                          value={settings.macroSettings[key] || ""}
                          onChange={(e) =>
                            updateSetting("macroSettings", {
                              ...settings.macroSettings,
                              [key]: e.target.value,
                            })
                          }
                          placeholder={`Enter ${key}`}
                          className={`flex-1 ${inputClass}`}
                          autoComplete="off"
                        />
                        {isKeyLike && (
                          <button
                            onClick={() =>
                              setVisibleKeys((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              })
                            }
                            className="px-2 py-1 text-[9px] font-bold bg-(--relax-border) border border-(--relax-border-hover) rounded text-(--relax-text-default) hover:text-white transition-colors"
                          >
                            {isVisible ? "HIDE" : "SHOW"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-(--relax-text-muted) mt-2">
                These keys are used by Macro In (Settings) nodes in your
                workflow.
              </p>
            </section>
          )}

          {/* Theme Colors */}
          <section>
            <h3 className={sectionHeadingClass}>Interface Colors</h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["bgPrimary", "Background"],
                  ["bgElevated", "Surface"],
                  ["border", "Border"],
                  ["borderHover", "Border Hover"],
                  ["accent", "Accent"],
                  ["accentGradientEnd", "Accent Gradient End"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={(settings.themeColors ?? DEFAULT_THEME)[key]}
                    onChange={(e) =>
                      updateSetting("themeColors", {
                        ...(settings.themeColors ?? DEFAULT_THEME),
                        [key]: e.target.value,
                      })
                    }
                    className="w-8 h-8 rounded border border-(--relax-border) cursor-pointer bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded"
                  />
                  <span className="text-[10px] text-(--relax-text-default) font-bold tracking-wider uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => updateSetting("themeColors", { ...DEFAULT_THEME })}
              className="mt-3 px-3 py-1.5 text-[9px] font-bold bg-(--relax-border) border border-(--relax-border-hover) rounded text-(--relax-text-default) hover:text-white transition-colors"
            >
              RESET TO DEFAULTS
            </button>
            <p className="text-[9px] text-(--relax-text-muted) mt-2">
              Customize the interface colors. Changes apply immediately.
            </p>
          </section>

          {/* Memory */}
          <section>
            <h3 className={sectionHeadingClass}>Memory</h3>

            {/* Add buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setAddingText(true)}
                className="px-3 py-1.5 text-[9px] font-bold bg-(--relax-accent)/10 border border-(--relax-accent)/30 rounded text-(--relax-accent) hover:bg-(--relax-accent)/20 transition-colors"
              >
                + TEXT
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-[9px] font-bold bg-(--relax-accent)/10 border border-(--relax-accent)/30 rounded text-(--relax-accent) hover:bg-(--relax-accent)/20 transition-colors"
              >
                + FILE
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,audio/*,video/*,*/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const mime = file.type || "";
                  let type: MemoryItem["type"] = "file";
                  if (mime.startsWith("image/")) type = "image";
                  else if (mime.startsWith("audio/")) type = "audio";
                  else if (mime.startsWith("video/")) type = "video";
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    addItem({
                      name: file.name,
                      type,
                      value: ev.target?.result as string,
                    });
                  };
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Inline text add form */}
            {addingText && (
              <div className="mb-3 p-3 bg-(--relax-bg-primary) border border-(--relax-border) rounded-lg flex flex-col gap-2">
                <input
                  type="text"
                  value={newTextName}
                  onChange={(e) => setNewTextName(e.target.value)}
                  placeholder="Name (e.g. portrait prompt)"
                  className={inputClass}
                  autoFocus
                />
                <textarea
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  placeholder="Text content..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setAddingText(false);
                      setNewTextName("");
                      setNewTextValue("");
                    }}
                    className="px-3 py-1 text-[9px] font-bold text-(--relax-text-muted) hover:text-white transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={() => {
                      if (newTextValue.trim()) {
                        addItem({
                          name: newTextName.trim() || "Untitled",
                          type: "text",
                          value: newTextValue,
                        });
                        setAddingText(false);
                        setNewTextName("");
                        setNewTextValue("");
                      }
                    }}
                    disabled={!newTextValue.trim()}
                    className="px-3 py-1 text-[9px] font-bold bg-(--relax-accent) text-(--relax-bg-primary) rounded hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            )}

            {/* Items list */}
            {memoryItems.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {memoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 bg-(--relax-bg-primary) border border-(--relax-border) rounded-lg px-3 py-2 group"
                  >
                    <span className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded bg-(--relax-border) text-(--relax-text-muted) shrink-0">
                      {item.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white font-bold truncate">
                        {item.name}
                      </div>
                      {item.type === "text" && (
                        <div className="text-[9px] text-(--relax-text-muted) truncate">
                          {item.value.slice(0, 80)}
                        </div>
                      )}
                      {item.type === "image" && (
                        <img
                          src={item.value}
                          className="h-8 rounded mt-1 object-cover"
                        />
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[9px] font-bold text-red-400/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      DEL
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-(--relax-text-muted)">
                No items saved. Add text prompts, images, audio, or video to
                reuse across workflows via the MEM button on input nodes.
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Reload prompt */}
      {showReloadPrompt && (
        <div className="fixed inset-0 z-120 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-xl shadow-2xl w-full max-w-80 p-6 flex flex-col gap-4">
            <h3 className="text-white text-sm font-bold tracking-widest">
              RELOAD REQUIRED
            </h3>
            <p className="text-xs text-(--relax-text-default) leading-relaxed">
              Handle layout has been saved. A page reload is needed to correctly reposition the edges.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReloadPrompt(false)}
                className="px-4 py-2 text-[10px] font-bold tracking-wider text-(--relax-text-muted) hover:text-white transition-colors"
              >
                LATER
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-[10px] font-bold tracking-wider bg-(--relax-accent) text-(--relax-bg-primary) rounded-lg hover:opacity-90 transition-opacity"
              >
                RELOAD NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
