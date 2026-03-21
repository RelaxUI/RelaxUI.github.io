import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

const statusBadges: Record<string, { label: string; color: string }> = {
  pending: {
    label: "Review Required",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  },
  approved: {
    label: "Approved",
    color: "text-green-400 border-green-400/30 bg-green-400/10",
  },
  reworking: {
    label: "Reworking...",
    color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-400 border-red-400/30 bg-red-400/10",
  },
};

function DataPreview({ data }: { data: any }) {
  if (data == null) return null;

  // Image data URL
  if (typeof data === "string" && data.startsWith("data:image")) {
    return (
      <img
        src={data}
        alt="Preview"
        className="w-full max-h-32 object-contain rounded border border-(--relax-border) bg-(--relax-bg-primary)/60"
      />
    );
  }

  // String content
  if (typeof data === "string") {
    return (
      <div className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-[10px] font-mono text-white/80 whitespace-pre-wrap break-all max-h-24 overflow-y-auto custom-scrollbar nowheel">
        {data.length > 500 ? data.slice(0, 500) + "..." : data}
      </div>
    );
  }

  // Object/array — show JSON preview
  let preview: string;
  try {
    preview = JSON.stringify(data, null, 2);
    if (preview.length > 500) preview = preview.slice(0, 500) + "...";
  } catch {
    preview = String(data);
  }
  return (
    <div className="w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-[10px] font-mono text-white/80 whitespace-pre-wrap break-all max-h-24 overflow-y-auto custom-scrollbar nowheel">
      {preview}
    </div>
  );
}

export const ReviewNode = (props: any) => {
  const { displayData, resolveApproval, rejectApproval } =
    useContext(RuntimeContext)!;
  const reviewData = displayData[props.id] as
    | { data: any; status: string }
    | undefined;

  const data = reviewData?.data;
  const status = reviewData?.status ?? null;
  const isPending = status === "pending";
  const badge = status ? statusBadges[status] : null;

  return (
    <BaseNode {...props}>
      {/* Idle state — no data yet */}
      {!status && (
        <div className="flex flex-col items-center justify-center gap-1.5 h-full">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-(--relax-accent) opacity-30"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="text-[9px] text-(--relax-text-muted) opacity-50 font-bold tracking-wider uppercase">
            Awaiting data
          </span>
        </div>
      )}

      {/* Data preview */}
      {status && data != null && (
        <div className="flex flex-col gap-1.5 nodrag nowheel">
          <DataPreview data={data} />
        </div>
      )}

      {/* Status badge */}
      {badge && (
        <div className="flex justify-center mt-1.5">
          <span
            className={`text-[9px] font-bold tracking-wider uppercase border rounded px-2 py-0.5 ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
      )}

      {/* Action buttons (when pending) */}
      {isPending && (
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={() =>
              resolveApproval(props.id, { action: "approve", value: data })
            }
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-green-500/15 text-green-400 border border-green-500/30 rounded px-1.5 py-1 hover:bg-green-500/30 transition-colors cursor-pointer"
          >
            Approve
          </button>
          <button
            onClick={() =>
              resolveApproval(props.id, { action: "rework", value: data })
            }
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-1 hover:bg-yellow-500/30 transition-colors cursor-pointer"
          >
            Rework
          </button>
          <button
            onClick={() => rejectApproval(props.id)}
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-1 hover:bg-red-500/30 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </BaseNode>
  );
};
