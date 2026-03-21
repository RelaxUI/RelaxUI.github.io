import { MemoryPicker } from "@/components/MemoryPicker.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import type { MemoryItem } from "@/hooks/useMemory.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const MediaInputNode = (props: any) => {
  const { updateNodeData, setFullscreenImage } = useContext(RuntimeContext)!;
  const mediaType: "image" | "audio" | "video" =
    props.data.mediaType ||
    (props.type === "audioInput"
      ? "audio"
      : props.type === "videoInput"
        ? "video"
        : "image");
  const isImage = mediaType === "image";
  const isVideo = mediaType === "video";
  const isAudio = mediaType === "audio";
  const [mode, setMode] = useState<"file" | "url" | "mic">(
    props.data.value?.startsWith("http") ? "url" : "file",
  );
  const hasValue = !!props.data.value;

  // Microphone recording state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio orb visualization
  const [audioLevel, setAudioLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (ev) => {
          updateNodeData(props.id, "value", ev.target?.result);
          updateNodeData(props.id, "fileName", "Microphone recording");
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };

      recorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(
        () => setRecordingTime((t) => t + 1),
        1000,
      );

      // Set up AnalyserNode for orb visualization
      try {
        const actx = new AudioContext();
        audioCtxRef.current = actx;
        const source = actx.createMediaStreamSource(stream);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let j = 0; j < dataArray.length; j++) sum += dataArray[j]!;
          setAudioLevel(sum / dataArray.length / 255);
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Audio context not supported — orb will just pulse
      }
    } catch {
      // User denied microphone or not available
    }
  }, [props.id, updateNodeData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
    setRecording(false);
  }, []);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleMemorySelect = useCallback(
    (value: string, item: MemoryItem) => {
      updateNodeData(props.id, "value", value);
      updateNodeData(props.id, "fileName", item.name);
    },
    [props.id, updateNodeData],
  );

  const memoryTypes: MemoryItem["type"][] = isAudio
    ? ["audio"]
    : isVideo
      ? ["video"]
      : ["image"];

  // Available modes for this media type
  const modes = isAudio
    ? (["file", "url", "mic"] as const)
    : (["file", "url"] as const);

  return (
    <BaseNode {...props} headerExtra={<MemoryPicker types={memoryTypes} onSelect={handleMemorySelect} />}>
      <div className="flex items-center gap-1 mb-2 shrink-0 w-full">
        <div className="flex flex-1 bg-(--relax-bg-primary)/60 rounded p-1 border border-(--relax-border)">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 text-[9px] font-bold rounded py-0.5 ${mode === m ? "bg-(--relax-accent) text-(--relax-bg-primary)" : "text-(--relax-text-muted) hover:text-white"}`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
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
          className="w-full bg-(--relax-bg-primary) border border-(--relax-border) rounded p-2 mb-2 text-[10px] font-mono text-white focus:outline-none focus:border-(--relax-accent) nodrag nowheel shrink-0"
        />
      )}

      <div
        className={`flex-1 w-full flex flex-col items-center justify-center border border-dashed border-(--relax-border) rounded bg-(--relax-bg-primary)/60 transition-colors ${hasValue ? (isImage || isVideo ? "min-h-35 border-none" : "border-none") : "hover:border-(--relax-accent)"}`}
      >
        {!hasValue ? (
          mode === "mic" ? (
            <div className="w-full min-h-25 flex flex-col items-center justify-center gap-2 p-3">
              {recording ? (
                <>
                  <div
                    className="rounded-full"
                    style={{
                      width: `${40 + audioLevel * 30}px`,
                      height: `${40 + audioLevel * 30}px`,
                      background: `radial-gradient(circle, ${
                        audioLevel > 0.5
                          ? `hsl(${280 - audioLevel * 40}, 100%, 65%)`
                          : "#00FFD0"
                      } 0%, rgba(0,229,255,0.15) 60%, transparent 100%)`,
                      boxShadow: `0 0 ${12 + audioLevel * 25}px ${4 + audioLevel * 10}px rgba(0,255,208,${0.2 + audioLevel * 0.4})`,
                      transition: "width 0.08s, height 0.08s, box-shadow 0.08s, background 0.15s",
                      animation: audioLevel < 0.05 ? "orbPulse 2s ease-in-out infinite" : "none",
                    }}
                  />
                  <span className="text-[10px] font-mono text-(--relax-text-muted)">
                    {formatTime(recordingTime)}
                  </span>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                  >
                    STOP
                  </button>
                </>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-4 py-1.5 rounded text-[9px] font-bold tracking-widest uppercase border bg-(--relax-accent)/20 border-(--relax-accent)/50 text-(--relax-accent) hover:bg-(--relax-accent)/30 transition-colors cursor-pointer"
                >
                  RECORD
                </button>
              )}
            </div>
          ) : mode === "file" ? (
            <label className="w-full h-full min-h-25 flex flex-col items-center justify-center cursor-pointer">
              <span className="text-[10px] text-(--relax-text-muted) font-bold tracking-widest">
                {isImage
                  ? "CLICK TO UPLOAD"
                  : isVideo
                    ? "UPLOAD VIDEO"
                    : "UPLOAD AUDIO"}
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
            <div className="text-[10px] text-(--relax-text-muted) min-h-25 flex items-center justify-center">
              {isImage
                ? "NO IMAGE URL PROVIDED"
                : isVideo
                  ? "NO VIDEO URL PROVIDED"
                  : "NO AUDIO URL PROVIDED"}
            </div>
          )
        ) : isVideo ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center group/vid">
            <video
              src={props.data.value}
              controls
              className="w-full h-full object-contain max-h-75 rounded nodrag nowheel"
            />
            <button
              onClick={() => updateNodeData(props.id, "value", "")}
              className="absolute top-2 right-2 bg-(--relax-bg-primary)/90 text-white border border-(--relax-border-hover) rounded px-3 py-1.5 text-[9px] font-bold opacity-0 group-hover/vid:opacity-100 hover:bg-red-500 transition-all shadow-lg"
            >
              CLEAR
            </button>
          </div>
        ) : isImage ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center group/img">
            <img
              src={props.data.value}
              alt="Input"
              className="w-full h-full object-contain max-h-75 cursor-zoom-in rounded"
              onClick={() => setFullscreenImage(props.data.value)}
            />
            <button
              onClick={() => updateNodeData(props.id, "value", "")}
              className="absolute top-2 right-2 bg-(--relax-bg-primary)/90 text-white border border-(--relax-border-hover) rounded px-3 py-1.5 text-[9px] font-bold opacity-0 group-hover/img:opacity-100 hover:bg-red-500 transition-all shadow-lg"
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
            <span className="text-[10px] text-(--relax-accent) font-mono truncate max-w-45">
              {props.data.fileName || "Audio loaded"}
            </span>
            <button
              onClick={() => {
                updateNodeData(props.id, "value", null);
                updateNodeData(props.id, "fileName", "");
              }}
              className="text-[9px] text-red-400 hover:text-red-300 font-bold bg-(--relax-bg-primary) border border-red-500/30 rounded px-3 py-1 transition-colors"
            >
              CLEAR
            </button>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
