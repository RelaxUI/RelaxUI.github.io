import { BaseNode } from "@/nodes/BaseNode.tsx";

export const MacroConnectionsNode = (props: any) => (
  <BaseNode {...props}>
    <div className="flex flex-col w-full h-full items-center justify-center text-(--relax-text-muted) text-center">
      <span className="text-[10px] font-mono opacity-80 text-white">
        TRACKS EXTERNAL CONNECTIONS
      </span>
    </div>
  </BaseNode>
);
