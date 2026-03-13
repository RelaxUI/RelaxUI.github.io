import type { FlowNode } from "@/types.ts";

interface TopBarProps {
  currentView: string | null;
  setCurrentView: (id: string | null) => void;
  breadcrumbs: FlowNode[];
  runStatus: string;
  runFlow: () => void;
  exportFlow: () => void;
  openImport: () => void;
  clearWorkflow: () => void;
  resetToDefault: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function TopBar({
  currentView,
  setCurrentView,
  breadcrumbs,
  runStatus,
  runFlow,
  exportFlow,
  openImport,
  clearWorkflow,
  resetToDefault,
  undo,
  redo,
  canUndo,
  canRedo,
}: TopBarProps) {
  return (
    <div className="w-full bg-[var(--relax-bg-primary)]/90 backdrop-blur-md border-b border-[var(--relax-border)] flex items-center px-3 sm:px-6 py-3 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-xs font-mono tracking-widest justify-between relative">
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-gradient-to-tr from-[var(--relax-accent)] to-[#007acc] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)]">
          <span className="text-[var(--relax-bg-primary)] font-bold text-[14px] leading-none mt-[1px]">
            R
          </span>
        </div>
        <span className="hidden sm:inline font-bold text-white text-sm tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
          RelaxUI
        </span>

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 ml-1 sm:ml-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all ${canUndo ? "text-[var(--relax-text-muted)] hover:text-[var(--relax-accent)] hover:bg-[var(--relax-border)]" : "text-[var(--relax-border)] cursor-not-allowed"}`}
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`px-1.5 py-1 rounded text-[10px] font-bold transition-all ${canRedo ? "text-[var(--relax-text-muted)] hover:text-[var(--relax-accent)] hover:bg-[var(--relax-border)]" : "text-[var(--relax-border)] cursor-not-allowed"}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 bg-[var(--relax-bg-elevated)] border border-[var(--relax-border)] px-4 py-1.5 rounded-full shadow-inner whitespace-nowrap overflow-hidden max-w-[40%] custom-scrollbar overflow-x-auto">
        <span
          className={`cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${!currentView ? "text-[var(--relax-accent)] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
          onClick={() => setCurrentView(null)}
        >
          <svg
            className="w-3.5 h-3.5 mb-[1px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="hidden md:inline">WORKFLOW</span>
        </span>
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <div
              key={crumb.id}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <span className="text-[var(--relax-border-hover)] font-black text-sm">
                /
              </span>
              <span
                className={`cursor-pointer flex items-center gap-1.5 transition-colors ${isLast ? "text-[var(--relax-accent)] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
                onClick={() => setCurrentView(crumb.id)}
              >
                <svg
                  className="w-3.5 h-3.5 mb-[1px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                {crumb.data.label?.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Menu button — always visible, contains all actions on small screens */}
        <div className="group relative">
          <button className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[var(--relax-border)] border border-[var(--relax-border-hover)] text-[var(--relax-text-muted)] hover:text-[var(--relax-accent)] hover:border-[var(--relax-accent)] rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg">
            <svg className="w-3.5 h-3.5 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">MENU</span>
          </button>
          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--relax-bg-elevated)] border border-[var(--relax-border)] rounded-md shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex flex-col p-1">
            <button
              onClick={openImport}
              className="text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] rounded hover:text-white"
            >
              IMPORT
            </button>
            <button
              onClick={exportFlow}
              className="text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] rounded hover:text-white"
            >
              EXPORT
            </button>
            <div className="h-px bg-[var(--relax-border)] my-1 mx-2" />
            <button
              onClick={clearWorkflow}
              className="text-left px-3 py-2 text-[10px] font-bold text-red-400 hover:bg-[var(--relax-border)] rounded"
            >
              CLEAR WORKFLOW
            </button>
            <button
              onClick={resetToDefault}
              className="text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] rounded hover:text-white"
            >
              RESET TO DEFAULT
            </button>
            <div className="h-px bg-[var(--relax-border)] my-1 mx-2" />
            <button
              onClick={async () => {
                const { ModelRegistry } = await import(
                  "@/utils/modelRegistry.ts"
                );
                await ModelRegistry.clear_cache_all();
              }}
              className="text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] rounded hover:text-white"
            >
              CLEAR MODEL CACHE
            </button>
          </div>
        </div>

        <button
          onClick={runFlow}
          disabled={runStatus.includes("RUNNING")}
          className={`group flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 border rounded-full transition-all duration-300 shadow-lg select-none ml-1 sm:ml-2 ${runStatus.includes("RUNNING") ? "border-[var(--relax-accent)]/30 bg-[var(--relax-accent)]/10 text-[var(--relax-accent)] cursor-wait" : "border-[var(--relax-accent)] bg-transparent text-[var(--relax-accent)] hover:bg-[var(--relax-accent)] hover:text-[var(--relax-bg-primary)] hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] cursor-pointer"}`}
          title="Run (Ctrl+Enter)"
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${runStatus.includes("RUNNING") ? "bg-[var(--relax-accent)] animate-pulse shadow-[0_0_8px_var(--relax-accent)]" : runStatus === "COMPLETED" ? "bg-[var(--relax-success)]" : runStatus === "ERROR" ? "bg-red-500" : "bg-current"}`}
          />
          <b className="tracking-widest mt-px">
            {runStatus.includes("RUNNING") ? "RUNNING..." : "RUN"}
          </b>
          {!runStatus.includes("RUNNING") && (
            <svg
              className="w-3.5 h-3.5 ml-1 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all hidden sm:block"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
