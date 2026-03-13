import type { VisualizationType } from "@/types.ts";
import { BarChart } from "./BarChart.tsx";
import { BoundingBoxOverlay } from "./BoundingBoxOverlay.tsx";
import { HighlightedAnswer } from "./HighlightedAnswer.tsx";
import { HighlightedText } from "./HighlightedText.tsx";
import { ImageCaption } from "./ImageCaption.tsx";
import { SegmentationOverlay } from "./SegmentationOverlay.tsx";
import { SideBySide } from "./SideBySide.tsx";
import { TensorInfo } from "./TensorInfo.tsx";
import { TranscriptDisplay } from "./TranscriptDisplay.tsx";

function sanitize(val: any, depth = 0): any {
  if (depth > 8 || val == null || typeof val !== "object") return val;
  if (typeof val.toDataURL === "function")
    return `[Image ${val.width ?? "?"}x${val.height ?? "?"}]`;
  if (val.dims && val.data && typeof val.data.length === "number")
    return `[Tensor ${val.dims.join("x")}]`;
  if (ArrayBuffer.isView(val))
    return `[${val.constructor.name} len=${(val as any).length}]`;
  if (val instanceof Blob)
    return `[Blob ${val.type} ${(val.size / 1024).toFixed(1)}KB]`;
  if (Array.isArray(val)) return val.map((v) => sanitize(v, depth + 1));
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) out[k] = sanitize(v, depth + 1);
  return out;
}

function formatDisplayValue(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  const safe = sanitize(val);
  try {
    const s = JSON.stringify(safe, null, 2);
    return s.length > 50_000 ? s.slice(0, 50_000) + "\n\n... (truncated)" : s;
  } catch {
    return String(val);
  }
}

export function VisualizationRenderer({ data }: { data: any }) {
  // Check if data is a pipeline result envelope
  const isEnvelope = data && typeof data === "object" && data._visualization;
  const vizType: VisualizationType | undefined = isEnvelope
    ? data._visualization
    : undefined;
  const resultData = isEnvelope ? data.data : data;
  const sourceImage = isEnvelope ? data._sourceImage : undefined;
  const sourceText = isEnvelope ? data._sourceText : undefined;
  const contextText = isEnvelope ? data._contextText : undefined;

  if (vizType && vizType !== "raw-json") {
    switch (vizType) {
      case "bar-chart": {
        const rendered = <BarChart data={resultData} />;
        if (rendered) return rendered;
        break;
      }
      case "highlighted-text":
        return <HighlightedText data={resultData} sourceText={sourceText} />;
      case "highlighted-answer":
        return (
          <HighlightedAnswer
            data={resultData}
            contextText={contextText || sourceText}
          />
        );
      case "side-by-side":
        return <SideBySide data={resultData} sourceText={sourceText} />;
      case "bounding-boxes": {
        if (sourceImage && Array.isArray(resultData) && resultData[0]?.box) {
          return (
            <BoundingBoxOverlay
              imageUrl={sourceImage}
              detections={resultData}
            />
          );
        }
        break;
      }
      case "segmentation-mask":
        return <SegmentationOverlay data={resultData} />;
      case "tensor-info": {
        const rendered = <TensorInfo data={resultData} />;
        if (rendered) return rendered;
        break;
      }
      case "transcript":
        return <TranscriptDisplay data={resultData} />;
      case "image-caption":
        return <ImageCaption data={resultData} sourceImage={sourceImage} />;
    }
  }

  // Auto-detect without envelope
  if (!isEnvelope && resultData) {
    // Tensor detection
    if (
      resultData.dims &&
      resultData.data &&
      typeof resultData.data.length === "number"
    ) {
      return <TensorInfo data={resultData} />;
    }
    // Bar chart detection: array of {label, score}
    if (
      Array.isArray(resultData) &&
      resultData.length > 0 &&
      resultData[0]?.label &&
      resultData[0]?.score !== undefined
    ) {
      if (resultData[0]?.box) {
        // Bounding boxes without source image - fall through to JSON
      } else {
        return <BarChart data={resultData} />;
      }
    }
    // QA detection: {answer, score}
    if (resultData.answer !== undefined && resultData.score !== undefined) {
      return <HighlightedAnswer data={resultData} />;
    }
    // Transcript detection: {text} or {text, chunks}
    if (
      resultData.text !== undefined &&
      (resultData.chunks || !resultData.label)
    ) {
      return <TranscriptDisplay data={resultData} />;
    }
  }

  // Fallback: formatted JSON
  const display = formatDisplayValue(resultData ?? data);
  return (
    <pre className="text-xs font-mono text-white whitespace-pre-wrap">
      {display}
    </pre>
  );
}
