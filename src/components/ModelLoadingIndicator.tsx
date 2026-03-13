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
            <div className="w-3 h-3 border-2 border-[#00e5ff] border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-[9px] text-[#00e5ff] font-mono font-bold tracking-wider">
              LOADING...
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1f2630] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00e5ff] rounded-full transition-all duration-300"
              style={{
                width: `${state.progress?.progress ?? 0}%`,
              }}
            />
          </div>
          <span className="text-[8px] text-[#5a6b7c] font-mono truncate block h-[14px]">
            {state.progress?.file
              ? `${state.progress.file} (${Math.round(state.progress.progress ?? 0)}%)`
              : "\u00A0"}
          </span>
        </div>
      ) : state.status === "ready" ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-[#00ffaa] rounded-full shadow-[0_0_6px_#00ffaa] shrink-0" />
          <span className="text-[9px] text-[#00ffaa] font-mono font-bold tracking-wider">
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
