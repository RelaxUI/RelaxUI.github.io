import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useMemo, useRef, useState } from "react";

function arrayToCsv(data: any[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

function isBlobUrl(val: any): boolean {
  return typeof val === "string" && val.startsWith("blob:");
}

function isDataUrl(val: any): boolean {
  return typeof val === "string" && val.startsWith("data:");
}

function isMediaUrl(val: any): boolean {
  if (isBlobUrl(val)) return true;
  if (!isDataUrl(val)) return false;
  const mime = getDataUrlMime(val);
  return mime.startsWith("image") || mime.startsWith("audio") || mime.startsWith("video");
}

function getDataUrlMime(url: string): string {
  const m = url.match(/^data:([^;,]+)/);
  return m ? m[1]! : "";
}

type DataType = "string" | "tabular" | "media" | "array" | "unknown";

function detectDataType(data: any): DataType {
  if (typeof data === "string") {
    if (isMediaUrl(data)) return "media";
    return "string";
  }
  if (data instanceof Blob) return "media";
  if (Array.isArray(data)) {
    if (data.length > 0 && isMediaUrl(data[0])) return "media";
    if (data.length > 0 && data[0] instanceof Blob) return "media";
    // Named entries {name, data} should be treated as array (offers ZIP), not tabular
    if (data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0]) && "name" in data[0] && "data" in data[0])
      return "array";
    if (data.length > 0 && typeof data[0] === "object" && !Array.isArray(data[0]) && !isDataUrl(data[0]) && !isBlobUrl(data[0]))
      return "tabular";
    return "array";
  }
  return "unknown";
}

function getFormats(dataType: DataType, isArray: boolean): string[] {
  switch (dataType) {
    case "string": return ["json", "txt"];
    case "tabular": return ["json", "csv", "txt"];
    case "media": return isArray ? ["zip", "json"] : ["original", "png", "jpg", "webp", "json"];
    case "array": return ["json", "zip"];
    default: return ["json"];
  }
}

/** Get file extension from MIME type. */
function extFromMime(mime: string): string {
  if (mime.startsWith("image/jpeg")) return "jpg";
  if (mime.startsWith("image/png")) return "png";
  if (mime.startsWith("image/webp")) return "webp";
  if (mime.startsWith("image/gif")) return "gif";
  if (mime.startsWith("image/svg")) return "svg";
  if (mime.startsWith("audio/wav") || mime.startsWith("audio/x-wav")) return "wav";
  if (mime.startsWith("audio/mp3") || mime.startsWith("audio/mpeg")) return "mp3";
  if (mime.startsWith("audio/ogg")) return "ogg";
  if (mime.startsWith("audio/flac")) return "flac";
  if (mime.startsWith("video/mp4")) return "mp4";
  if (mime.startsWith("video/webm")) return "webm";
  if (mime.startsWith("text/plain")) return "txt";
  if (mime.includes("json")) return "json";
  const sub = mime.split("/")[1];
  return sub || "bin";
}

/** Resolve any URL (data: or blob:) to a Blob. Single fetch, returns both blob and MIME. */
async function resolveUrl(url: string): Promise<{ blob: Blob; mime: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  return { blob, mime: blob.type || "application/octet-stream" };
}

/** Convert an image (data URL or Blob) to a target format via canvas. */
async function convertImage(src: string | Blob, targetFormat: string): Promise<Blob> {
  const url = src instanceof Blob ? URL.createObjectURL(src) : src;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const mime = targetFormat === "jpg" ? "image/jpeg" : targetFormat === "webp" ? "image/webp" : "image/png";
    return canvas.convertToBlob({ type: mime, quality: 0.95 });
  } finally {
    if (src instanceof Blob) URL.revokeObjectURL(url);
  }
}

const NAMING_MODES = ["auto", "from-edge", "incremental"] as const;
type NamingMode = (typeof NAMING_MODES)[number];

export const DownloadDataNode = (props: any) => {
  const { displayData, updateNodeData } = useContext(RuntimeContext)!;
  const raw = displayData[props.id];
  // Support new format { data, name } and old format (raw data directly)
  const data = raw?.data ?? raw;
  const edgeName = raw?.name;
  const format = props.data.format || "json";
  const namingMode: NamingMode = props.data.namingMode || "auto";
  const [downloading, setDownloading] = useState(false);
  const incrementalCounter = useRef(0);

  const isArray = Array.isArray(data);
  const dataType = useMemo(() => detectDataType(data), [data]);
  const formats = useMemo(() => getFormats(dataType, isArray), [dataType, isArray]);
  const currentFormat = formats.includes(format) ? format : formats[0]!;

  const getFilename = (ext: string) => {
    if (namingMode === "from-edge" && edgeName) {
      return `${edgeName}.${ext}`;
    }
    if (namingMode === "incremental") {
      incrementalCounter.current += 1;
      return `image-${incrementalCounter.current}.${ext}`;
    }
    return `relaxui-output-${Date.now()}.${ext}`;
  };

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);

    try {
      if (currentFormat === "csv" && dataType === "tabular") {
        const csv = arrayToCsv(data);
        download(new Blob([csv], { type: "text/csv" }), getFilename("csv"));

      } else if (currentFormat === "txt") {
        const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
        download(new Blob([text], { type: "text/plain" }), getFilename("txt"));

      } else if (currentFormat === "zip" && isArray) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (let i = 0; i < data.length; i++) {
          const raw = data[i];
          // Detect {name, data} named entries
          const isNamed = raw && typeof raw === "object" && "name" in raw && "data" in raw;
          const content = isNamed ? raw.data : raw;
          const entryName = isNamed ? raw.name : null;

          if (isMediaUrl(content)) {
            const { blob, mime } = await resolveUrl(content);
            zip.file(entryName || `item-${i}.${extFromMime(mime)}`, blob);
          } else if (content instanceof Blob) {
            zip.file(entryName || `item-${i}.${extFromMime(content.type)}`, content);
          } else if (typeof content === "string") {
            zip.file(entryName || `item-${i}.txt`, content);
          } else {
            zip.file(entryName || `item-${i}.json`, JSON.stringify(content, null, 2));
          }
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        download(zipBlob, getFilename("zip"));

      } else if (dataType === "media" && !isArray && ["original", "png", "jpg", "webp"].includes(currentFormat)) {
        const resolved = data instanceof Blob ? { blob: data, mime: data.type } : await resolveUrl(data);
        const { blob, mime } = resolved;
        if (currentFormat === "original") {
          download(blob, getFilename(extFromMime(mime)));
        } else if (mime.startsWith("image")) {
          const converted = await convertImage(blob, currentFormat);
          download(converted, getFilename(currentFormat));
        } else {
          download(blob, getFilename(extFromMime(mime)));
        }

      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        download(blob, getFilename("json"));
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full h-full items-center justify-center nowheel nodrag">
        {/* Naming mode selector */}
        <div className="flex bg-(--relax-bg-primary)/60 rounded p-0.5 border border-(--relax-border) w-full">
          {NAMING_MODES.map((m) => (
            <button
              key={m}
              onClick={() => updateNodeData(props.id, "namingMode", m)}
              className={`flex-1 text-[9px] font-bold rounded py-0.5 ${namingMode === m ? "bg-(--relax-accent) text-(--relax-bg-primary)" : "text-(--relax-text-muted) hover:text-white"}`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {edgeName && namingMode === "from-edge" && (
          <div className="text-[9px] text-(--relax-text-muted) font-mono truncate w-full text-center">
            name: {String(edgeName)}
          </div>
        )}

        {formats.length > 1 && (
          <div className="flex bg-(--relax-bg-primary)/60 rounded p-0.5 border border-(--relax-border) w-full">
            {formats.map((f) => (
              <button
                key={f}
                onClick={() => updateNodeData(props.id, "format", f)}
                className={`flex-1 text-[9px] font-bold rounded py-0.5 ${currentFormat === f ? "bg-(--relax-accent) text-(--relax-bg-primary)" : "text-(--relax-text-muted) hover:text-white"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {isArray && (
          <div className="text-[9px] text-(--relax-text-muted) font-mono">
            {data.length} items{data.some((d: any) => d && typeof d === "object" && "name" in d && "data" in d) ? " (named)" : ""}
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!data || downloading}
          className={`px-4 py-3 rounded font-bold text-xs tracking-wider transition-colors shadow-lg ${data ? "bg-(--relax-accent) text-(--relax-bg-primary) hover:bg-(--relax-success)" : "bg-(--relax-border) text-(--relax-text-muted) cursor-not-allowed border border-(--relax-border-hover)"}`}
        >
          {downloading
            ? "DOWNLOADING..."
            : data ? `DOWNLOAD ${currentFormat.toUpperCase()}` : "DOWNLOAD"}
        </button>
      </div>
    </BaseNode>
  );
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
