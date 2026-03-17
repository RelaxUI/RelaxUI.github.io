import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useCallback, useContext, useEffect, useRef } from "react";

export const InputTextNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external changes (undo/redo, import) only when not focused
  useEffect(() => {
    if (textareaRef.current && textareaRef.current !== document.activeElement) {
      textareaRef.current.value = props.data.value || "";
    }
  }, [props.data.value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(props.id, "value", e.target.value);
    },
    [props.id, updateNodeData],
  );

  return (
    <BaseNode {...props}>
      <textarea
        ref={textareaRef}
        className="nowheel nodrag flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) resize-none custom-scrollbar"
        defaultValue={props.data.value || ""}
        onChange={handleChange}
      />
    </BaseNode>
  );
};
