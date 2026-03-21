import {
  REGISTRY_CATEGORIES,
  type RegistryWorkflow,
} from "@/config/workflowRegistry.ts";
import { ModelRegistry } from "@/utils/modelRegistry.ts";
import { useCallback, useEffect, useRef, useState } from "react";

const SAVED_WORKFLOWS_KEY = "relaxui_saved_workflows_v1";

interface ImportDialogProps {
  onImport: (flow: { nodes: any[]; edges: any[]; viewport?: any }) => void;
  onClose: () => void;
  onDeleteSavedWorkflow?: (id: string) => void;
}

export function ImportDialog({ onImport, onClose, onDeleteSavedWorkflow }: ImportDialogProps) {
  const [tab, setTab] = useState<"file" | "url" | "registry">("registry");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelSizes, setModelSizes] = useState<Record<string, number | null>>(
    {},
  );
  const [savedWorkflows, setSavedWorkflows] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_WORKFLOWS_KEY) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (tab !== "registry") return;
    const localWorkflows = Object.entries(REGISTRY_CATEGORIES)
      .filter(([cat]) => cat !== "API Workflows" && cat !== "Workflows")
      .flatMap(([, wfs]) => wfs);
    const modelsToFetch = [
      ...new Set(localWorkflows.map((wf) => wf.defaultModel)),
    ];
    modelsToFetch.forEach(async (modelId) => {
      if (modelSizes[modelId] !== undefined) return;
      const size = await ModelRegistry.get_model_size(modelId);
      setModelSizes((prev) => ({ ...prev, [modelId]: size }));
    });
  }, [tab]);

  const handleFileImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const flow = JSON.parse((e.target as FileReader).result as string);
          if (flow?.nodes) {
            onImport(flow);
          } else {
            setError("Invalid workflow file: missing nodes");
          }
        } catch {
          setError("Failed to parse JSON file");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    },
    [onImport],
  );

  const handleUrlImport = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const flow = await res.json();
      if (flow?.nodes) {
        onImport(flow);
      } else {
        setError("Invalid workflow: missing nodes");
      }
    } catch (err: any) {
      setError(`Failed to fetch: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [url, onImport]);

  const handleRegistrySelect = useCallback(
    (wf: RegistryWorkflow) => {
      const flow = wf.create();
      onImport(flow);
    },
    [onImport],
  );

  const tabCls = (t: string) =>
    `px-4 py-2 text-[10px] font-bold tracking-wider transition-all ${
      tab === t
        ? "text-(--relax-accent) border-b-2 border-(--relax-accent) bg-(--relax-border)/50"
        : "text-(--relax-text-muted) hover:text-white"
    }`;

  const handleDeleteSaved = useCallback((id: string) => {
    if (onDeleteSavedWorkflow) onDeleteSavedWorkflow(id);
    setSavedWorkflows((prev) => prev.filter((w) => w.id !== id));
  }, [onDeleteSavedWorkflow]);

  const filteredCategories = (() => {
    const registry: Record<string, RegistryWorkflow[]> = search.trim()
      ? Object.fromEntries(
          Object.entries(REGISTRY_CATEGORIES)
            .map(([cat, wfs]) => [
              cat,
              wfs.filter(
                (wf) =>
                  wf.name.toLowerCase().includes(search.toLowerCase()) ||
                  wf.description.toLowerCase().includes(search.toLowerCase()) ||
                  wf.tags.some((t) =>
                    t.toLowerCase().includes(search.toLowerCase()),
                  ),
              ),
            ])
            .filter(([, wfs]) => (wfs as RegistryWorkflow[]).length > 0),
        )
      : { ...REGISTRY_CATEGORIES };

    // Build result with Saved Workflows first
    const result: Record<string, RegistryWorkflow[]> = {};

    if (savedWorkflows.length > 0) {
      const savedAsRegistry: RegistryWorkflow[] = savedWorkflows
        .filter((sw) => {
          if (!search.trim()) return true;
          const s = search.toLowerCase();
          return sw.name.toLowerCase().includes(s) || (sw.description || "").toLowerCase().includes(s);
        })
        .map((sw) => ({
          id: sw.id,
          name: sw.name,
          description: sw.description || "",
          category: "Saved Workflows",
          tags: sw.tags || ["saved"],
          defaultModel: "",
          create: () => sw.flow,
        }));
      if (savedAsRegistry.length > 0) {
        result["Saved Workflows"] = savedAsRegistry;
      }
    }

    // Append all registry categories after
    for (const [cat, wfs] of Object.entries(registry)) {
      result[cat] = wfs;
    }

    return result;
  })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-(--relax-bg-primary) border border-(--relax-border) rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--relax-border)">
          <h2 className="text-white font-bold text-sm tracking-widest font-mono">
            IMPORT WORKFLOW
          </h2>
          <button
            onClick={onClose}
            className="text-(--relax-text-muted) hover:text-white text-lg transition-colors leading-none"
          >
            x
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-(--relax-border)">
          <button className={tabCls("file")} onClick={() => setTab("file")}>
            LOCAL FILE
          </button>
          <button className={tabCls("url")} onClick={() => setTab("url")}>
            URL
          </button>
          <button
            className={tabCls("registry")}
            onClick={() => setTab("registry")}
          >
            REGISTRY
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-900/30 border border-red-700/50 rounded text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* ─── Local File Tab ─── */}
          {tab === "file" && (
            <div className="flex flex-col gap-4">
              <p className="text-(--relax-text-muted) text-xs">
                Select a JSON workflow file from your computer.
              </p>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileImport}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-(--relax-border) border border-(--relax-border-hover) text-(--relax-text-default) hover:text-(--relax-accent) hover:border-(--relax-accent) rounded-lg transition-all text-xs font-bold tracking-wider"
              >
                CHOOSE FILE
              </button>
            </div>
          )}

          {/* ─── URL Tab ─── */}
          {tab === "url" && (
            <div className="flex flex-col gap-4">
              <p className="text-(--relax-text-muted) text-xs">
                Enter the URL of a JSON workflow file.
              </p>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/workflow.json"
                className="w-full px-4 py-3 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg text-white text-xs font-mono focus:border-(--relax-accent) focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleUrlImport()}
              />
              <button
                onClick={handleUrlImport}
                disabled={loading || !url.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-(--relax-border) border border-(--relax-border-hover) text-(--relax-text-default) hover:text-(--relax-accent) hover:border-(--relax-accent) rounded-lg transition-all text-xs font-bold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "LOADING..." : "IMPORT FROM URL"}
              </button>
            </div>
          )}

          {/* ─── Registry Tab ─── */}
          {tab === "registry" && (
            <div className="flex flex-col gap-4">
              <p className="text-(--relax-text-muted) text-xs">
                Select a ready-made workflow from the RelaxUI Registry. Each
                workflow is pre-configured with sample data and default models —
                just load and run.
              </p>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows..."
                className="w-full px-4 py-2 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg text-white text-xs font-mono focus:border-(--relax-accent) focus:outline-none transition-colors"
              />

              {Object.entries(filteredCategories).map(
                ([category, workflows]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <span className="text-(--relax-accent) font-bold text-[10px] tracking-widest uppercase font-mono">
                        {category}
                      </span>
                      <div className="flex-1 h-px bg-(--relax-border)" />
                      <span className="text-(--relax-border-active) text-[10px] font-mono">
                        {(workflows as RegistryWorkflow[]).length}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {(workflows as RegistryWorkflow[]).map((wf) => (
                        <div
                          key={wf.id}
                          className="group flex items-start gap-3 p-3 bg-(--relax-bg-elevated) border border-(--relax-border) rounded-lg hover:border-(--relax-accent)/50 hover:bg-(--relax-border)/30 transition-all text-left"
                        >
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleRegistrySelect(wf)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-white font-bold text-xs group-hover:text-(--relax-accent) transition-colors">
                                {wf.name}
                              </span>
                              <span className="text-(--relax-border-active) text-[9px] font-mono truncate max-w-45">
                                {wf.defaultModel}
                              </span>
                              {modelSizes[wf.defaultModel] != null && (
                                <span
                                  className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                    modelSizes[wf.defaultModel]! / 1024 / 1024 <
                                    100
                                      ? "text-(--relax-success) bg-(--relax-success)/10"
                                      : modelSizes[wf.defaultModel]! /
                                            1024 /
                                            1024 <
                                          500
                                        ? "text-[#ffd93d] bg-[#ffd93d]/10"
                                        : "text-[#ff6b6b] bg-[#ff6b6b]/10"
                                  }`}
                                >
                                  {modelSizes[wf.defaultModel]! / 1024 / 1024 >=
                                  1024
                                    ? `${(modelSizes[wf.defaultModel]! / 1024 / 1024 / 1024).toFixed(1)}GB`
                                    : `${(modelSizes[wf.defaultModel]! / 1024 / 1024).toFixed(0)}MB`}
                                </span>
                              )}
                            </div>
                            <p className="text-(--relax-text-muted) text-[10px] mt-1 leading-relaxed">
                              {wf.description}
                            </p>
                            <div className="flex gap-1.5 mt-2">
                              {wf.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 bg-(--relax-border) text-(--relax-text-muted) text-[9px] rounded font-mono"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <button
                              onClick={() => handleRegistrySelect(wf)}
                              className="text-(--relax-border-hover) group-hover:text-(--relax-accent) transition-colors text-sm mt-1 font-mono cursor-pointer"
                            >
                              LOAD
                            </button>
                            {category === "Saved Workflows" && (
                              <button
                                onClick={() => handleDeleteSaved(wf.id)}
                                className="text-(--relax-error) hover:text-red-300 text-[9px] font-bold tracking-wider transition-colors cursor-pointer"
                              >
                                DELETE
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}

              {Object.keys(filteredCategories).length === 0 && (
                <div className="text-center py-8 text-(--relax-border-active) text-xs font-mono">
                  No workflows match your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
