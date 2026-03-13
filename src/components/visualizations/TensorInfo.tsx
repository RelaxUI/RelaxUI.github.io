export function TensorInfo({ data }: { data: any }) {
  if (!data) return null;

  // Detect tensor by dims + data
  const isTensor = data.dims && data.data && typeof data.data.length === "number";
  if (!isTensor) return null;

  const dims: number[] = Array.from(data.dims);
  const totalElements = dims.reduce((a: number, b: number) => a * b, 1);
  const dtype = data.type || data.data?.constructor?.name || "unknown";
  const sampleValues = Array.from(data.data.slice(0, 6)).map((v: any) =>
    typeof v === "number" ? v.toFixed(4) : String(v),
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
        <span className="text-[var(--relax-text-muted)]">SHAPE</span>
        <span className="text-[var(--relax-accent)]">[{dims.join(", ")}]</span>
        <span className="text-[var(--relax-text-muted)]">DTYPE</span>
        <span className="text-white">{dtype}</span>
        <span className="text-[var(--relax-text-muted)]">ELEMENTS</span>
        <span className="text-white">{totalElements.toLocaleString()}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[8px] text-[var(--relax-text-muted)] font-bold tracking-widest">
          SAMPLE VALUES
        </span>
        <div className="text-[9px] font-mono text-[var(--relax-text-default)] bg-[var(--relax-bg-primary)] rounded p-1.5 overflow-hidden">
          [{sampleValues.join(", ")}
          {totalElements > 6 ? ", ..." : ""}]
        </div>
      </div>
    </div>
  );
}
