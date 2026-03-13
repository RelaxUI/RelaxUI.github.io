import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const BatchIteratorNode = (props: any) => {
  const { updateNodeData, displayData } = useContext(RuntimeContext)!;
  const progress = displayData[props.id];
  const hasProg = progress && typeof progress.current === "number";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag mt-1">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            BATCH SIZE
          </label>
          <input
            type="number"
            min="1"
            value={props.data.batchSize || 1}
            onChange={(e) =>
              updateNodeData(props.id, "batchSize", parseInt(e.target.value))
            }
            className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)]"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            DELAY BETWEEN (MS)
          </label>
          <input
            type="number"
            min="0"
            value={props.data.delayMs ?? 1000}
            onChange={(e) =>
              updateNodeData(props.id, "delayMs", parseInt(e.target.value))
            }
            className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)]"
          />
        </div>
        {hasProg && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-[var(--relax-text-muted)]">PROGRESS</span>
              <span className="text-[var(--relax-accent)]">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--relax-bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--relax-accent)] rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
