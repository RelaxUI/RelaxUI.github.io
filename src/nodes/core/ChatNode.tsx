import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useEffect, useRef } from "react";

export const ChatNode = (props: any) => {
  const { updateNodeData, displayData, clearDisplayData } =
    useContext(RuntimeContext)!;
  const raw = displayData[props.id];
  const messages: any[] = Array.isArray(raw) ? raw : [];
  const scrollRef = useRef<HTMLDivElement>(null);
  const leftLabel = props.data.leftLabel || "Left";
  const rightLabel = props.data.rightLabel || "Right";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, messages[messages.length - 1]?.text]);

  return (
    <BaseNode {...props}>
      <div className="flex items-center justify-between mb-1 px-1 shrink-0">
        <input
          className="w-16 bg-transparent text-[9px] font-mono text-(--relax-accent) border-b border-(--relax-border) focus:outline-none focus:border-(--relax-accent) nodrag"
          value={leftLabel}
          onChange={(e) =>
            updateNodeData(props.id, "leftLabel", e.target.value)
          }
        />
        <input
          className="w-16 bg-transparent text-[9px] font-mono text-(--relax-text-muted) border-b border-(--relax-border) focus:outline-none focus:border-(--relax-accent) text-right nodrag"
          value={rightLabel}
          onChange={(e) =>
            updateNodeData(props.id, "rightLabel", e.target.value)
          }
        />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 p-2 nowheel nodrag"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[10px] text-(--relax-text-muted)">
            No messages yet
          </div>
        ) : (
          messages.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex flex-col ${msg.side === "right" ? "items-end" : "items-start"}`}
            >
              <span className="text-[8px] font-mono text-(--relax-text-muted) mb-0.5 px-1">
                {msg.side === "left" ? leftLabel : rightLabel}
              </span>
              <div
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[10px] font-mono leading-relaxed wrap-break-word whitespace-pre-wrap ${
                  msg.side === "right"
                    ? "bg-(--relax-bg-primary) text-(--relax-text-default) border border-(--relax-border) rounded-tr-sm"
                    : "bg-(--relax-accent)/15 text-(--relax-accent) border border-(--relax-accent)/30 rounded-tl-sm"
                } ${msg.streaming ? "opacity-60" : ""}`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => {
          clearDisplayData(props.id);
          updateNodeData(
            props.id,
            "resetTrigger",
            (props.data.resetTrigger ?? 0) + 1,
          );
        }}
        className="mt-1 w-full py-1 rounded text-[9px] font-bold tracking-widest uppercase border border-(--relax-border) text-(--relax-text-muted) hover:text-white hover:border-(--relax-border-hover) transition-colors cursor-pointer shrink-0"
      >
        RESET
      </button>
    </BaseNode>
  );
};
