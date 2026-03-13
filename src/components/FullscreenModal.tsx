import { ImageCompareSlider } from "@/components/ImageCompareSlider.tsx";
import { BoundingBoxOverlay } from "@/components/visualizations/BoundingBoxOverlay.tsx";

interface FullscreenModalProps {
  image: any;
  onClose: () => void;
}

export function FullscreenModal({ image, onClose }: FullscreenModalProps) {
  return (
    <div
      className="fixed inset-0 z-100 bg-[var(--relax-bg-primary)]/95 backdrop-blur-md flex items-center justify-center p-8"
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
            imageUrl={image.in1}
            detections={image.annotations}
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
      <div
        className="absolute top-6 right-8 text-[var(--relax-text-muted)] text-4xl hover:text-white transition-colors cursor-pointer"
        onClick={onClose}
      >
        x
      </div>
    </div>
  );
}
