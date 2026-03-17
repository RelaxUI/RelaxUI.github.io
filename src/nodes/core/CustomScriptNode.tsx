import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useContext, useEffect } from "react";

export const CustomScriptNode = (props: any) => {
  const { updateNodeData, removeEdgeByHandle } = useContext(RuntimeContext)!;
  const updateNodeInternals = useUpdateNodeInternals();
  const inputsList: string[] = props.data.inputs || [
    "in1",
    "in2",
    "in3",
    "in4",
  ];

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [inputsList.length, props.id, updateNodeInternals]);

  const handleAddInput = () =>
    updateNodeData(props.id, "inputs", [
      ...inputsList,
      "in" + (inputsList.length + 1),
    ]);
  const handleRemoveInput = () => {
    if (inputsList.length > 0) {
      removeEdgeByHandle(props.id, inputsList[inputsList.length - 1]!);
      updateNodeData(props.id, "inputs", inputsList.slice(0, -1));
    }
  };

  return (
    <BaseNode {...props}>
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-[10px] text-(--relax-text-muted) font-bold tracking-widest">
          PORTS ({inputsList.length})
        </span>
        <div className="flex gap-1">
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
        className="nowheel nodrag w-full flex-1 bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) resize-none custom-scrollbar"
        value={props.data.script}
        onChange={(e) => updateNodeData(props.id, "script", e.target.value)}
      />
    </BaseNode>
  );
};
