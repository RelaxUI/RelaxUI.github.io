import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useContext, useEffect } from "react";

export const MacroNode = (props: any) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const { updateNodeData, globalNodes } = useContext(RuntimeContext)!;
  const paramNodes = globalNodes.filter(
    (n) => n.macroId === props.id && n.type === "macroInParam",
  );

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [paramNodes.length, props.id, updateNodeInternals]);

  return (
    <BaseNode {...props}>
      <form className="nowheel nodrag flex flex-col w-full h-full p-2 gap-3 overflow-y-auto custom-scrollbar" onSubmit={(e) => e.preventDefault()}>
        {paramNodes.map((pNode) => (
          <div key={pNode.id} className="flex flex-col gap-1">
            <label className="text-[10px] text-[var(--relax-text-muted)] uppercase font-bold tracking-widest">
              {pNode.data.param}
            </label>
            <input
              className="nowheel nodrag w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)]"
              value={props.data[pNode.data.param] || ""}
              onChange={(e) =>
                updateNodeData(props.id, pNode.data.param, e.target.value)
              }
              type={
                pNode.data.param.toLowerCase().includes("key")
                  ? "password"
                  : "text"
              }
              placeholder="Enter value"
              autoComplete="off"
            />
          </div>
        ))}
        {paramNodes.length === 0 && (
          <div className="m-auto flex flex-col items-center opacity-60 text-[#e5e7eb] pointer-events-none">
            <span className="text-xs font-mono">DOUBLE CLICK</span>
            <span className="text-[10px] font-mono">TO ENTER</span>
          </div>
        )}
      </form>
    </BaseNode>
  );
};
