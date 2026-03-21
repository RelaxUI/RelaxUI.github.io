import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useMemo } from "react";

const ASPECT_RATIOS = [
  "original",
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
] as const;

const OUTPUT_FORMATS = ["original", "png", "jpg", "webp"] as const;

const RESOLUTIONS = ["1K", "2K", "4K"] as const;

const ANCHOR_LABELS = [
  "TL",
  "TC",
  "TR",
  "ML",
  "MC",
  "MR",
  "BL",
  "BC",
  "BR",
] as const;

/** Base dimensions at 1K for each aspect ratio */
const BASE_DIMENSIONS: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "2:3": [832, 1248],
  "3:2": [1248, 832],
  "3:4": [864, 1184],
  "4:3": [1184, 864],
  "4:5": [896, 1152],
  "5:4": [1152, 896],
  "9:16": [768, 1344],
  "16:9": [1344, 768],
  "21:9": [1536, 672],
};

const RESOLUTION_MULTIPLIERS: Record<string, number> = {
  "1K": 1,
  "2K": 2,
  "4K": 4,
};

function getDimensions(
  ratio: string,
  resolution: string,
): [number, number] | null {
  const base = BASE_DIMENSIONS[ratio];
  if (!base) return null;
  const mult = RESOLUTION_MULTIPLIERS[resolution] ?? 1;
  return [base[0] * mult, base[1] * mult];
}

export const ImageProcessNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  const format = props.data.outputFormat || "original";
  const aspectRatio = props.data.aspectRatio || "original";
  const resolution = props.data.resolution || "1K";
  const cropAnchor = props.data.cropAnchor || "MC";
  const quality = props.data.quality ?? 95;
  const roundTo8 = props.data.roundTo8 !== false;

  const dimensions = useMemo(
    () => getDimensions(aspectRatio, resolution),
    [aspectRatio, resolution],
  );

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2.5 w-full nowheel nodrag overflow-y-auto">
        {/* Output Format */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
            Output Format
          </label>
          <select
            value={format}
            onChange={(e) =>
              updateNodeData(props.id, "outputFormat", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary) border border-(--relax-border) rounded px-2 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-(--relax-accent) appearance-none cursor-pointer"
          >
            {OUTPUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f === "original" ? "Original" : f.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) =>
              updateNodeData(props.id, "aspectRatio", e.target.value)
            }
            className="w-full bg-(--relax-bg-primary) border border-(--relax-border) rounded px-2 py-1.5 text-[10px] font-mono text-white focus:outline-none focus:border-(--relax-accent) appearance-none cursor-pointer"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r === "original" ? "Original" : r}
              </option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
            Resolution
          </label>
          <div className="flex bg-(--relax-bg-primary)/60 rounded p-0.5 border border-(--relax-border) w-full">
            {RESOLUTIONS.map((r) => (
              <button
                key={r}
                onClick={() => updateNodeData(props.id, "resolution", r)}
                className={`flex-1 text-[9px] font-bold rounded py-1 transition-colors ${
                  resolution === r
                    ? "bg-(--relax-accent) text-(--relax-bg-primary)"
                    : "text-(--relax-text-muted) hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Target Dimensions Display */}
        <div className="flex items-center justify-center bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-2 py-1.5">
          <span className="text-[10px] font-mono text-(--relax-accent)">
            {dimensions
              ? `${dimensions[0]} x ${dimensions[1]} (${(dimensions[0] * dimensions[1] / 1_000_000).toFixed(1)}MP)`
              : `Original \u2264 ${resolution === "4K" ? "16.0" : resolution === "2K" ? "4.0" : "1.0"}MP`}
          </span>
        </div>

        {/* Crop Anchor */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
            Crop Anchor
          </label>
          <div className="grid grid-cols-3 gap-0.5 w-fit mx-auto">
            {ANCHOR_LABELS.map((anchor) => (
              <button
                key={anchor}
                onClick={() => updateNodeData(props.id, "cropAnchor", anchor)}
                className={`w-6 h-6 rounded-sm text-[7px] font-bold transition-colors border ${
                  cropAnchor === anchor
                    ? "bg-(--relax-accent) text-(--relax-bg-primary) border-(--relax-accent)"
                    : "bg-(--relax-bg-primary) text-(--relax-text-muted) border-(--relax-border) hover:border-(--relax-border-hover) hover:text-white"
                }`}
                title={anchor}
              >
                {cropAnchor === anchor ? "\u2022" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Round to 8 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={roundTo8}
            onChange={(e) =>
              updateNodeData(props.id, "roundTo8", e.target.checked)
            }
            className="accent-(--relax-accent)"
          />
          <span className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
            Round to 8
          </span>
        </label>

        {/* Quality Slider — only for lossy formats (JPG, WebP) */}
        {(format === "jpg" || format === "webp") && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold tracking-widest text-(--relax-text-muted) uppercase">
                Quality
              </label>
              <span className="text-[9px] font-mono text-(--relax-accent)">
                {quality}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={quality}
              onChange={(e) =>
                updateNodeData(props.id, "quality", Number(e.target.value))
              }
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-(--relax-accent) bg-(--relax-border)"
            />
            <div className="flex justify-between text-[7px] text-(--relax-text-muted) font-mono">
              <span>1</span>
              <span>100</span>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
