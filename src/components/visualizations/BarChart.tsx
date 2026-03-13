const COLORS = [
  "#00e5ff",
  "#00ffaa",
  "#ff6b6b",
  "#ffd93d",
  "#6c5ce7",
  "#a29bfe",
  "#fd79a8",
  "#00b894",
  "#e17055",
  "#0984e3",
];

interface BarItem {
  label: string;
  score: number;
}

function normalizeData(data: any): BarItem[] {
  if (Array.isArray(data)) {
    return data
      .filter((d) => d && typeof d.score === "number")
      .map((d) => ({ label: d.label ?? d.token_str ?? String(d.token ?? ""), score: d.score }))
      .sort((a, b) => b.score - a.score);
  }
  if (data && Array.isArray(data.labels) && Array.isArray(data.scores)) {
    return data.labels
      .map((label: string, i: number) => ({
        label,
        score: data.scores[i] ?? 0,
      }))
      .sort((a: BarItem, b: BarItem) => b.score - a.score);
  }
  return [];
}

export function BarChart({ data }: { data: any }) {
  const items = normalizeData(data);
  if (items.length === 0) return null;

  const maxScore = Math.max(...items.map((d) => d.score), 0.01);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-(--relax-text-default) truncate mr-2">
              {item.label}
            </span>
            <span className="text-(--relax-text-muted) shrink-0">
              {(item.score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-3 bg-(--relax-bg-primary) rounded-sm overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{
                width: `${(item.score / maxScore) * 100}%`,
                backgroundColor: COLORS[i % COLORS.length],
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
