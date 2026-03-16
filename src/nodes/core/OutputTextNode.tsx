import { VisualizationRenderer } from "@/components/visualizations/VisualizationRenderer.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useCallback, useContext, useState } from "react";

function sanitizeForCopy(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  const data = val?.data ?? val;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export const OutputTextNode = (props: any) => {
  const { displayData } = useContext(RuntimeContext)!;
  const raw = displayData[props.id];
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = sanitizeForCopy(raw);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [raw]);

  return (
    <BaseNode {...props}>
      <div className="relative nowheel nodrag flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white overflow-y-auto whitespace-pre-wrap custom-scrollbar">
        {raw != null && (
          <button
            onClick={handleCopy}
            className="absolute bottom-1 right-1 text-[9px] font-bold text-(--relax-text-muted) hover:text-(--relax-accent) bg-(--relax-bg-primary)/80 border border-(--relax-border) rounded px-1.5 py-0.5 z-10 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? "COPIED" : "COPY"}
          </button>
        )}
        {raw != null ? (
          <VisualizationRenderer data={raw} />
        ) : (
          <span className="opacity-30">Waiting for data...</span>
        )}
      </div>
    </BaseNode>
  );
};
