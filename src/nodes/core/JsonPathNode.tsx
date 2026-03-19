import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const JsonPathNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center gap-1">
        <div className="flex items-center gap-1.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-(--relax-accent) opacity-40 shrink-0"
          >
            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
            <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
          </svg>
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            PATH
          </label>
        </div>
        <input
          className="nowheel nodrag w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          value={props.data.path}
          onChange={(e) => updateNodeData(props.id, "path", e.target.value)}
          placeholder="e.g. data.items.0.url"
        />
      </div>
    </BaseNode>
  );
};
