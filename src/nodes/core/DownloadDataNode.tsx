import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useState } from "react";

function arrayToCsv(data: any[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export const DownloadDataNode = (props: any) => {
  const { displayData, updateNodeData } = useContext(RuntimeContext)!;
  const data = displayData[props.id];
  const format = props.data.format || "json";
  const [downloading, setDownloading] = useState(false);

  const isArray = Array.isArray(data);
  const isTabular =
    isArray && data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0]);

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);

    try {
      if (format === "csv" && isTabular) {
        const csv = arrayToCsv(data);
        const blob = new Blob([csv], { type: "text/csv" });
        download(blob, `relaxui-output-${Date.now()}.csv`);
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        download(blob, `relaxui-output-${Date.now()}.json`);
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full h-full items-center justify-center nowheel nodrag">
        {isTabular && (
          <div className="flex bg-[var(--relax-bg-primary)]/60 rounded p-0.5 border border-[var(--relax-border)] w-full">
            {(["json", "csv"] as const).map((f) => (
              <button
                key={f}
                onClick={() => updateNodeData(props.id, "format", f)}
                className={`flex-1 text-[9px] font-bold rounded py-0.5 ${format === f ? "bg-[var(--relax-accent)] text-[var(--relax-bg-primary)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {isArray && (
          <div className="text-[9px] text-[var(--relax-text-muted)] font-mono">
            {data.length} items
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!data || downloading}
          className={`px-4 py-3 rounded font-bold text-xs tracking-wider transition-colors shadow-lg ${data ? "bg-[var(--relax-accent)] text-[var(--relax-bg-primary)] hover:bg-[var(--relax-success)]" : "bg-[var(--relax-border)] text-[var(--relax-text-muted)] cursor-not-allowed border border-[var(--relax-border-hover)]"}`}
        >
          {downloading
            ? "DOWNLOADING..."
            : `DOWNLOAD ${format.toUpperCase()}`}
        </button>
      </div>
    </BaseNode>
  );
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
