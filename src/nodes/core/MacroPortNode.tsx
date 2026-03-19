import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const MacroPortNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const isOutput = props.type === "macroOutput";
  const isParam = props.type === "macroInParam";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col w-full h-full justify-center gap-1">
        <div className="flex items-center gap-1.5">
          {isOutput ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-400 opacity-50 shrink-0"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${isParam ? "text-purple-400" : "text-(--relax-accent)"} opacity-50 shrink-0`}
            >
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </svg>
          )}
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            {isOutput ? "OUTPUT" : isParam ? "PARAM" : "EDGE"} NAME
          </label>
        </div>
        <input
          className="nowheel nodrag w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          value={props.data.param}
          onChange={(e) => updateNodeData(props.id, "param", e.target.value)}
          placeholder="port name"
        />
      </div>
    </BaseNode>
  );
};
