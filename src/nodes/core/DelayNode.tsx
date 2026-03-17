// FILE: nodes/core/DelayNode.tsx
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const DelayNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-0.5 w-full h-full justify-center nowheel nodrag">
        <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase text-center">
          DELAY OUTPUT BY (MS)
        </label>
        <input
          type="number"
          min="0"
          value={props.data.delayMs ?? 1000}
          onChange={(e) =>
            updateNodeData(props.id, "delayMs", parseInt(e.target.value))
          }
          className="w-full text-center bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-(--relax-accent)"
        />
      </div>
    </BaseNode>
  );
};
