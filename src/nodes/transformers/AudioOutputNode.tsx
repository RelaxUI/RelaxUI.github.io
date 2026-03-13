import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext, useEffect, useRef } from "react";

export const AudioOutputNode = (props: any) => {
  const { displayData } = useContext(RuntimeContext)!;
  const audioRef = useRef<HTMLAudioElement>(null);
  const data = displayData[props.id];

  useEffect(() => {
    if (data && audioRef.current) {
      if (data instanceof Blob) {
        audioRef.current.src = URL.createObjectURL(data);
      } else if (typeof data === "string") {
        audioRef.current.src = data;
      }
    }
  }, [data]);

  return (
    <BaseNode {...props}>
      <div className="flex flex-col gap-2 w-full items-center justify-center nowheel nodrag">
        {data ? (
          <audio ref={audioRef} controls className="w-full h-8" />
        ) : (
          <span className="text-[10px] text-[#5a6b7c] font-mono opacity-50">
            Waiting for audio...
          </span>
        )}
      </div>
    </BaseNode>
  );
};
