import { DynamicParamEditor } from "@/components/DynamicParamEditor.tsx";
import { GENERATION_PARAMS } from "@/config/generationDefaults.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const GenerateNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag overflow-hidden">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            STREAMING
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(props.id, "useStreamer", !props.data.useStreamer)
            }
            className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${props.data.useStreamer ? "bg-[#00e5ff]" : "bg-[#1f2630]"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.useStreamer ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <DynamicParamEditor
          schema={GENERATION_PARAMS}
          values={props.data}
          onChange={(key, value) => updateNodeData(props.id, key, value)}
        />
      </div>
    </BaseNode>
  );
};
