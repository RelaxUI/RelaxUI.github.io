import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useCallback, useContext, useEffect, useRef, useState } from "react";

export const AudioOutputNode = (props: any) => {
  const { displayData } = useContext(RuntimeContext)!;
  const audioRef = useRef<HTMLAudioElement>(null);
  const data = displayData[props.id];
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setAudioSrc(null);
      return;
    }
    if (data instanceof Blob) {
      const url = URL.createObjectURL(data);
      setAudioSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (typeof data === "string") {
      setAudioSrc(data);
    }
  }, [data]);

  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.src = audioSrc;
    }
  }, [audioSrc]);

  const handleDownload = useCallback(() => {
    if (!audioSrc) return;
    const a = document.createElement("a");
    a.href = audioSrc;
    a.download = "audio.wav";
    a.click();
  }, [audioSrc]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full flex-1 items-center justify-center nowheel nodrag">
        {data ? (
          <>
            <audio ref={audioRef} controls className="w-full h-8" />
            <button
              onClick={handleDownload}
              className="text-[9px] font-bold text-(--relax-text-muted) hover:text-(--relax-accent) bg-(--relax-bg-primary)/80 border border-(--relax-border) rounded px-2 py-0.5 transition-colors"
              title="Download audio"
            >
              DOWNLOAD
            </button>
          </>
        ) : (
          <span className="text-[10px] text-(--relax-text-muted) font-mono opacity-50">
            Waiting for audio...
          </span>
        )}
      </div>
    </BaseNode>
  );
};
