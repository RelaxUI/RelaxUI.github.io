import { ModelLoadingIndicator } from "@/components/ModelLoadingIndicator.tsx";
import { ModelSizeBadge } from "@/components/ModelSizeBadge.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { ModelRegistry } from "@/utils/modelRegistry.ts";
import { useContext, useEffect, useState } from "react";

export const CompanionLoaderNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const [modelSize, setModelSize] = useState<number | null>(null);

  useEffect(() => {
    if (props.data.model_id) {
      ModelRegistry.get_model_size(props.data.model_id).then(setModelSize);
    } else {
      setModelSize(null);
    }
  }, [props.data.model_id]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            MODEL ID
          </label>
          <input
            type="text"
            value={props.data.model_id || ""}
            onChange={(e) =>
              updateNodeData(props.id, "model_id", e.target.value)
            }
            placeholder="org/model-name"
            className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)]"
          />
        </div>
        <ModelSizeBadge sizeBytes={modelSize} />
        <ModelLoadingIndicator nodeId={props.id} />
      </div>
    </BaseNode>
  );
};
