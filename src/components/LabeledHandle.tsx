import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { Handle, Position } from "@xyflow/react";
import { useContext } from "react";

interface LabeledHandleProps {
  nodeId: string;
  id: string;
  type: "source" | "target";
  label: string;
  position: typeof Position.Left | typeof Position.Right;
  offsetY: number;
  isNodeSelected: boolean;
}

export const LabeledHandle = ({
  nodeId,
  id,
  type,
  label,
  position,
  offsetY,
  isNodeSelected,
}: LabeledHandleProps) => {
  const { globalEdges, hoveredEdgeId } = useContext(RuntimeContext)!;
  const isLeft = position === Position.Left;

  const isEdgeHighlighted = globalEdges.some(
    (e) =>
      (e.selected || e.id === hoveredEdgeId) &&
      ((type === "source" && e.source === nodeId && e.sourceHandle === id) ||
        (type === "target" && e.target === nodeId && e.targetHandle === id)),
  );

  const showLabel = isNodeSelected || isEdgeHighlighted;

  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={`custom-handle bg-[#00e5ff]! border-0! shadow-[0_0_8px_#00e5ff]! transition-transform z-20! group/handle cursor-crosshair`}
      style={{ top: offsetY }}
    >
      <div
        className={`absolute top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5 z-50 transition-opacity duration-200
        ${showLabel ? "opacity-100" : "opacity-0 group-hover/handle:opacity-100 group-hover:opacity-100"}
        ${isLeft ? "right-full mr-2 flex-row-reverse" : "left-full ml-2 flex-row"}`}
      >
        <span className="text-[9px] font-mono font-bold text-[#00e5ff] tracking-widest whitespace-nowrap bg-[#0b0e14] border border-[#1f2630] px-2 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      </div>
    </Handle>
  );
};
