import { DEFAULTS } from "@/config/defaults.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useState } from "react";

export const BatchIteratorNode = (props: any) => {
  const { updateNodeData, displayData, computingNodes, pauseNode, resumeNode, stopNode, resolveApproval } = useContext(RuntimeContext)!;
  const progress = displayData[props.id];
  const hasProg = progress && typeof progress.current === "number";
  const isRunning = computingNodes.has(props.id);
  const [paused, setPaused] = useState(false);

  const waitingForStep = progress?.waitingForStep === true;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag mt-1">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            BATCH SIZE
          </label>
          <input
            type="number"
            min="1"
            value={props.data.batchSize || 1}
            onChange={(e) =>
              updateNodeData(props.id, "batchSize", parseInt(e.target.value))
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            DELAY BETWEEN (MS)
          </label>
          <input
            type="number"
            min="0"
            value={props.data.delayMs ?? DEFAULTS.batchDelayMs}
            onChange={(e) =>
              updateNodeData(props.id, "delayMs", parseInt(e.target.value))
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            MANUAL STEP
          </label>
          <button
            onClick={() => updateNodeData(props.id, "manualStep", !props.data.manualStep)}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              props.data.manualStep
                ? "bg-(--relax-accent)"
                : "bg-(--relax-border)"
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${
                props.data.manualStep ? "left-4.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        {hasProg && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-(--relax-text-muted)">PROGRESS</span>
              <span className="text-(--relax-accent)">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-(--relax-bg-primary) rounded-full overflow-hidden">
              <div
                className="h-full bg-(--relax-accent) rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
        {waitingForStep && (
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => resolveApproval(props.id, { action: "next" })}
              className="flex-1 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase border bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer"
            >
              NEXT
            </button>
            <button
              onClick={() => resolveApproval(props.id, { action: "rework" })}
              className="flex-1 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase border bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 transition-colors cursor-pointer"
            >
              REWORK
            </button>
          </div>
        )}
        {isRunning && !waitingForStep && (
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => {
                if (paused) {
                  resumeNode(props.id);
                  setPaused(false);
                } else {
                  pauseNode(props.id);
                  setPaused(true);
                }
              }}
              className={`flex-1 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase border transition-colors cursor-pointer ${
                paused
                  ? "bg-(--relax-accent)/20 border-(--relax-accent) text-(--relax-accent) hover:bg-(--relax-accent)/30"
                  : "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30"
              }`}
            >
              {paused ? "RESUME" : "PAUSE"}
            </button>
            <button
              onClick={() => {
                stopNode(props.id);
                setPaused(false);
              }}
              className="flex-1 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase border bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
            >
              STOP
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
