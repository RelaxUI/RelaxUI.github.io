import { BaseNode } from "@/nodes/BaseNode.tsx";

export const MacroConnectionsNode = (props: any) => (
  <BaseNode {...props}>
    <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-(--relax-accent) opacity-30"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="18" cy="19" r="3" />
        <circle cx="6" cy="12" r="3" />
        <path d="M9 12h3l3-7M12 12l3 7" />
      </svg>
      <span className="text-[9px] font-mono text-(--relax-text-muted) opacity-50 text-center leading-tight">
        Active output ports
      </span>
    </div>
  </BaseNode>
);
