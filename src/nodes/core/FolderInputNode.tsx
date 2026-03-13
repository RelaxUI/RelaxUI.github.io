import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { BaseNode } from "@/nodes/BaseNode.tsx";
import { useContext } from "react";

export const FolderInputNode = (props: any) => {
  const { updateNodeData } = useContext(RuntimeContext)!;

  const handleFolderSelect = (e: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: string[] = [];
    for (const file of files) {
      if (file.name.startsWith(".")) continue; // skip hidden files
      fileList.push(URL.createObjectURL(file));
    }
    updateNodeData(props.id, "value", fileList);
    updateNodeData(props.id, "count", fileList.length);
  };

  return (
    <BaseNode {...props}>
      <div className="flex-1 w-full flex flex-col items-center justify-center border border-dashed border-[#1f2630] rounded bg-[#0b0e14]/60 hover:border-[#00e5ff] transition-colors p-4 nodrag">
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
          <span className="text-[10px] text-[#5a6b7c] font-bold">
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
          <div className="mt-2 text-[10px] text-[#00ffaa] font-mono bg-[#131820] px-2 py-1 border border-[#1f2630] rounded">
            {props.data.count} files loaded
          </div>
        )}
      </div>
    </BaseNode>
  );
};
