import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

const OPS = [
  "split", "join", "replace", "uppercase", "lowercase",
  "trim", "slice", "regex_extract", "length",
] as const;

const OP_LABELS: Record<string, string> = {
  split: "Split",
  join: "Join",
  replace: "Replace",
  uppercase: "To Uppercase",
  lowercase: "To Lowercase",
  trim: "Trim",
  slice: "Slice",
  regex_extract: "Regex Extract",
  length: "Length",
};

export const StringOpsNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const op = props.data.operation || "split";
  const needsParam = ["split", "join", "replace", "slice", "regex_extract"].includes(op);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-1.5 w-full nowheel nodrag">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            OPERATION
          </label>
          <select
            value={op}
            onChange={(e) =>
              updateNodeData(props.id, "operation", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) appearance-none"
          >
            {OPS.map((o) => (
              <option key={o} value={o}>
                {OP_LABELS[o]}
              </option>
            ))}
          </select>
        </div>
        {needsParam && (
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              {op === "slice" ? "RANGE (start,end)" : op === "replace" ? "FIND,REPLACE" : "SEPARATOR / PATTERN"}
            </label>
            <input
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
              value={props.data.param ?? ""}
              onChange={(e) =>
                updateNodeData(props.id, "param", e.target.value)
              }
              placeholder={op === "split" ? "e.g. ," : op === "replace" ? "e.g. old,new" : ""}
            />
          </div>
        )}
      </div>
    </BaseNode>
  );
};
