export function HighlightedAnswer({
  data,
  contextText,
}: {
  data: any;
  contextText?: string;
}) {
  if (!data || typeof data.answer !== "string") return null;

  const { answer, score, start, end } = data;

  return (
    <div className="flex flex-col gap-2">
      {contextText && start !== undefined && end !== undefined ? (
        <div className="text-xs font-mono leading-relaxed text-(--relax-text-default)">
          <span>{contextText.slice(0, start)}</span>
          <span
            className="px-0.5 rounded-sm font-bold"
            style={{
              backgroundColor: "rgba(0, 229, 255, 0.25)",
              borderBottom: "2px solid var(--relax-accent)",
              color: "var(--relax-accent)",
            }}
          >
            {contextText.slice(start, end)}
          </span>
          <span>{contextText.slice(end)}</span>
        </div>
      ) : (
        <div className="text-sm font-mono text-(--relax-accent) font-bold">
          {answer}
        </div>
      )}
      {score !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-(--relax-text-muted) font-bold tracking-widest">
            CONFIDENCE
          </span>
          <span className="text-[10px] font-mono text-(--relax-success) font-bold">
            {(score * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
