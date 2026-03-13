import { useState } from "react";

interface ImageCompareSliderProps {
  img1?: string;
  img2?: string;
  isFullscreen?: boolean;
}

export const ImageCompareSlider = ({
  img1,
  img2,
  isFullscreen = false,
}: ImageCompareSliderProps) => {
  const [sliderPos, setSliderPos] = useState(50);
  const hasBoth = img1 && img2;
  const singleImg = img2 || img1;

  return (
    <div
      className={`w-full h-full overflow-hidden group/slider nodrag nowheel ${isFullscreen ? "max-h-[85vh] relative flex items-center justify-center" : "absolute inset-0"}`}
    >
      {singleImg && (
        <img
          src={singleImg}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          alt="Base"
        />
      )}
      {hasBoth && (
        <div
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
        >
          <img
            src={img1}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            alt="Overlay"
          />
        </div>
      )}
      {hasBoth && (
        <>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 m-0 nodrag nowheel"
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#00e5ff] pointer-events-none flex items-center justify-center z-10 shadow-[0_0_8px_#00e5ff]"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-6 h-6 bg-[#131820] border-2 border-[#00e5ff] rounded-full flex items-center justify-center shadow-[0_0_10px_#00e5ff]">
              <span className="text-[8px] text-[#00e5ff] font-bold tracking-tighter">
                ◄►
              </span>
            </div>
          </div>
          <div className="absolute top-3 left-3 bg-[#0b0e14]/90 text-[#00e5ff] text-[10px] font-bold px-2 py-1 rounded border border-[#1f2630] opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 pointer-events-none">
            IN 1
          </div>
          <div className="absolute top-3 right-3 bg-[#0b0e14]/90 text-[#00ffaa] text-[10px] font-bold px-2 py-1 rounded border border-[#1f2630] opacity-0 group-hover/slider:opacity-100 transition-opacity z-10 pointer-events-none">
            IN 2
          </div>
        </>
      )}
    </div>
  );
};
