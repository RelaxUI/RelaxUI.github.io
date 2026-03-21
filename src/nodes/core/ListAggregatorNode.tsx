import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

function isNamedEntry(item: any): item is { name: string; data: any } {
  return item && typeof item === "object" && "name" in item && "data" in item;
}

function isMediaUrl(val: any): boolean {
  if (typeof val !== "string") return false;
  return val.startsWith("blob:") || (val.startsWith("data:") && /^data:(image|audio|video)/.test(val));
}

function formatPreview(val: any): string {
  if (isMediaUrl(val)) return "(media)";
  if (typeof val === "string") return val.length > 40 ? val.slice(0, 40) + "..." : val;
  if (typeof val === "object") {
    const s = JSON.stringify(val);
    return s.length > 40 ? s.slice(0, 40) + "..." : s;
  }
  return String(val);
}

export const ListAggregatorNode = (props: any) => {
  const { displayData, updateNodeData, clearDisplayData } = useContext(RuntimeContext)!;
  const list = displayData[props.id] || [];
  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag pt-1" style={{ minHeight: 0, flex: "1 1 0" }}>
        <div className="flex items-center justify-between px-1 shrink-0">
          <span className="text-[10px] text-(--relax-accent) font-bold tracking-wider">
            COUNT: {list.length}
          </span>
          <button
            onClick={() => {
              updateNodeData(props.id, "resetTrigger", Date.now());
              clearDisplayData(props.id);
            }}
            className="text-[9px] bg-(--relax-border) text-red-400 font-bold px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors shadow-lg"
          >
            RESET
          </button>
        </div>
        <div className="bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white overflow-y-auto custom-scrollbar" style={{ minHeight: 0, flex: "1 1 0" }}>
          {list.map((item: any, i: number) => (
            <div
              key={i}
              className="border-b border-(--relax-border) py-1 truncate text-(--relax-text-default)"
            >
              <span className="text-(--relax-text-muted) mr-2">[{i}]</span>
              {isNamedEntry(item) ? (
                <>
                  <span className="text-(--relax-accent)">{item.name}</span>
                  <span className="text-(--relax-text-muted) mx-1">&rarr;</span>
                  <span>{formatPreview(item.data)}</span>
                </>
              ) : (
                typeof item === "object" ? JSON.stringify(item) : String(item)
              )}
            </div>
          ))}
        </div>
      </div>
    </BaseNode>
  );
};
