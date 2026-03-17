import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useEffect, useState } from "react";

/** Renders a blob: URL by fetching its Content-Type to pick the right element. */
function BlobPreview({ src }: { src: string }) {
  const [type, setType] = useState<"image" | "audio" | "video" | "text" | null>(
    null,
  );
  const [text, setText] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then(async (res) => {
        if (cancelled) return;
        const ct = res.headers.get("content-type") || "";
        if (ct.startsWith("image")) setType("image");
        else if (ct.startsWith("audio")) setType("audio");
        else if (ct.startsWith("video")) setType("video");
        else if (ct.startsWith("text") || ct.includes("json")) {
          setText(await res.text());
          setType("text");
        } else setType("image"); // best-effort default
      })
      .catch(() => setType("image"));
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!type)
    return <span className="opacity-50 italic text-[10px]">Loading...</span>;
  if (type === "image")
    return (
      <img
        src={src}
        alt="Preview"
        className="max-w-full max-h-full rounded object-contain"
      />
    );
  if (type === "audio") return <audio controls src={src} className="w-full" />;
  if (type === "video")
    return (
      <video
        controls
        src={src}
        className="max-w-full max-h-full rounded object-contain"
      />
    );
  return <span className="whitespace-pre-wrap break-all">{text}</span>;
}

function renderPreview(data: any): React.ReactNode {
  if (data == null) return <span className="opacity-30">No data</span>;

  // Arrays — render each item
  if (Array.isArray(data)) {
    return (
      <div className="flex flex-col gap-2">
        {data.map((item, i) => (
          <div key={i}>{renderPreview(item)}</div>
        ))}
      </div>
    );
  }

  if (typeof data === "string") {
    if (data.startsWith("data:image")) {
      return (
        <img
          src={data}
          alt="Preview"
          className="max-w-full max-h-full rounded object-contain"
        />
      );
    }
    if (data.startsWith("data:audio")) {
      return <audio controls src={data} className="w-full" />;
    }
    if (data.startsWith("data:video")) {
      return (
        <video
          controls
          src={data}
          className="max-w-full max-h-full rounded object-contain"
        />
      );
    }
    if (data.startsWith("blob:")) {
      return <BlobPreview src={data} />;
    }
    return <span className="whitespace-pre-wrap break-all">{data}</span>;
  }

  if (typeof data === "object") {
    try {
      return (
        <span className="whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </span>
      );
    } catch {
      return <span className="opacity-50 italic">Unserializable object</span>;
    }
  }

  return <span className="whitespace-pre-wrap break-all">{String(data)}</span>;
}

const statusBadges: Record<string, { label: string; color: string }> = {
  pending: {
    label: "Waiting...",
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

export const ReviewNode = (props: any) => {
  const { displayData, resolveApproval, rejectApproval } =
    useContext(RuntimeContext)!;
  const reviewData = displayData[props.id] as
    | { data: any; status: string }
    | undefined;

  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  const data = reviewData?.data;
  const status = reviewData?.status ?? null;
  const isPending = status === "pending";

  const handleEdit = () => {
    setEditValue(
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
    setEditing(true);
  };

  const handleSaveEdit = () => {
    setEditing(false);
    resolveApproval(props.id, { action: "edit", value: editValue });
  };

  const badge = status ? statusBadges[status] : null;

  return (
    <BaseNode {...props}>
      {/* Preview area */}
      <div className="nowheel nodrag flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 text-xs font-mono text-white overflow-y-auto custom-scrollbar min-h-0">
        {reviewData == null ? (
          <span className="opacity-30">Waiting for data...</span>
        ) : editing ? (
          <textarea
            className="nowheel nodrag w-full h-full min-h-20 bg-transparent text-xs font-mono text-white focus:outline-none resize-none"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
          />
        ) : (
          renderPreview(data)
        )}
      </div>

      {/* Status badge (when not pending) */}
      {badge && !isPending && (
        <div className="flex justify-center mt-1.5">
          <span
            className={`text-[9px] font-bold tracking-wider uppercase border rounded px-2 py-0.5 ${badge.color}`}
          >
            {badge.label}
          </span>
        </div>
      )}

      {/* Action buttons (when pending) */}
      {isPending && !editing && (
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={() =>
              resolveApproval(props.id, { action: "approve", value: data })
            }
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-green-500/15 text-green-400 border border-green-500/30 rounded px-1.5 py-1 hover:bg-green-500/30 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleEdit}
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded px-1.5 py-1 hover:bg-cyan-500/30 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() =>
              resolveApproval(props.id, { action: "rework", value: data })
            }
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-1 hover:bg-yellow-500/30 transition-colors"
          >
            Rework
          </button>
          <button
            onClick={() => rejectApproval(props.id)}
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-red-500/15 text-red-400 border border-red-500/30 rounded px-1.5 py-1 hover:bg-red-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Save / Cancel for edit mode */}
      {isPending && editing && (
        <div className="flex gap-1.5 mt-1.5">
          <button
            onClick={handleSaveEdit}
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-green-500/15 text-green-400 border border-green-500/30 rounded px-1.5 py-1 hover:bg-green-500/30 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex-1 text-[9px] font-bold tracking-wider uppercase bg-(--relax-border)/50 text-(--relax-text-muted) border border-(--relax-border) rounded px-1.5 py-1 hover:text-white transition-colors"
          >
            Back
          </button>
        </div>
      )}
    </BaseNode>
  );
};
