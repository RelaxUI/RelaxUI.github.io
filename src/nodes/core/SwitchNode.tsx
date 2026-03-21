import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const SwitchNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const mode = props.data.mode || "value";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-1.5 w-full nowheel nodrag">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            MODE
          </label>
          <select
            value={mode}
            onChange={(e) =>
              updateNodeData(props.id, "mode", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) appearance-none"
          >
            <option value="value">Match Value</option>
            <option value="truthy">Truthy / Falsy</option>
            <option value="contains">Contains</option>
            <option value="regex">Regex</option>
          </select>
        </div>
        {(mode === "value" || mode === "contains" || mode === "regex") && (
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              PATTERN
            </label>
            <input
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
              value={props.data.pattern ?? ""}
              onChange={(e) =>
                updateNodeData(props.id, "pattern", e.target.value)
              }
              placeholder={mode === "regex" ? "e.g. ^success" : "e.g. ok"}
            />
          </div>
        )}
        <div className="text-[8px] text-(--relax-text-muted) font-mono opacity-60">
          Routes data to TRUE or FALSE output
        </div>
      </div>
    </BaseNode>
  );
};
