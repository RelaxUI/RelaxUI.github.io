import { ImageCompareSlider } from "@/components/ImageCompareSlider.tsx";
import { BoundingBoxOverlay } from "@/components/visualizations/BoundingBoxOverlay.tsx";

interface FullscreenModalProps {
  image: any;
  onClose: () => void;
}

export function FullscreenModal({ image, onClose }: FullscreenModalProps) {
  return (
    <div
      className="fixed inset-0 z-100 bg-(--relax-bg-primary)/95 backdrop-blur-md flex items-center justify-center p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {typeof image === "object" && image._boundingBoxes ? (
          <BoundingBoxOverlay
            imageUrl={image.in1 || ""}
            detections={image.annotations || []}
            maxHeight={window.innerHeight * 0.85}
          />
        ) : typeof image === "object" ? (
          <ImageCompareSlider
            img1={image.in1}
            img2={image.in2}
            isFullscreen={true}
          />
        ) : (
          <img
            src={image}
            alt="Fullscreen View"
            className="max-w-full max-h-full object-contain drop-shadow-2xl"
          />
        )}
      </div>
      <div className="absolute top-6 right-8 flex items-center gap-4">
        {image?.onDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); image.onDownload(); }}
            className="text-(--relax-text-muted) hover:text-white transition-colors cursor-pointer"
            title="Download"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
        <button
          className="text-(--relax-text-muted) text-4xl hover:text-white transition-colors cursor-pointer bg-transparent border-0"
          onClick={onClose}
          aria-label="Close fullscreen view"
        >
          x
        </button>
      </div>
    </div>
  );
}
