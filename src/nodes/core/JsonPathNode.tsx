import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const JsonPathNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center">
        <label className="text-[10px] text-[var(--relax-text-muted)] mb-1">SELECTOR PATH</label>
        <input
          className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)]"
          value={props.data.path}
          onChange={(e) => updateNodeData(props.id, "path", e.target.value)}
        />
      </div>
    </BaseNode>
  );
};
