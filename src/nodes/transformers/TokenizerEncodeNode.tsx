import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const TokenizerEncodeNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            PADDING
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(props.id, "padding", !props.data.padding)
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.padding ? "bg-[#00e5ff]" : "bg-[#1f2630]"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.padding ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            TRUNCATION
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(props.id, "truncation", !props.data.truncation)
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.truncation ? "bg-[#00e5ff]" : "bg-[#1f2630]"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.truncation ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            MAX LENGTH
          </label>
          <input
            type="number"
            value={props.data.max_length || ""}
            onChange={(e) =>
              updateNodeData(props.id, "max_length", e.target.value)
            }
            placeholder="auto"
            className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          />
        </div>
      </div>
    </BaseNode>
  );
};
