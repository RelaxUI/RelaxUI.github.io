const COLORS = [
  [0, 229, 255], [0, 255, 170], [255, 107, 107], [255, 217, 61],
  [108, 92, 231], [162, 155, 254], [253, 121, 168], [0, 184, 148],
];

interface Segment {
  label: string;
  score: number;
  mask?: string;
}

export function SegmentationOverlay({
  data,
}: {
  data: Segment[];
}) {
  if (!Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="text-[9px] font-bold text-(--relax-text-muted) tracking-widest">
        SEGMENTS DETECTED: {data.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.map((seg, i) => {
          const [r, g, b] = COLORS[i % COLORS.length]!;
          return (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono"
              style={{ backgroundColor: `rgba(${r},${g},${b},0.15)` }}
            >
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: `rgb(${r},${g},${b})` }}
              />
              <span className="text-white">{seg.label}</span>
              <span className="text-(--relax-text-muted)">
                {(seg.score * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
