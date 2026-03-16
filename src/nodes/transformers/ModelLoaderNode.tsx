import { ModelLoadingIndicator } from "@/components/ModelLoadingIndicator.tsx";
import { ModelSizeBadge } from "@/components/ModelSizeBadge.tsx";
import { getDefaultDevice } from "@/config/defaults.ts";
import { DEVICE_OPTIONS } from "@/config/generationDefaults.ts";
import {
  MODEL_CLASSES,
  MODEL_CLASS_CATEGORIES,
} from "@/config/modelClassRegistry.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { ModelRegistry } from "@/utils/modelRegistry.ts";
import { useContext, useEffect, useState } from "react";

export const ModelLoaderNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const [customDtype, setCustomDtype] = useState(false);
  const [modelSize, setModelSize] = useState<number | null>(null);
  const [availableDtypes, setAvailableDtypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchInfo = async () => {
      const [size, dtypes] = await Promise.all([
        ModelRegistry.get_model_size(props.data.model_id, props.data.dtype),
        ModelRegistry.get_available_dtypes(props.data.model_id),
      ]);
      setModelSize(size);
      setAvailableDtypes(dtypes);
    };
    if (props.data.model_id) fetchInfo();
    else {
      setModelSize(null);
      setAvailableDtypes([]);
    }
  }, [props.data.model_id, props.data.dtype]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag overflow-hidden">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            MODEL CLASS
          </label>
          <select
            value={props.data.modelClass || "AutoModel"}
            onChange={(e) =>
              updateNodeData(props.id, "modelClass", e.target.value)
            }
            className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          >
            {Object.entries(MODEL_CLASS_CATEGORIES).map(([cat, classes]) => (
              <optgroup key={cat} label={cat}>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {MODEL_CLASSES[c]?.label ?? c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            MODEL ID
          </label>
          <input
            type="text"
            value={props.data.model_id || ""}
            onChange={(e) =>
              updateNodeData(props.id, "model_id", e.target.value)
            }
            placeholder="org/model-name"
            className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
              DEVICE
            </label>
            <select
              value={props.data.device || getDefaultDevice()}
              onChange={(e) =>
                updateNodeData(props.id, "device", e.target.value)
              }
              className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
            >
              {DEVICE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
              DTYPE
            </label>
            {customDtype ? (
              <textarea
                value={
                  typeof props.data.dtype === "string"
                    ? props.data.dtype
                    : JSON.stringify(props.data.dtype || {}, null, 2)
                }
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateNodeData(props.id, "dtype", parsed);
                  } catch {
                    updateNodeData(props.id, "dtype", e.target.value);
                  }
                }}
                placeholder='{"embed_tokens":"q4"}'
                className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-[#00e5ff] resize-none h-14"
              />
            ) : (
              <select
                value={props.data.dtype || ""}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomDtype(true);
                    return;
                  }
                  updateNodeData(
                    props.id,
                    "dtype",
                    e.target.value || undefined,
                  );
                }}
                className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
              >
                <option value="">auto</option>
                {availableDtypes.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="__custom__">Custom Dict...</option>
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[#5a6b7c] font-bold tracking-widest uppercase">
            REVISION
          </label>
          <input
            type="text"
            value={props.data.revision || ""}
            onChange={(e) =>
              updateNodeData(props.id, "revision", e.target.value)
            }
            placeholder="main"
            className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          />
        </div>

        <ModelSizeBadge sizeBytes={modelSize} />

        <ModelLoadingIndicator nodeId={props.id} />
      </div>
    </BaseNode>
  );
};
