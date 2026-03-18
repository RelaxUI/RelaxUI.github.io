const COLORS = [
  [0, 229, 255], [0, 255, 170], [255, 107, 107], [255, 217, 61],
  [108, 92, 231], [162, 155, 254], [253, 121, 168], [0, 184, 148],
];

interface Segment {
  label: string;
  score: number;
  mask?: any;
}

export function SegmentationOverlay({
  data,
}: {
  data: any;
}) {
  // Handle various result formats
  let segments: Segment[] = [];

  if (Array.isArray(data) && data.length > 0) {
    segments = data.filter((s: any) => s && s.label != null);
  } else if (data && typeof data === "object" && !Array.isArray(data)) {
    // Single segment object
    if (data.label != null) {
      segments = [data];
    }
    // Wrapped result with masks/segments key
    else if (Array.isArray(data.segments)) {
      segments = data.segments;
    } else if (Array.isArray(data.masks)) {
      segments = data.masks;
    }
  }

  if (segments.length === 0) {
    return (
      <div className="text-[10px] font-mono text-(--relax-text-muted) p-2">
        No segments detected. Try a different image or model.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="text-[9px] font-bold text-(--relax-text-muted) tracking-widest">
        SEGMENTS DETECTED: {segments.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {segments.map((seg, i) => {
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
              {seg.score != null && (
                <span className="text-(--relax-text-muted)">
                  {(seg.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
