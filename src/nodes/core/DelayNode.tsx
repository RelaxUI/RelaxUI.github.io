// FILE: nodes/core/DelayNode.tsx
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const DelayNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-0.5 w-full h-full justify-center nowheel nodrag">
        <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase text-center">
          DELAY OUTPUT BY (MS)
        </label>
        <input
          type="number"
          min="0"
          value={props.data.delayMs ?? 1000}
          onChange={(e) =>
            updateNodeData(props.id, "delayMs", parseInt(e.target.value))
          }
          className="w-full text-center bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-[#00e5ff]"
        />
      </div>
    </BaseNode>
  );
};
