import { useEffect, useRef } from "react";

/** Resolve a CSS custom property to its computed value for canvas use */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const COLORS = [
  () => cssVar("--relax-accent"), () => cssVar("--relax-success"),
  () => "#ff6b6b", () => "#ffd93d", () => "#6c5ce7",
  () => "#a29bfe", () => "#fd79a8", () => "#00b894", () => "#e17055", () => "#0984e3",
];

interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export function BoundingBoxOverlay({
  imageUrl,
  detections,
  maxHeight,
}: {
  imageUrl: string;
  detections: Detection[];
  maxHeight?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl || !detections?.length) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const maxW = container.clientWidth;
      const maxH = maxHeight || 300;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const labelColorMap = new Map<string, string>();
      let colorIdx = 0;

      for (const det of detections) {
        if (!labelColorMap.has(det.label)) {
          labelColorMap.set(det.label, COLORS[colorIdx % COLORS.length]!());
          colorIdx++;
        }
        const color = labelColorMap.get(det.label)!;
        const { xmin, ymin, xmax, ymax } = det.box;
        const bx = xmin * scale;
        const by = ymin * scale;
        const bw = (xmax - xmin) * scale;
        const bh = (ymax - ymin) * scale;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        const label = `${det.label} ${(det.score * 100).toFixed(0)}%`;
        ctx.font = "bold 10px monospace";
        const tm = ctx.measureText(label);
        const lh = 14;
        ctx.fillStyle = color;
        ctx.fillRect(bx, by - lh, tm.width + 6, lh);
        ctx.fillStyle = cssVar("--relax-bg-primary");
        ctx.fillText(label, bx + 3, by - 3);
      }
    };
    img.src = imageUrl;
  }, [imageUrl, detections, maxHeight]);

  if (!detections?.length) return null;

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center">
      <canvas ref={canvasRef} className="rounded max-w-full" />
    </div>
  );
}
