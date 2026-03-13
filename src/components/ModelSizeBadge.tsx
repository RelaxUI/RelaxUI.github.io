interface ModelSizeBadgeProps {
  sizeBytes: number | null;
}

export function ModelSizeBadge({ sizeBytes }: ModelSizeBadgeProps) {
  if (sizeBytes == null) return null;

  const mb = sizeBytes / 1024 / 1024;
  const display = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`;

  let color: string;
  let label: string;
  if (mb < 100) {
    color = "var(--relax-success)";
    label = "lightweight";
  } else if (mb < 500) {
    color = "#ffd93d";
    label = "medium";
  } else {
    color = "#ff6b6b";
    label = "large";
  }

  const ramEstimate = mb * 2;
  const webgpuAvailable = typeof navigator !== "undefined" && !!(navigator as any).gpu;

  return (
    <div
      className="text-[9px] font-mono font-bold tracking-wider mt-1 text-center rounded py-1 cursor-help"
      style={{
        color,
        backgroundColor: "var(--relax-bg-primary)",
        border: "1px solid var(--relax-border)",
      }}
      title={`Est. download: ${display}\nEst. RAM: ~${ramEstimate.toFixed(0)} MB\nWebGPU: ${webgpuAvailable ? "available" : "not available"}\nCategory: ${label}`}
    >
      EST. SIZE: {display}
    </div>
  );
}
