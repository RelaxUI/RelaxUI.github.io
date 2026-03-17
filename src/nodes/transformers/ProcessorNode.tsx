import { BaseNode } from "@/nodes/BaseNode.tsx";

export const ProcessorNode = (props: any) => (
  <BaseNode {...props}>
    <div className="w-full h-full flex items-center justify-center text-[var(--relax-text-muted)]">
      <span className="text-xs font-mono opacity-50 text-white">
        PROCESS INPUTS
      </span>
    </div>
  </BaseNode>
);
