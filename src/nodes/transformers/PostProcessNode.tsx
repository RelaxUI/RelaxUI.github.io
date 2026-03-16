import { BaseNode } from "@/nodes/BaseNode.tsx";

export const PostProcessNode = (props: any) => {
  const category = props.data.postProcessCategory || "base";

  return (
    <BaseNode {...props}>
      <div className="flex flex-col items-center justify-center w-full py-2">
        <span className="text-[10px] text-[#5a6b7c] font-bold tracking-widest uppercase">
          POST-PROCESS
        </span>
        <span className="text-[9px] text-[#3d4d5c] mt-1 font-mono">
          {category}
        </span>
      </div>
    </BaseNode>
  );
};
