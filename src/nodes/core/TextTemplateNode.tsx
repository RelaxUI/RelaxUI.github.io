import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useContext, useEffect } from "react";

export const TextTemplateNode = (props: any) => {
  const { updateNodeData, removeEdgeByHandle } = useContext(RuntimeContext)!;
  const updateNodeInternals = useUpdateNodeInternals();
  const inputsList: string[] = props.data.inputs || ["var1", "var2"];

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [inputsList.length, props.id, updateNodeInternals]);

  const handleAddInput = () =>
    updateNodeData(props.id, "inputs", [
      ...inputsList,
      "var" + (inputsList.length + 1),
    ]);

  const handleRemoveInput = () => {
    if (inputsList.length > 1) {
      removeEdgeByHandle(props.id, inputsList[inputsList.length - 1]!);
      updateNodeData(props.id, "inputs", inputsList.slice(0, -1));
    }
  };

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-1.5 w-full nowheel nodrag">
        <div className="flex justify-between items-center">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            TEMPLATE
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest">
              PORTS ({inputsList.length})
            </span>
            <button
              onClick={handleAddInput}
              className="w-5 h-5 flex items-center justify-center bg-(--relax-border) rounded text-(--relax-accent) hover:bg-(--relax-accent) hover:text-(--relax-bg-primary) transition-colors text-[10px] font-bold"
            >
              +
            </button>
            <button
              onClick={handleRemoveInput}
              className="w-5 h-5 flex items-center justify-center bg-(--relax-border) rounded text-red-500 hover:bg-red-500 hover:text-white transition-colors text-[10px] font-bold"
            >
              -
            </button>
          </div>
        </div>
        <textarea
          className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) resize-none custom-scrollbar"
          rows={4}
          value={props.data.template ?? "Hello {{var1}}, welcome to {{var2}}!"}
          onChange={(e) =>
            updateNodeData(props.id, "template", e.target.value)
          }
          placeholder="Use {{varName}} for variables"
        />
        <div className="text-[8px] text-(--relax-text-muted) font-mono opacity-60">
          {"Variables: " + inputsList.map((v: string) => `{{${v}}}`).join(", ")}
        </div>
      </div>
    </BaseNode>
  );
};
