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
    <div className="mt-2 min-h-[48px]">
      {state.status === "loading" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-[var(--relax-accent)] border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[9px] text-[var(--relax-accent)] font-mono font-bold tracking-wider">
              LOADING...
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--relax-border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--relax-accent)] rounded-full transition-all duration-300"
              style={{
                width: `${state.progress?.progress ?? 0}%`,
              }}
            />
          </div>
          <span className="text-[8px] text-[var(--relax-text-muted)] font-mono truncate block h-[14px]">
            {state.progress?.file
              ? `${state.progress.file} (${Math.round(state.progress.progress ?? 0)}%)`
              : "\u00A0"}
          </span>
        </div>
      ) : state.status === "ready" ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[var(--relax-success)] rounded-full shadow-[0_0_6px_var(--relax-success)] shrink-0" />
          <span className="text-[9px] text-[var(--relax-success)] font-mono font-bold tracking-wider">
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
