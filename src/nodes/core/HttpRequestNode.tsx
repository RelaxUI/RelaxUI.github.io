import { BaseNode } from "@/nodes/BaseNode.tsx";

export const HttpRequestNode = (props: any) => (
  <BaseNode {...props}>
    <div className="w-full h-full flex items-center justify-center text-[#5a6b7c]">
      <span className="text-xs font-mono opacity-50 text-white">
        FETCH ENGINE
      </span>
    </div>
  </BaseNode>
);
