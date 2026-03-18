import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

function toText(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  // Unwrap pipeline envelope
  const inner = val?.data ?? val;
  if (typeof inner === "string") return inner;
  try {
    return JSON.stringify(inner, null, 2);
  } catch {
    return String(inner);
  }
}

export const OutputTextNode = (props: any) => {
  const { displayData } = useContext(RuntimeContext)!;
  const raw = displayData[props.id];
  const text = toText(raw);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current && textareaRef.current !== document.activeElement) {
      textareaRef.current.value = text;
    }
  }, [text]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <BaseNode {...props}>
      <div className="relative flex-1 w-full min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          readOnly
          defaultValue={text}
          className="nowheel nodrag flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) resize-none custom-scrollbar"
          placeholder="Waiting for data..."
        />
        {raw != null && (
          <button
            onClick={handleCopy}
            className="absolute bottom-1 right-1 text-[9px] font-bold text-(--relax-text-muted) hover:text-(--relax-accent) bg-(--relax-bg-primary)/80 border border-(--relax-border) rounded px-1.5 py-0.5 z-10 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? "COPIED" : "COPY"}
          </button>
        )}
      </div>
    </BaseNode>
  );
};
