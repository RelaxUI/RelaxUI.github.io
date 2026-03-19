import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const DelayNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-1 w-full h-full justify-center nowheel nodrag">
        <div className="flex items-center gap-1.5 justify-center">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            WAIT (MS)
          </label>
        </div>
        <input
          type="number"
          min="0"
          value={props.data.delayMs ?? 1000}
          onChange={(e) =>
            updateNodeData(props.id, "delayMs", parseInt(e.target.value))
          }
          className="w-full text-center bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-(--relax-accent)"
        />
      </div>
    </BaseNode>
  );
};
