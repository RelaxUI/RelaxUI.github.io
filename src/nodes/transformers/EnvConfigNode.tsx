import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const EnvConfigNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag overflow-hidden">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            REMOTE MODELS
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(
                props.id,
                "allowRemoteModels",
                !(props.data.allowRemoteModels !== false),
              )
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.allowRemoteModels !== false ? "bg-(--relax-accent)" : "bg-(--relax-border)"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.allowRemoteModels !== false ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            BROWSER CACHE
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(
                props.id,
                "useBrowserCache",
                !(props.data.useBrowserCache !== false),
              )
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.useBrowserCache !== false ? "bg-(--relax-accent)" : "bg-(--relax-border)"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.useBrowserCache !== false ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            CACHE KEY
          </label>
          <input
            type="text"
            value={props.data.cacheKey || ""}
            onChange={(e) =>
              updateNodeData(props.id, "cacheKey", e.target.value)
            }
            placeholder="transformers-cache"
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            LOG LEVEL
          </label>
          <select
            value={props.data.logLevel || "40"}
            onChange={(e) =>
              updateNodeData(props.id, "logLevel", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          >
            <option value="10">DEBUG (10)</option>
            <option value="20">INFO (20)</option>
            <option value="30">WARNING (30)</option>
            <option value="40">ERROR (40)</option>
            <option value="50">NONE (50)</option>
          </select>
        </div>
      </div>
    </BaseNode>
  );
};
