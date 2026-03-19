import { BaseNode } from "@/nodes/BaseNode.tsx";

export const HttpRequestNode = (props: any) => (
  <BaseNode {...props}>
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-(--relax-accent) opacity-30"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
      </svg>
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-1">
          <span className="text-[8px] font-mono text-(--relax-text-muted) bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-0.5">
            METHOD
          </span>
          <span className="text-[8px] font-mono text-(--relax-text-muted) bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-0.5">
            URL
          </span>
          <span className="text-[8px] font-mono text-(--relax-text-muted) bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-0.5">
            HEADERS
          </span>
          <span className="text-[8px] font-mono text-(--relax-text-muted) bg-(--relax-bg-primary)/60 border border-(--relax-border) rounded px-1.5 py-0.5">
            BODY
          </span>
        </div>
        <div className="w-6 h-px bg-(--relax-text-muted)/30" />
        <div className="flex items-center gap-1.5 text-(--relax-text-muted) opacity-50">
          <span className="text-[8px] font-bold tracking-widest uppercase">
            fetch
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M1 5h8M6 2l3 3-3 3" />
          </svg>
          <span className="text-[8px] font-bold tracking-widest uppercase">
            response
          </span>
        </div>
        <span className="text-[8px] text-(--relax-text-muted) opacity-40">
          Supports JSON & SSE streaming
        </span>
      </div>
    </div>
  </BaseNode>
);
