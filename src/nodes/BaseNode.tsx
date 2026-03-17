import { LabeledHandle } from "@/components/LabeledHandle.tsx";
import { NODE_DIMENSIONS } from "@/config/nodeDimensions.ts";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { getNodeHandles } from "@/nodes/registry.ts";
import { NodeToolbar, Position, useViewport } from "@xyflow/react";
import { useCallback, useContext, useRef } from "react";

interface BaseNodeProps {
  id: string;
  type: string;
  data: Record<string, any>;
  children?: React.ReactNode;
  selected?: boolean;
}

export const BaseNode = ({
  id,
  type,
  data,
  children,
  selected,
}: BaseNodeProps) => {
  const {
    computingNodes,
    nodeErrors,
    setInfoNodeId,
    deleteNode,
    setCurrentView,
    globalNodes,
    modelLoadingState,
    executionTimes,
    updateNodeData,
  } = useContext(RuntimeContext)!;
  const { zoom } = useViewport();

  const isZoomedOut = zoom < 0.8;
  const dims = NODE_DIMENSIONS[type]!;
  const node = { id, type, data };
  const handles = getNodeHandles(node as any, globalNodes);

  const isComputing =
    computingNodes.has(id) ||
    (type === "macroNode" &&
      globalNodes.some((n) => n.macroId === id && computingNodes.has(n.id)));
  const isError = !!nodeErrors[id];
  const isMacro = type === "macroNode";
  const isImageNode = type === "inputImage" || type === "outputImage";
  const isLoading = modelLoadingState[id]?.status === "loading";
  const execTime = executionTimes[id];

  let dynamicHeight = dims.h;
  if (type === "customScript") {
    const inputCount = (data.inputs || ["in1", "in2", "in3", "in4"]).length;
    dynamicHeight = Math.max(dims.h, 60 + inputCount * 35 + 30);
  }

  // User-defined dimensions override defaults
  const effectiveW = data._userWidth || dims.w;
  const effectiveH = data._userHeight || dynamicHeight;

  // Custom resize handle via pointer drag (avoids conflict with ReactFlow node drag)
  const nodeRef = useRef<HTMLDivElement>(null);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const el = nodeRef.current;
      if (!el) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = el.offsetWidth;
      const startH = el.offsetHeight;

      const onMove = (ev: PointerEvent) => {
        const newW = Math.max(dims.w * 0.5, startW + (ev.clientX - startX) / zoom);
        const newH = Math.max(dims.h * 0.5, startH + (ev.clientY - startY) / zoom);
        el.style.width = `${Math.round(newW)}px`;
        el.style.minHeight = `${Math.round(newH)}px`;
      };

      const onUp = (ev: PointerEvent) => {
        const finalW = Math.max(dims.w * 0.5, startW + (ev.clientX - startX) / zoom);
        const finalH = Math.max(dims.h * 0.5, startH + (ev.clientY - startY) / zoom);
        updateNodeData(id, "_userWidth", Math.round(finalW));
        updateNodeData(id, "_userHeight", Math.round(finalH));
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [id, dims.w, dims.h, zoom, updateNodeData],
  );

  return (
    <div
      ref={nodeRef}
      className={`relative bg-(--relax-bg-elevated)/95 backdrop-blur-md border transition-all duration-300 rounded-xl flex flex-col z-10 group
        ${
          isError
            ? "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
            : isComputing || isLoading
              ? "computing-node shadow-[0_0_25px_rgba(0,255,170,0.4)]"
              : selected
                ? "border-(--relax-accent) shadow-[0_0_20px_rgba(0,229,255,0.15)]"
                : isMacro
                  ? "border-(--relax-accent)/30 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:border-(--relax-border-active)"
                  : "border-(--relax-border-hover) shadow-xl hover:border-(--relax-border-active)"
        }`}
      style={{
        width: effectiveW,
        ...(data._userHeight
          ? { height: effectiveH }
          : { minHeight: effectiveH }),
      }}
    >
      <NodeToolbar position={Position.Top} offset={10} className="flex gap-2">
        <button
          onClick={() => setInfoNodeId(id)}
          aria-label="Node info and rename"
          className="bg-(--relax-border) border border-(--relax-border-hover) text-(--relax-accent) px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-(--relax-accent) hover:text-(--relax-bg-primary) hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-8"
          title="Node Info & Rename"
        >
          <span className="text-sm leading-none -mt-0.5">i</span>{" "}
          {!isZoomedOut && <span>INFO</span>}
        </button>

        {isMacro && (
          <button
            onClick={() => setCurrentView(id)}
            aria-label="Open macro"
            className="bg-(--relax-border) border border-(--relax-border-hover) text-(--relax-success) px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-(--relax-success) hover:text-(--relax-bg-primary) hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-8"
          >
            <span className="text-xs text-center leading-none -mt-0.5">
              &gt;
            </span>{" "}
            {!isZoomedOut && <span>OPEN</span>}
          </button>
        )}

        <button
          onClick={() => deleteNode(id)}
          aria-label="Delete node"
          className="bg-(--relax-border) border border-(--relax-border-hover) text-red-500 px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wider hover:bg-red-500 hover:text-white hover:cursor-pointer transition-colors shadow-lg flex items-center justify-center gap-1.5 min-w-8"
        >
          <span className="text-xs">x</span>{" "}
          {!isZoomedOut && <span>DELETE</span>}
        </button>
      </NodeToolbar>

      {handles.targets.map((h) => (
        <LabeledHandle
          key={`t-${h.id}`}
          id={h.id}
          nodeId={id}
          type="target"
          label={h.label}
          position={Position.Left}
          offsetY={h.offsetY}
          isNodeSelected={selected || false}
        />
      ))}
      {handles.sources.map((h) => (
        <LabeledHandle
          key={`s-${h.id}`}
          id={h.id}
          nodeId={id}
          type="source"
          label={h.label}
          position={Position.Right}
          offsetY={h.offsetY}
          isNodeSelected={selected || false}
        />
      ))}

      <div className="w-full h-8 bg-(--relax-bg-primary)/50 border-b border-(--relax-border) flex items-center px-3 justify-between rounded-t-xl custom-drag-handle">
        <span
          className={`text-[10px] font-bold tracking-widest uppercase truncate max-w-[55%] ${isComputing || isMacro ? "text-(--relax-accent)" : "text-white"}`}
          title={data.label || dims.title}
        >
          {data.label || dims.title}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {execTime !== undefined && !isComputing && (
            <span className="text-[8px] text-(--relax-success) font-mono opacity-70">
              {execTime >= 1000
                ? `${(execTime / 1000).toFixed(1)}s`
                : `${execTime}ms`}
            </span>
          )}
          <span className="text-[8px] text-(--relax-text-muted) font-mono pointer-events-none">
            {dims.sub}
          </span>
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col relative overflow-hidden nodrag">
        {children}
      </div>

      {isError && (
        <div
          className="absolute bottom-0 left-0 w-full bg-red-500 text-white text-[9px] font-bold p-1 z-50 text-center shadow-lg truncate rounded-b-xl"
          role="alert"
        >
          ERROR: {nodeErrors[id]}
        </div>
      )}

      {/* Resize handle - nodrag prevents ReactFlow from capturing drag events */}
      <div
        onPointerDown={onResizePointerDown}
        className={`nodrag absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize transition-opacity z-40 ${selected ? 'opacity-60' : 'opacity-0 group-hover:opacity-60'}`}
        title="Drag to resize"
      >
        <svg viewBox="0 0 12 12" className="w-full h-full text-(--relax-text-muted)">
          <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
};
