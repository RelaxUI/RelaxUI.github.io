import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useState } from "react";

export const MediaInputNode = (props: any) => {
  const { updateNodeData, setFullscreenImage } = useContext(RuntimeContext)!;
  const mediaType: "image" | "audio" | "video" =
    props.data.mediaType || (props.type === "audioInput" ? "audio" : props.type === "videoInput" ? "video" : "image");
  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";
  const [mode, setMode] = useState<"file" | "url">(
    props.data.value?.startsWith("http") ? "url" : "file",
  );
  const hasValue = !!props.data.value;

  return (
    <BaseNode {...props}>
      <div className="flex bg-[var(--relax-bg-primary)]/60 rounded p-1 mb-2 border border-[var(--relax-border)] shrink-0 w-full">
        <button
          onClick={() => setMode("file")}
          className={`flex-1 text-[9px] font-bold rounded py-0.5 ${mode === "file" ? "bg-[var(--relax-accent)] text-[var(--relax-bg-primary)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
        >
          FILE
        </button>
        <button
          onClick={() => setMode("url")}
          className={`flex-1 text-[9px] font-bold rounded py-0.5 ${mode === "url" ? "bg-[var(--relax-accent)] text-[var(--relax-bg-primary)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
        >
          URL
        </button>
      </div>

      {mode === "url" && (
        <input
          type="text"
          value={props.data.value || ""}
          onChange={(e) => updateNodeData(props.id, "value", e.target.value)}
          placeholder={
            isImage
              ? "https://example.com/image.jpg"
              : isVideo
                ? "https://example.com/video.mp4"
                : "https://example.com/audio.wav"
          }
          className="w-full bg-[var(--relax-bg-primary)] border border-[var(--relax-border)] rounded p-2 mb-2 text-[10px] font-mono text-white focus:outline-none focus:border-[var(--relax-accent)] nodrag nowheel shrink-0"
        />
      )}

      <div
        className={`flex-1 w-full flex flex-col items-center justify-center border border-dashed border-[var(--relax-border)] rounded bg-[var(--relax-bg-primary)]/60 transition-colors ${hasValue ? ((isImage || isVideo) ? "min-h-[140px] border-none" : "border-none") : "hover:border-[var(--relax-accent)]"}`}
      >
        {!hasValue ? (
          mode === "file" ? (
            <label className="w-full h-full min-h-[100px] flex flex-col items-center justify-center cursor-pointer">
              <span className="text-[10px] text-[var(--relax-text-muted)] font-bold tracking-widest">
                {isImage ? "CLICK TO UPLOAD" : isVideo ? "UPLOAD VIDEO" : "UPLOAD AUDIO"}
              </span>
              <input
                type="file"
                accept={isImage ? "image/*" : isVideo ? "video/*" : "audio/*"}
                className="hidden"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    if (!isImage || isVideo) {
                      updateNodeData(props.id, "fileName", file.name);
                    }
                    const r = new FileReader();
                    r.onload = (ev) =>
                      updateNodeData(props.id, "value", ev.target?.result);
                    r.readAsDataURL(file);
                  }
                }}
              />
            </label>
          ) : (
            <div className="text-[10px] text-[var(--relax-text-muted)] min-h-[100px] flex items-center justify-center">
              {isImage ? "NO IMAGE URL PROVIDED" : isVideo ? "NO VIDEO URL PROVIDED" : "NO AUDIO URL PROVIDED"}
            </div>
          )
        ) : isVideo ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center group/vid">
            <video
              src={props.data.value}
              controls
              className="w-full h-full object-contain max-h-[300px] rounded nodrag nowheel"
            />
            <button
              onClick={() => updateNodeData(props.id, "value", "")}
              className="absolute top-2 right-2 bg-[var(--relax-bg-primary)]/90 text-white border border-[var(--relax-border-hover)] rounded px-3 py-1.5 text-[9px] font-bold opacity-0 group-hover/vid:opacity-100 hover:bg-red-500 transition-all shadow-lg"
            >
              CLEAR
            </button>
          </div>
        ) : isImage ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center group/img">
            <img
              src={props.data.value}
              alt="Input"
              className="w-full h-full object-contain max-h-[300px] cursor-zoom-in rounded"
              onClick={() => setFullscreenImage(props.data.value)}
            />
            <button
              onClick={() => updateNodeData(props.id, "value", "")}
              className="absolute top-2 right-2 bg-[var(--relax-bg-primary)]/90 text-white border border-[var(--relax-border-hover)] rounded px-3 py-1.5 text-[9px] font-bold opacity-0 group-hover/img:opacity-100 hover:bg-red-500 transition-all shadow-lg"
            >
              CLEAR
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full p-2">
            <audio
              controls
              src={props.data.value}
              className="w-full h-8 nodrag nowheel"
            />
            <span className="text-[10px] text-[var(--relax-accent)] font-mono truncate max-w-[180px]">
              {props.data.fileName || "Audio loaded"}
            </span>
            <button
              onClick={() => {
                updateNodeData(props.id, "value", null);
                updateNodeData(props.id, "fileName", "");
              }}
              className="text-[9px] text-red-400 hover:text-red-300 font-bold bg-[var(--relax-bg-primary)] border border-red-500/30 rounded px-3 py-1 transition-colors"
            >
              CLEAR
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
