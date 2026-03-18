import { ImageCompareSlider } from "@/components/ImageCompareSlider.tsx";
import { BoundingBoxOverlay } from "@/components/visualizations/BoundingBoxOverlay.tsx";
import { VisualizationRenderer } from "@/components/visualizations/VisualizationRenderer.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useCallback, useContext, useRef, useState } from "react";

/* ── helpers ─────────────────────────────────────────────────────────── */

function sanitizeForCopy(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  const data = val?.data ?? val;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

/* ── Action bar ──────────────────────────────────────────────────────── */

function ActionBar({
  onCopy,
  onFullscreen,
  onDownload,
  copied,
}: {
  onCopy?: () => void;
  onFullscreen?: () => void;
  onDownload?: () => void;
  copied?: boolean;
}) {
  const btn =
    "text-[9px] font-bold text-(--relax-text-muted) hover:text-(--relax-accent) " +
    "bg-(--relax-bg-primary)/80 border border-(--relax-border) rounded px-1.5 py-0.5 " +
    "transition-colors pointer-events-auto";
  return (
    <div className="absolute bottom-1 right-1 flex gap-1 z-30 pointer-events-none">
      {onCopy && (
        <button onClick={onCopy} className={btn} title="Copy to clipboard">
          {copied ? "COPIED" : "COPY"}
        </button>
      )}
      {onDownload && (
        <button onClick={onDownload} className={btn} title="Download">
          DL
        </button>
      )}
      {onFullscreen && (
        <button
          onClick={onFullscreen}
          className={btn}
          title="Fullscreen"
        >
          <svg
            className="w-3 h-3 inline-block"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────── */

export const UniversalOutputNode = (props: any) => {
  const { displayData, setFullscreenImage } = useContext(RuntimeContext)!;
  const display = displayData[props.id];
  const [copied, setCopied] = useState(false);
  const annotatedRef = useRef<HTMLDivElement>(null);

  const rawData = display?.data;
  const img1 = display?.img1;
  const img2 = display?.img2;

  /* ── Detect visualization type from data envelope ── */
  const vizType = rawData?._visualization;
  const sourceImage = rawData?._sourceImage;
  const vizData = rawData?.data;

  // Bounding boxes: annotated image drawn on canvas with source image embedded
  const isBoundingBoxes =
    vizType === "bounding-boxes" &&
    sourceImage &&
    Array.isArray(vizData) &&
    vizData.length > 0 &&
    vizData[0]?.box;

  // Image caption: source image already shown inside the caption component
  const isImageCaption = vizType === "image-caption" && sourceImage;

  // These viz types already display the source image — skip redundant img1
  const vizShowsSourceImage = !!(isBoundingBoxes || isImageCaption);

  /* ── Display mode ── */
  const hasData = rawData != null;
  // If viz already shows source image, don't show img1 separately
  const effectiveImg1 = vizShowsSourceImage ? undefined : img1;
  const showCompare = !!(effectiveImg1 && img2);
  const showSingleImage = !showCompare && !!(effectiveImg1 || img2);
  const showAnnotatedImage = !!isBoundingBoxes;
  const showDataViz = hasData && !isBoundingBoxes;
  const hasContent =
    showCompare || showSingleImage || showAnnotatedImage || showDataViz;

  const singleImgSrc = effectiveImg1 || img2;

  /* ── Callbacks ── */
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sanitizeForCopy(rawData)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [rawData]);

  const downloadUrl = useCallback((src: string, name: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
  }, []);

  const downloadCanvas = useCallback(() => {
    const canvas = annotatedRef.current?.querySelector("canvas");
    if (canvas) downloadUrl(canvas.toDataURL("image/png"), "detection.png");
  }, [downloadUrl]);

  // For data viz section: detect downloadable image content
  const dataImgSrc = (() => {
    if (isImageCaption) return sourceImage as string;
    const inner = rawData?.data ?? rawData;
    return typeof inner === "string" && inner.startsWith("data:image")
      ? inner
      : undefined;
  })();

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full flex-1 min-h-0 overflow-hidden nodrag nowheel">
        {/* ── Annotated image (bounding boxes) ───────────────── */}
        {showAnnotatedImage && (
          <div
            ref={annotatedRef}
            className="relative w-full flex-1 min-h-30 bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded overflow-hidden flex items-center justify-center"
          >
            <BoundingBoxOverlay
              imageUrl={sourceImage}
              detections={vizData}
            />
            <ActionBar
              onCopy={handleCopy}
              copied={copied}
              onFullscreen={() =>
                setFullscreenImage({
                  _boundingBoxes: true,
                  in1: sourceImage,
                  annotations: vizData,
                })
              }
              onDownload={downloadCanvas}
            />
          </div>
        )}

        {/* ── Image comparison (two images) ───────────────────── */}
        {showCompare && (
          <div className="relative w-full flex-1 min-h-30 bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded overflow-hidden">
            <ImageCompareSlider img1={effectiveImg1} img2={img2} />
            <ActionBar
              onFullscreen={() =>
                setFullscreenImage({ in1: effectiveImg1, in2: img2 })
              }
              onDownload={() => {
                const src = img2 || effectiveImg1;
                if (src) downloadUrl(src, "result.png");
              }}
            />
          </div>
        )}

        {/* ── Single image ────────────────────────────────────── */}
        {showSingleImage && (
          <div className="relative w-full flex-1 min-h-30 bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded overflow-hidden flex items-center justify-center">
            <img
              src={singleImgSrc}
              alt="Result"
              className="max-w-full max-h-full object-contain"
            />
            <ActionBar
              onFullscreen={() => setFullscreenImage(singleImgSrc)}
              onDownload={() => {
                if (singleImgSrc) downloadUrl(singleImgSrc, "image.png");
              }}
            />
          </div>
        )}

        {/* ── Data visualization ──────────────────────────────── */}
        {showDataViz && (
          <div className="relative w-full flex-1 min-h-0 bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded p-2 overflow-y-auto custom-scrollbar text-xs font-mono text-white whitespace-pre-wrap flex flex-col">
            <VisualizationRenderer data={rawData} />
            <ActionBar
              onCopy={handleCopy}
              copied={copied}
              onDownload={
                dataImgSrc
                  ? () => downloadUrl(dataImgSrc, "result.png")
                  : undefined
              }
              onFullscreen={
                dataImgSrc
                  ? () => setFullscreenImage(dataImgSrc)
                  : undefined
              }
            />
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!hasContent && (
          <div className="flex-1 flex items-center justify-center">
            <span className="opacity-30 text-xs font-mono text-white">
              Waiting for data...
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
