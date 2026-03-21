import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const PollUntilNode = (props: any) => {
  const { updateNodeData, displayData } = useContext(RuntimeContext)!;
  const poll = displayData[props.id] as
    | { status: string; count: number; polling: boolean }
    | undefined;

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full nowheel nodrag mt-1">
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            INTERVAL (MS)
          </label>
          <input
            type="number"
            min="500"
            value={props.data.interval ?? 2000}
            onChange={(e) =>
              updateNodeData(props.id, "interval", parseInt(e.target.value))
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            STATUS PATH
          </label>
          <input
            type="text"
            value={props.data.statusPath ?? "status"}
            onChange={(e) =>
              updateNodeData(props.id, "statusPath", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              DONE
            </label>
            <input
              type="text"
              value={props.data.doneValue ?? "COMPLETED"}
              onChange={(e) =>
                updateNodeData(props.id, "doneValue", e.target.value)
              }
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
            />
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
              FAIL
            </label>
            <input
              type="text"
              value={props.data.failValue ?? "FAILED"}
              onChange={(e) =>
                updateNodeData(props.id, "failValue", e.target.value)
              }
              className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
            />
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
            MAX ATTEMPTS (0 = unlimited)
          </label>
          <input
            type="number"
            min="0"
            value={props.data.maxAttempts ?? 300}
            onChange={(e) =>
              updateNodeData(props.id, "maxAttempts", parseInt(e.target.value) || 0)
            }
            className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-(--relax-accent)"
          />
        </div>
        {poll && (
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-(--relax-text-muted)">STATUS</span>
              <span
                className={
                  poll.polling ? "text-yellow-400" : "text-green-400"
                }
              >
                {poll.status}
              </span>
            </div>
            <div className="flex justify-between text-[9px] font-mono">
              <span className="text-(--relax-text-muted)">POLLS</span>
              <span className="text-(--relax-accent)">{poll.count}</span>
            </div>
            {poll.polling && (
              <div className="w-full h-1 bg-(--relax-bg-primary) rounded-full overflow-hidden">
                <div
                  className="h-full bg-(--relax-accent) rounded-full animate-pulse"
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
};
