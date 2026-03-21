import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { blobNames } from "@/utils/blobNames.ts";
import { useCallback, useContext } from "react";

interface FileMeta {
  url: string;
  name: string;
  type: string;
  size: number;
  category: "image" | "audio" | "video" | "text" | "other";
  extension: string;
}

type SortMode = "name-asc" | "name-desc" | "size-asc" | "size-desc" | "ext";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "name-asc",  label: "Name A→Z" },
  { value: "name-desc", label: "Name Z→A" },
  { value: "size-asc",  label: "Size ↑" },
  { value: "size-desc", label: "Size ↓" },
  { value: "ext",       label: "Extension" },
];

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

function sortMeta(meta: FileMeta[], mode: SortMode): FileMeta[] {
  const sorted = [...meta];
  switch (mode) {
    case "name-asc":  sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "name-desc": sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
    case "size-asc":  sorted.sort((a, b) => a.size - b.size); break;
    case "size-desc": sorted.sort((a, b) => b.size - a.size); break;
    case "ext":       sorted.sort((a, b) => a.extension.localeCompare(b.extension) || a.name.localeCompare(b.name)); break;
  }
  return sorted;
}

export const FolderInputNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;
  const currentSort: SortMode = props.data.sortMode || "name-asc";

  const applySort = useCallback((meta: FileMeta[], mode: SortMode) => {
    const sorted = sortMeta(meta, mode);
    updateNodeData(props.id, "fileMeta", sorted);
    updateNodeData(props.id, "value", sorted.map((f) => f.url));
    updateNodeData(props.id, "sortMode", mode);
  }, [props.id, updateNodeData]);

  const handleFolderSelect = (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Revoke previous blob URLs to prevent memory leaks
    const prevMeta: FileMeta[] = props.data.fileMeta || [];
    for (const f of prevMeta) {
      if (f.url.startsWith("blob:")) URL.revokeObjectURL(f.url);
    }

    const fileMeta: FileMeta[] = [];

    for (const file of files) {
      if (file.name.startsWith(".")) continue;
      const url = URL.createObjectURL(file);
      blobNames.set(url, file.name);
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      fileMeta.push({
        url,
        name: file.name,
        type: file.type,
        size: file.size,
        category: categorizeFile(file),
        extension: ext,
      });
    }
    const sorted = sortMeta(fileMeta, currentSort);
    updateNodeData(props.id, "value", sorted.map((f) => f.url));
    updateNodeData(props.id, "fileMeta", sorted);
    updateNodeData(props.id, "count", sorted.length);
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
            <div className="pt-1 border-t border-(--relax-border)">
              <select
                value={currentSort}
                onChange={(e) => applySort(meta, e.target.value as SortMode)}
                className="w-full bg-(--relax-bg-primary) text-(--relax-text-default) border border-(--relax-border) rounded px-1 py-0.5 text-[9px] font-bold outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
};
