import { RuntimeContext } from "@/context/RuntimeContext.ts";
import {
  BaseEdge,
  EdgeToolbar,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import { useContext } from "react";

export const CustomAnimatedEdge = (props: any) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    selected,
  } = props;
  const { activeEdges, setHoveredEdgeId } = useContext(RuntimeContext)!;
  const reactFlowInstance = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const isEdgeActive = activeEdges.has(id);
  const activeData = activeEdges.get(id);

  const isHighlighted = isEdgeActive || selected;

  return (
    <g
      className={`react-flow__edge group cursor-pointer`}
      onMouseEnter={() => {
        setHoveredEdgeId(id);
      }}
      onMouseLeave={() => {
        setHoveredEdgeId(null);
      }}
    >
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="pointer-events-auto cursor-pointer"
      />

      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          strokeWidth: isHighlighted ? 3 : 2,
          stroke: isHighlighted ? "var(--relax-accent)" : "var(--relax-border-hover)",
          transition: "stroke 0.3s",
        }}
        className={
          isEdgeActive
            ? "edge-dashed-animate stroke-[var(--relax-accent)]!"
            : selected
              ? "stroke-[var(--relax-accent)]!"
              : "stroke-[var(--relax-border-hover)]! group-hover:stroke-[var(--relax-accent)]! pointer-events-none"
        }
      />

      <EdgeToolbar edgeId={id} x={labelX} y={labelY}>
        <button
          onClick={() => reactFlowInstance.deleteElements({ edges: [{ id }] })}
          className="bg-[var(--relax-border)] text-red-500 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-red-500 hover:text-white transition-colors shadow-lg"
        >
          ✕
        </button>
      </EdgeToolbar>

      {isEdgeActive && (
        <circle
          key={activeData?.ts}
          r="5"
          fill="var(--relax-accent)"
          filter="drop-shadow(0 0 5px var(--relax-accent))"
        >
          <animateMotion
            dur="0.6s"
            repeatCount="1"
            path={edgePath}
            fill="freeze"
          />
        </circle>
      )}
    </g>
  );
};
