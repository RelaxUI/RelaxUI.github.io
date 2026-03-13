import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const ListAggregatorNode = (props: any) => {
  const { displayData, updateNodeData } = useContext(RuntimeContext)!;
  const list = displayData[props.id] || [];
  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag pt-1" style={{ minHeight: 0, flex: "1 1 0" }}>
        <div className="flex items-center justify-between px-1 shrink-0">
          <span className="text-[10px] text-[#00e5ff] font-bold tracking-wider">
            COUNT: {list.length}
          </span>
          <button
            onClick={() => updateNodeData(props.id, "resetTrigger", Date.now())}
            className="text-[9px] bg-[#1f2630] text-red-400 font-bold px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors shadow-lg"
          >
            RESET
          </button>
        </div>
        <div className="bg-[#0b0e14]/60 border border-[#1f2630] rounded p-2 text-xs font-mono text-white overflow-y-auto custom-scrollbar" style={{ minHeight: 0, flex: "1 1 0" }}>
          {list.map((item: any, i: number) => (
            <div
              key={i}
              className="border-b border-[#1f2630] py-1 truncate text-[#a0aec0]"
            >
              <span className="text-[#5a6b7c] mr-2">[{i}]</span>
              {typeof item === "object" ? JSON.stringify(item) : String(item)}
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
};
