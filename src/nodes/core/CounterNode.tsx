import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const CounterNode = (props: any) => {
  const { displayData, updateNodeData } = useContext(RuntimeContext)!;
  const count = displayData[props.id] ?? 0;
  const startAt = props.data.startAt ?? 0;
  const step = props.data.step ?? 1;
  const prefix = props.data.prefix ?? "";
  const suffix = props.data.suffix ?? "";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-1.5 w-full nowheel nodrag">
        <div className="flex items-center justify-center gap-2">
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {prefix}{count}{suffix}
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              START
            </label>
            <input
              type="number"
              value={startAt}
              onChange={(e) =>
                updateNodeData(props.id, "startAt", parseInt(e.target.value) || 0)
              }
              className="w-full text-center bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              STEP
            </label>
            <input
              type="number"
              value={step}
              onChange={(e) =>
                updateNodeData(props.id, "step", parseInt(e.target.value) || 1)
              }
              className="w-full text-center bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
            />
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              PREFIX
            </label>
            <input
              value={prefix}
              onChange={(e) =>
                updateNodeData(props.id, "prefix", e.target.value)
              }
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
              placeholder="e.g. img_"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[8px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              SUFFIX
            </label>
            <input
              value={suffix}
              onChange={(e) =>
                updateNodeData(props.id, "suffix", e.target.value)
              }
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
              placeholder="e.g. .png"
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
};
