import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const MacroPortNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center">
        <label className="text-[10px] text-[#5a6b7c] mb-1">PORT NAME</label>
        <input
          className="nowheel nodrag w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          value={props.data.param}
          onChange={(e) => updateNodeData(props.id, "param", e.target.value)}
        />
      </div>
    </BaseNode>
  );
};
