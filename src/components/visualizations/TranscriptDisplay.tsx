export function TranscriptDisplay({ data }: { data: any }) {
  if (!data) return null;

  // Simple text result
  if (typeof data === "string") {
    return (
      <div className="text-xs font-mono text-white leading-relaxed">{data}</div>
    );
  }

  // {text: string} or {text: string, chunks: [...]}
  const text = data.text;
  const chunks = data.chunks;

  if (chunks && Array.isArray(chunks)) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {chunks.map((chunk: any, i: number) => {
          const [start, end] = chunk.timestamp || [];
          return (
            <div key={i} className="flex gap-2 items-start">
              {start !== undefined && (
                <span className="text-[9px] font-mono text-[var(--relax-accent)] bg-[var(--relax-bg-primary)] px-1.5 py-0.5 rounded shrink-0">
                  {formatTime(start)}
                  {end !== undefined && ` - ${formatTime(end)}`}
                </span>
              )}
              <span className="text-[10px] font-mono text-white leading-relaxed">
                {chunk.text}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (text) {
    return (
      <div className="text-xs font-mono text-white leading-relaxed">{text}</div>
    );
  }

  return null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
