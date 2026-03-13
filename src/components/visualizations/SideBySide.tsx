export function SideBySide({
  data,
  sourceText,
}: {
  data: any;
  sourceText?: string;
}) {
  let resultText = "";
  if (typeof data === "string") {
    resultText = data;
  } else if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    resultText =
      first?.summary_text || first?.translation_text || first?.generated_text || JSON.stringify(first, null, 2);
  } else if (data && typeof data === "object") {
    resultText =
      data.summary_text || data.translation_text || data.generated_text || JSON.stringify(data, null, 2);
  }

  return (
    <div className="flex gap-2 w-full">
      {sourceText && (
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <span className="text-[8px] text-[var(--relax-text-muted)] font-bold tracking-widest">
            ORIGINAL
          </span>
          <div className="text-[10px] font-mono text-[var(--relax-text-default)] bg-[var(--relax-bg-primary)] rounded p-2 overflow-y-auto custom-scrollbar max-h-[160px] leading-relaxed">
            {sourceText}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span className="text-[8px] text-[var(--relax-accent)] font-bold tracking-widest">
          RESULT
        </span>
        <div className="text-[10px] font-mono text-white bg-[var(--relax-bg-primary)] rounded p-2 overflow-y-auto custom-scrollbar max-h-[160px] leading-relaxed">
          {resultText}
        </div>
      </div>
    </div>
  );
}
