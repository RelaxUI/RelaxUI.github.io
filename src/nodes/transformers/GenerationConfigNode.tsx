import { DynamicParamEditor } from "@/components/DynamicParamEditor.tsx";
import { GENERATION_PARAMS } from "@/config/generationDefaults.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const GenerationConfigNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag overflow-hidden">
        <DynamicParamEditor
          schema={GENERATION_PARAMS}
          values={props.data}
          onChange={(key, value) => updateNodeData(props.id, key, value)}
        />
      </div>
    </BaseNode>
  );
};
