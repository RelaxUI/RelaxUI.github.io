import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const TokenizerDecodeNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag">
        <div className="flex items-center justify-between">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            SKIP SPECIAL TOKENS
          </label>
          <button
            type="button"
            onClick={() =>
              updateNodeData(
                props.id,
                "skip_special_tokens",
                !(props.data.skip_special_tokens !== false),
              )
            }
            className={`relative w-8 h-4 rounded-full transition-colors ${props.data.skip_special_tokens !== false ? "bg-(--relax-accent)" : "bg-(--relax-border)"}`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${props.data.skip_special_tokens !== false ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>
      </div>
    </BaseNode>
  );
};
