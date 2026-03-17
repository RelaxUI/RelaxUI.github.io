import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { useContext } from "react";

interface ModelLoadingIndicatorProps {
  nodeId: string;
}

export const ModelLoadingIndicator = ({
  nodeId,
}: ModelLoadingIndicatorProps) => {
  const { modelLoadingState } = useContext(RuntimeContext)!;
  const state = modelLoadingState[nodeId];

  if (!state) return null;

  return (
    <div className="mt-2 min-h-12">
      {state.status === "loading" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-(--relax-accent) border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[9px] text-(--relax-accent) font-mono font-bold tracking-wider">
              LOADING...
            </span>
          </div>
          <div className="w-full h-1.5 bg-(--relax-border) rounded-full overflow-hidden">
            <div
              className="h-full bg-(--relax-accent) rounded-full transition-all duration-300"
              style={{
                width: `${state.progress?.progress ?? 0}%`,
              }}
            />
          </div>
          <span className="text-[8px] text-(--relax-text-muted) font-mono truncate block h-3.5">
            {state.progress?.file
              ? `${state.progress.file} (${Math.round(state.progress.progress ?? 0)}%)`
              : "\u00A0"}
          </span>
        </div>
      ) : state.status === "ready" ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-(--relax-success) rounded-full shadow-[0_0_6px_var(--relax-success)] shrink-0" />
          <span className="text-[9px] text-(--relax-success) font-mono font-bold tracking-wider">
            READY
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full shrink-0" />
          <span className="text-[9px] text-red-400 font-mono truncate">
            {state.error || "Failed to load"}
          </span>
        </div>
      )}
    </div>
  );
};
