import { NODE_DIMENSIONS } from "@/config/nodeDimensions.ts";
import { NODE_INFO } from "@/config/nodeInfo.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { getNodeHandles } from "@/nodes/registry.ts";
import { useContext, useState } from "react";

interface InfoModalProps {
  nodeId: string;
  onClose: () => void;
}

export const InfoModal = ({ nodeId, onClose }: InfoModalProps) => {
  const { globalNodes, updateNodeData, executionTimes } = useContext(RuntimeContext)!;
  const node = globalNodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const typeInfo = NODE_INFO[node.type!] || {
    desc: "Custom node.",
    in: "Unknown",
    out: "Unknown",
  };
  const dims = NODE_DIMENSIONS[node.type!];
  const handles = getNodeHandles(node as any, globalNodes);
  const execTime = executionTimes[nodeId];

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempData, setTempData] = useState({
    label: node.data.label || "",
    description: node.data.description ?? typeInfo.desc,
  });

  const handleSave = (field: string) => {
    updateNodeData(nodeId, field, (tempData as any)[field]);
    setEditingField(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-110 bg-[#0b0e14]/80 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-[#131820] border border-[#2a323d] rounded-xl p-6 shadow-2xl w-[420px] flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with type badge */}
        <div className="border-b border-[#1f2630] pb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase">
              {dims?.title || "Node Info"}
            </span>
            {dims?.sub && (
              <span className="text-[8px] text-[#5a6b7c] bg-[#0b0e14] px-1.5 py-0.5 rounded font-mono">
                {dims.sub}
              </span>
            )}
            {execTime !== undefined && (
              <span className="text-[8px] text-[#00ffaa] bg-[#00ffaa]/10 px-1.5 py-0.5 rounded font-mono ml-auto">
                {execTime >= 1000 ? `${(execTime / 1000).toFixed(1)}s` : `${execTime}ms`}
              </span>
            )}
          </div>
          {editingField === "label" ? (
            <input
              autoFocus
              className="nowheel nodrag w-full bg-[#0b0e14] border border-[#00e5ff] rounded p-2 text-sm font-bold text-white focus:outline-none"
              value={tempData.label}
              onChange={(e) =>
                setTempData({ ...tempData, label: e.target.value })
              }
              onBlur={() => handleSave("label")}
              onKeyDown={(e) => e.key === "Enter" && handleSave("label")}
            />
          ) : (
            <h2
              className="text-white text-lg font-bold cursor-text hover:text-[#00e5ff] transition-colors group relative"
              onClick={() => setEditingField("label")}
            >
              {node.data.label || "Unnamed Node"}
              <span className="opacity-0 group-hover:opacity-100 text-[#5a6b7c] ml-2 text-xs absolute top-1">
                Edit Name
              </span>
            </h2>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase mb-2 block">
            Description
          </label>
          {editingField === "description" ? (
            <textarea
              autoFocus
              className="nowheel nodrag w-full bg-[#0b0e14] border border-[#00e5ff] rounded p-2 text-xs font-mono text-white focus:outline-none resize-none custom-scrollbar"
              rows={4}
              value={tempData.description}
              onChange={(e) =>
                setTempData({ ...tempData, description: e.target.value })
              }
              onBlur={() => handleSave("description")}
            />
          ) : (
            <p
              className="text-sm text-[#a0aec0] bg-[#0b0e14]/50 border border-[#1f2630] p-3 rounded-lg cursor-text hover:border-[#00e5ff] hover:bg-[#0b0e14] transition-colors relative group"
              onClick={() => setEditingField("description")}
            >
              {node.data.description || typeInfo.desc}
              <span className="opacity-0 group-hover:opacity-100 text-[#00e5ff] absolute top-2 right-2 text-xs bg-[#131820] px-1 rounded shadow">
                Edit
              </span>
            </p>
          )}
        </div>

        {/* Visual handles */}
        <div className="grid grid-cols-2 gap-4 bg-[#0b0e14] p-3 rounded border border-[#1f2630]">
          <div>
            <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase block mb-2">
              Inputs
            </span>
            {handles.targets.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {handles.targets.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00ffaa] shrink-0" />
                    <span className="text-[10px] text-[#a0aec0] font-mono truncate">{h.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-[#5a6b7c] font-mono">None</span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase block mb-2">
              Outputs
            </span>
            {handles.sources.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {handles.sources.map((h) => (
                  <div key={h.id} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00e5ff] shrink-0" />
                    <span className="text-[10px] text-[#a0aec0] font-mono truncate">{h.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-[#5a6b7c] font-mono">None</span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            className="px-4 py-2 text-xs font-mono bg-[#00e5ff] text-[#0b0e14] font-bold rounded hover:bg-[#00ffaa] transition-colors shadow-lg"
            onClick={onClose}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
