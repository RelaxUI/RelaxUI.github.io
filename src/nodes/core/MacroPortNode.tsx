import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const MacroPortNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const isOutput = props.type === "macroOutput";
  const isParam = props.type === "macroInParam";
  const isSettings = props.type === "macroInSettings";

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
          ) : isSettings ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-400 opacity-50 shrink-0"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
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
            {isOutput ? "OUTPUT" : isSettings ? "SETTINGS" : isParam ? "PARAM" : "EDGE"} NAME
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
