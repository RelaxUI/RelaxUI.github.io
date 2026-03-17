import type { FlowNode } from "@/types.ts";
import { useCallback, useEffect, useRef, useState } from "react";

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
  openSettings: () => void;
  openNodePicker: () => void;
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
  openSettings,
  openNodePicker,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /** Close dropdown on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmAction(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  /** Two-click confirm for destructive actions */
  const handleDangerAction = useCallback(
    (action: string) => {
      if (confirmAction === action) {
        if (action === "clear") clearWorkflow();
        else if (action === "reset") resetToDefault();
        setConfirmAction(null);
        setMenuOpen(false);
      } else {
        setConfirmAction(action);
      }
    },
    [confirmAction, clearWorkflow, resetToDefault],
  );

  const handleClearModelCache = useCallback(async () => {
    const { ModelRegistry } = await import("@/utils/modelRegistry.ts");
    await ModelRegistry.clear_cache_all();
    setMenuOpen(false);
  }, []);

  /** Navigate up one level in the macro breadcrumb hierarchy */
  const goUpOneLevel = useCallback(() => {
    if (breadcrumbs.length > 1) {
      setCurrentView(breadcrumbs[breadcrumbs.length - 2]!.id);
    } else {
      setCurrentView(null);
    }
  }, [breadcrumbs, setCurrentView]);

  const isRunning = runStatus.includes("RUNNING");

  const menuItemClass =
    "w-full text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] rounded hover:text-white transition-colors";
  const dangerItemClass =
    "w-full text-left px-3 py-2 text-[10px] font-bold text-[var(--relax-error)] hover:bg-[var(--relax-error)]/10 rounded transition-colors";

  return (
    <div className="w-full bg-[var(--relax-bg-primary)]/90 backdrop-blur-md border-b border-[var(--relax-border)] flex items-center px-2 sm:px-6 py-2 sm:py-3 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)] text-xs font-mono tracking-widest justify-between relative gap-1 sm:gap-0">
      {/* ── Left: Logo + (desktop) Undo/Redo ── */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-gradient-to-tr from-[var(--relax-accent)] to-[#007acc] flex items-center justify-center shadow-[0_0_10px_rgba(0,229,255,0.4)]">
          <span className="text-[var(--relax-bg-primary)] font-bold text-[14px] leading-none mt-[1px]">
            R
          </span>
        </div>
        <span className="hidden sm:inline font-bold text-white text-sm tracking-widest drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
          RelaxUI
        </span>

        {/* Undo/Redo — desktop only (mobile: in hamburger menu) */}
        <div className="hidden sm:flex items-center gap-1 ml-2">
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

      {/* ── Center: Breadcrumbs ── */}

      {/* Desktop breadcrumbs — full path in a pill */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 bg-[var(--relax-bg-elevated)] border border-[var(--relax-border)] px-4 py-1.5 rounded-full shadow-inner whitespace-nowrap overflow-hidden max-w-[40%] custom-scrollbar overflow-x-auto">
        <span
          className={`cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${!currentView ? "text-[var(--relax-accent)] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
          onClick={() => setCurrentView(null)}
        >
          <svg className="w-3.5 h-3.5 mb-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="hidden md:inline">WORKFLOW</span>
        </span>
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <div key={crumb.id} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[var(--relax-border-hover)] font-black text-sm">/</span>
              <span
                className={`cursor-pointer flex items-center gap-1.5 transition-colors ${isLast ? "text-[var(--relax-accent)] font-bold drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[var(--relax-text-muted)] hover:text-white"}`}
                onClick={() => setCurrentView(crumb.id)}
              >
                <svg className="w-3.5 h-3.5 mb-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {crumb.data.label?.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile breadcrumb — compact back button, visible only inside a macro */}
      {currentView && (
        <button
          onClick={goUpOneLevel}
          className="sm:hidden flex items-center gap-1.5 px-2 py-1 bg-[var(--relax-bg-elevated)] border border-[var(--relax-border)] rounded-full text-[var(--relax-accent)] transition-colors min-w-0 flex-shrink"
          title="Go back"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[9px] font-bold tracking-wider truncate max-w-[80px]">
            {breadcrumbs.length > 1
              ? breadcrumbs[breadcrumbs.length - 2]!.data.label?.toUpperCase() || "PARENT"
              : "WORKFLOW"}
          </span>
          <span className="text-[var(--relax-border-hover)]">/</span>
          <span className="text-[9px] font-bold tracking-wider truncate max-w-[60px] text-white">
            {breadcrumbs[breadcrumbs.length - 1]?.data.label?.toUpperCase() || "MACRO"}
          </span>
        </button>
      )}

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
        {/* Add node */}
        <button
          onClick={openNodePicker}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[var(--relax-border)] border border-[var(--relax-border-hover)] text-[var(--relax-text-muted)] hover:text-[var(--relax-success)] hover:border-[var(--relax-success)] rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg"
          title="Add Node"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">ADD</span>
        </button>

        {/* Hamburger menu — contains file ops + (mobile-only) undo/redo/settings */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirmAction(null);
            }}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-[var(--relax-border)] border rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg ${menuOpen ? "border-[var(--relax-accent)] text-[var(--relax-accent)]" : "border-[var(--relax-border-hover)] text-[var(--relax-text-muted)] hover:text-[var(--relax-accent)] hover:border-[var(--relax-accent)]"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">FILE</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--relax-bg-elevated)] border border-[var(--relax-border)] rounded-lg shadow-2xl z-50 flex flex-col p-1.5">
              {/* Mobile-only: Undo / Redo / Settings */}
              <div className="sm:hidden">
                <div className="flex gap-1">
                  <button
                    onClick={() => { undo(); setMenuOpen(false); }}
                    disabled={!canUndo}
                    className={`flex-1 text-center px-3 py-2 text-[10px] font-bold rounded transition-colors ${canUndo ? "text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] hover:text-white" : "text-[var(--relax-border-active)] cursor-not-allowed"}`}
                  >
                    UNDO
                  </button>
                  <button
                    onClick={() => { redo(); setMenuOpen(false); }}
                    disabled={!canRedo}
                    className={`flex-1 text-center px-3 py-2 text-[10px] font-bold rounded transition-colors ${canRedo ? "text-[var(--relax-text-default)] hover:bg-[var(--relax-border)] hover:text-white" : "text-[var(--relax-border-active)] cursor-not-allowed"}`}
                  >
                    REDO
                  </button>
                </div>
                <button
                  onClick={() => { openSettings(); setMenuOpen(false); }}
                  className={menuItemClass}
                >
                  SETTINGS
                </button>
                <div className="border-t border-[var(--relax-border)] my-1" />
              </div>

              {/* Workflow I/O */}
              <button
                onClick={() => { openImport(); setMenuOpen(false); }}
                className={menuItemClass}
              >
                IMPORT WORKFLOW
              </button>
              <button
                onClick={() => { exportFlow(); setMenuOpen(false); }}
                className={menuItemClass}
              >
                EXPORT WORKFLOW
              </button>

              <div className="border-t border-[var(--relax-border)] my-1" />

              <button onClick={handleClearModelCache} className={menuItemClass}>
                CLEAR MODEL CACHE
              </button>

              <div className="border-t border-[var(--relax-border)] my-1" />

              {/* Destructive — two-click confirm */}
              <button
                onClick={() => handleDangerAction("clear")}
                className={dangerItemClass}
              >
                {confirmAction === "clear" ? "CONFIRM CLEAR?" : "CLEAR WORKFLOW"}
              </button>
              <button
                onClick={() => handleDangerAction("reset")}
                className={dangerItemClass}
              >
                {confirmAction === "reset" ? "CONFIRM RESET?" : "RESET TO DEFAULT"}
              </button>
            </div>
          )}
        </div>

        {/* Settings — desktop only (mobile: in hamburger menu) */}
        <button
          onClick={openSettings}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--relax-border)] border border-[var(--relax-border-hover)] text-[var(--relax-text-muted)] hover:text-[var(--relax-accent)] hover:border-[var(--relax-accent)] rounded-md transition-all text-[10px] font-bold tracking-wider shadow-lg"
          title="Settings"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>SETTINGS</span>
        </button>

        {/* Run */}
        <button
          onClick={runFlow}
          disabled={isRunning}
          className={`group flex items-center gap-1.5 sm:gap-3 px-2.5 sm:px-5 py-1.5 sm:py-2 border rounded-full transition-all duration-300 shadow-lg select-none ml-0.5 sm:ml-2 ${isRunning ? "border-[var(--relax-accent)]/30 bg-[var(--relax-accent)]/10 text-[var(--relax-accent)] cursor-wait" : "border-[var(--relax-accent)] bg-transparent text-[var(--relax-accent)] hover:bg-[var(--relax-accent)] hover:text-[var(--relax-bg-primary)] hover:shadow-[0_0_15px_rgba(0,229,255,0.5)] cursor-pointer"}`}
          title="Run (Ctrl+Enter)"
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 transition-colors ${isRunning ? "bg-[var(--relax-accent)] animate-pulse shadow-[0_0_8px_var(--relax-accent)]" : runStatus === "COMPLETED" ? "bg-[var(--relax-success)]" : runStatus === "ERROR" ? "bg-red-500" : "bg-current"}`}
          />
          <b className="tracking-widest mt-px text-[10px] sm:text-xs">
            {isRunning ? "RUN..." : "RUN"}
          </b>
          {!isRunning && (
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
