import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const CommentNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full nowheel nodrag">
        <textarea
          className="w-full flex-1 bg-transparent border-0 text-xs text-(--relax-text-default) focus:outline-none resize-none custom-scrollbar leading-relaxed"
          value={props.data.comment ?? ""}
          onChange={(e) =>
            updateNodeData(props.id, "comment", e.target.value)
          }
          placeholder="Add notes about your workflow..."
        />
      </div>
    </BaseNode>
  );
};
