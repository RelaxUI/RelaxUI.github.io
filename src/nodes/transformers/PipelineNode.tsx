import { ModelLoadingIndicator } from "@/components/ModelLoadingIndicator.tsx";
import { ModelSizeBadge } from "@/components/ModelSizeBadge.tsx";
import { getDefaultDevice } from "@/config/defaults.ts";
import { DEVICE_OPTIONS } from "@/config/generationDefaults.ts";
import {
  PIPELINE_CATEGORIES,
  PIPELINE_TASKS,
} from "@/config/pipelineRegistry.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { ModelRegistry } from "@/utils/modelRegistry.ts";
import { useUpdateNodeInternals } from "@xyflow/react";
import { useContext, useEffect, useState } from "react";

export const PipelineNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const updateNodeInternals = useUpdateNodeInternals();
  const task = props.data.task || "text-classification";
  const [modelSize, setModelSize] = useState<number | null>(null);
  const [availableDtypes, setAvailableDtypes] = useState<string[]>([]);

  useEffect(() => {
    updateNodeInternals(props.id);
  }, [task, props.id, updateNodeInternals]);

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
            TASK
          </label>
          <select
            value={task}
            onChange={(e) => {
              updateNodeData(props.id, "task", e.target.value);
              const taskDef = PIPELINE_TASKS[e.target.value];
              if (taskDef) {
                updateNodeData(props.id, "model_id", taskDef.defaultModel);
              }
            }}
            className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
          >
            {Object.entries(PIPELINE_CATEGORIES).map(([cat, tasks]) => (
              <optgroup key={cat} label={cat}>
                {tasks.map((t) => (
                  <option key={t} value={t}>
                    {PIPELINE_TASKS[t]?.label ?? t}
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
            placeholder={PIPELINE_TASKS[task]?.defaultModel ?? "model-id"}
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
            <select
              value={props.data.dtype || ""}
              onChange={(e) =>
                updateNodeData(props.id, "dtype", e.target.value || undefined)
              }
              className="w-full bg-[#0b0e14]/60 border border-[#1f2630] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[#00e5ff]"
            >
              <option value="">auto</option>
              {availableDtypes.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ModelSizeBadge sizeBytes={modelSize} />

        <ModelLoadingIndicator nodeId={props.id} />
      </div>
    </BaseNode>
  );
};
