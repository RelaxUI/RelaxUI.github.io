import { ImageCompareSlider } from "@/components/ImageCompareSlider.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { blobNames } from "@/utils/blobNames.ts";
import { useCallback, useContext } from "react";

/** Unwrap pipeline envelope to data URL */
function unwrap(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._visualization && typeof v.data === "string") return v.data;
  return undefined;
}

const mimeToExt: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/bmp": ".bmp",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

/** Try to extract a filename from a URL/data-URI, fallback to default */
function extractName(src: string | undefined, fallback: string): string {
  if (!src) return fallback;
  try {
    // Check the blob name registry first (populated by FolderInputNode)
    if (src.startsWith("blob:")) {
      return blobNames.get(src) || fallback;
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const pathname = new URL(src).pathname;
      const name = pathname.split("/").pop();
      if (name && name.includes(".")) return name;
    }
  } catch { /* ignore */ }
  return fallback;
}

/** Ensure filename extension matches the actual MIME type of the blob */
function fixExtension(filename: string, mimeType: string): string {
  const ext = mimeToExt[mimeType];
  if (!ext) return filename;
  const dotIdx = filename.lastIndexOf(".");
  const base = dotIdx > 0 ? filename.substring(0, dotIdx) : filename;
  return base + ext;
}

export const OutputImageNode = (props: any) => {
  const { displayData, setFullscreenImage } = useContext(RuntimeContext)!;
  const data = displayData[props.id];
  const img1 = unwrap(data?.in1);
  const img2 = unwrap(data?.in2);
  const hasImages = !!(img1 || img2);

  const handleDownload = useCallback(async () => {
    const src = img2 || img1;
    if (!src) return;
    const baseName = extractName(img1, "image.png");
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const filename = fixExtension(baseName, blob.type);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback for data URIs or same-origin
      const a = document.createElement("a");
      a.href = src;
      a.download = baseName;
      a.click();
    }
  }, [img1, img2]);

  return (
    <BaseNode {...props}>
      <div
        className={`relative flex-1 w-full bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded overflow-hidden nodrag nowheel ${hasImages ? "" : "flex items-center justify-center"}`}
      >
        {hasImages ? (
          <>
            <ImageCompareSlider img1={img1} img2={img2} />
            <div className="absolute bottom-2 right-2 flex gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleDownload}
                className="bg-(--relax-bg-primary)/90 text-white border border-(--relax-border-hover) rounded p-1.5 hover:text-(--relax-accent) hover:border-(--relax-accent) transition-all shadow-lg nodrag"
                title="Download"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFullscreenImage(
                    img1 && img2 ? { in1: img1, in2: img2, onDownload: handleDownload } : { in1: img1 || img2, onDownload: handleDownload },
                  );
                }}
                className="bg-(--relax-bg-primary)/90 text-white border border-(--relax-border-hover) rounded p-1.5 hover:text-(--relax-accent) hover:border-(--relax-accent) transition-all shadow-lg nodrag"
                title="Fullscreen"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
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
