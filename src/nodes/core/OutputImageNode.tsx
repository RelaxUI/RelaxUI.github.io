import { ImageCompareSlider } from "@/components/ImageCompareSlider.tsx";
import { BoundingBoxOverlay } from "@/components/visualizations/BoundingBoxOverlay.tsx";
import { SegmentationOverlay } from "@/components/visualizations/SegmentationOverlay.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

const FullscreenButton = ({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) => (
  <button
    onClick={onClick}
    className="absolute bottom-2 right-2 bg-(--relax-bg-primary)/90 text-white border border-(--relax-border-hover) rounded p-1.5 opacity-0 group-hover:opacity-100 hover:text-(--relax-accent) hover:border-(--relax-accent) transition-all shadow-lg z-30 nodrag"
    title="Fullscreen"
  >
    <svg
      className="w-3.5 h-3.5"
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
);

export const OutputImageNode = (props: any) => {
  const { displayData, setFullscreenImage } = useContext(RuntimeContext)!;
  const data = displayData[props.id];
  const hasIn1 = !!data?.in1;
  const hasIn2 = !!data?.in2;
  const hasAnnotations = !!data?.annotations;

  // Determine annotation type
  const annotations = data?.annotations;
  const annotationData = annotations?._visualization
    ? annotations.data
    : annotations;
  const isBoundingBoxes =
    Array.isArray(annotationData) &&
    annotationData.length > 0 &&
    annotationData[0]?.box;
  const isSegmentation =
    Array.isArray(annotationData) &&
    annotationData.length > 0 &&
    annotationData[0]?.label &&
    !annotationData[0]?.box;

  return (
    <BaseNode {...props}>
      <div
        className={`relative flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded overflow-hidden nodrag nowheel ${hasIn1 || hasIn2 ? "min-h-45" : "flex items-center justify-center"}`}
      >
        {hasAnnotations && hasIn1 && isBoundingBoxes ? (
          <div className="relative">
            <BoundingBoxOverlay
              imageUrl={data.in1}
              detections={annotationData}
            />
            <FullscreenButton
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage({
                  in1: data.in1,
                  annotations: annotationData,
                  _boundingBoxes: true,
                });
              }}
            />
          </div>
        ) : hasAnnotations && hasIn1 && isSegmentation ? (
          <div className="flex flex-col gap-2 p-2">
            <img
              src={data.in1}
              alt="Source"
              className="max-h-37.5 rounded object-contain"
            />
            <SegmentationOverlay data={annotationData} />
          </div>
        ) : hasIn1 || hasIn2 ? (
          <>
            <ImageCompareSlider img1={data.in1} img2={data.in2} />
            <FullscreenButton
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(data);
              }}
            />
          </>
        ) : (
          <span className="opacity-30 text-xs font-mono text-white pointer-events-none">
            No Image
          </span>
        )}
      </div>
    </BaseNode>
  );
};
