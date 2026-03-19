import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

const FORMATS = ["auto", "dataURI", "blob", "url", "text", "json"] as const;
type Format = (typeof FORMATS)[number];

const FORMAT_LABELS: Record<Format, string> = {
  auto: "Auto-detect",
  dataURI: "Data URI (base64)",
  blob: "Blob URL",
  url: "HTTPS URL",
  text: "Plain Text",
  json: "JSON String",
};

export const ConverterNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const outputFormat: Format = props.data.outputFormat || "dataURI";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag mt-1">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            OUTPUT FORMAT
          </label>
          <select
            value={outputFormat}
            onChange={(e) =>
              updateNodeData(props.id, "outputFormat", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent) appearance-none"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[8px] text-(--relax-text-muted) font-mono leading-relaxed opacity-60">
          Converts between blob URLs, data URIs, HTTPS URLs, text, and JSON.
        </div>
      </div>
    </BaseNode>
  );
};
