import { BaseNode } from "@/nodes/BaseNode.tsx";

export const ModelCallNode = (props: any) => {
  return (
    <BaseNode {...props}>
      <div className="flex flex-col items-center justify-center w-full py-2">
        <span className="text-[10px] text-(--relax-text-muted) font-bold tracking-widest uppercase">
          FORWARD PASS
        </span>
        <span className="text-[9px] text-[#3d4d5c] mt-1">
          model(inputs) &rarr; outputs
        </span>
      </div>
    </BaseNode>
  );
};
