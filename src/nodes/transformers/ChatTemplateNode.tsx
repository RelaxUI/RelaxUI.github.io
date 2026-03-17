import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const ChatTemplateNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            ADD GEN PROMPT
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(
                props.id,
                "add_generation_prompt",
                !(props.data.add_generation_prompt !== false),
              )
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.add_generation_prompt !== false ? "bg-[var(--relax-accent)]" : "bg-[var(--relax-border)]"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.add_generation_prompt !== false ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            TOKENIZE
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(props.id, "tokenize", !props.data.tokenize)
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.tokenize ? "bg-[var(--relax-accent)]" : "bg-[var(--relax-border)]"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.tokenize ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>
    </BaseNode>
  );
};
