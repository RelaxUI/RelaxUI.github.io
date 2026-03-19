import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { blobNames } from "@/utils/blobNames.ts";
import { useContext } from "react";

interface FileMeta {
  url: string;
  name: string;
  type: string;
  size: number;
  category: "image" | "audio" | "video" | "text" | "other";
  extension: string;
}

const TEXT_EXTENSIONS = new Set([
  ".txt", ".csv", ".json", ".jsonl", ".xml", ".yaml", ".yml",
  ".md", ".html", ".htm", ".css", ".js", ".ts", ".py", ".sh",
]);

function categorizeFile(file: File): FileMeta["category"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("text/")) return "text";
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "other";
}

export const FolderInputNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  const handleFolderSelect = (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: string[] = [];
    const fileMeta: FileMeta[] = [];

    for (const file of files) {
      if (file.name.startsWith(".")) continue;
      const url = URL.createObjectURL(file);
      blobNames.set(url, file.name);
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      fileList.push(url);
      fileMeta.push({
        url,
        name: file.name,
        type: file.type,
        size: file.size,
        category: categorizeFile(file),
        extension: ext,
      });
    }
    updateNodeData(props.id, "value", fileList);
    updateNodeData(props.id, "fileMeta", fileMeta);
    updateNodeData(props.id, "count", fileList.length);
  };

  const meta: FileMeta[] = props.data.fileMeta || [];
  const counts = {
    image: meta.filter((f) => f.category === "image").length,
    audio: meta.filter((f) => f.category === "audio").length,
    video: meta.filter((f) => f.category === "video").length,
    text: meta.filter((f) => f.category === "text").length,
  };

  return (
    <BaseNode {...props}>
      <div className="flex-1 w-full flex flex-col items-center justify-center border border-dashed border-(--relax-border) rounded bg-(--relax-bg-primary)/60 hover:border-(--relax-accent) transition-colors p-4 nodrag">
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <span className="text-[10px] text-(--relax-text-muted) font-bold">
            SELECT FOLDER
          </span>
          <input
            type="file"
            {...{ webkitdirectory: "", directory: "" }}
            multiple
            className="hidden"
            onChange={handleFolderSelect}
          />
        </label>
        {props.data.count > 0 && (
          <div className="mt-2 w-full text-[9px] font-mono bg-(--relax-bg-elevated) px-2 py-1 border border-(--relax-border) rounded space-y-0.5">
            <div className="text-(--relax-success) font-bold">
              {props.data.count} files loaded
            </div>
            {counts.image > 0 && (
              <div className="text-(--relax-text-muted)">{counts.image} images</div>
            )}
            {counts.audio > 0 && (
              <div className="text-(--relax-text-muted)">{counts.audio} audio</div>
            )}
            {counts.video > 0 && (
              <div className="text-(--relax-text-muted)">{counts.video} video</div>
            )}
            {counts.text > 0 && (
              <div className="text-(--relax-text-muted)">{counts.text} text</div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
};
