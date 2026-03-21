import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ContextMenu } from "@/components/ContextMenu/ContextMenu.tsx";
import { FullscreenModal } from "@/components/FullscreenModal.tsx";
import { ImportDialog } from "@/components/ImportDialog.tsx";
import { InfoModal } from "@/components/InfoModal.tsx";
import { NodePickerPanel } from "@/components/NodePickerPanel.tsx";
import { SettingsDialog } from "@/components/SettingsDialog.tsx";
import { TopBar } from "@/components/TopBar.tsx";
import { RuntimeContext } from "@/context/RuntimeContext.ts";
import { useCopyPaste } from "@/hooks/useCopyPaste.ts";
import { useFlowState } from "@/hooks/useFlowState.ts";
import { useGraphRunner } from "@/hooks/useGraphRunner.ts";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts.ts";
import { useSettings } from "@/hooks/useSettings.ts";
import { useUndoRedo } from "@/hooks/useUndoRedo.ts";
import { edgeTypes, nodeTypes } from "@/nodes/registry.ts";
import {
  validateWorkflow,
  type ValidationIssue,
} from "@/utils/validateWorkflow.ts";

export function FlowEditor() {
  const flow = useFlowState();
  const runner = useGraphRunner();
  const { settings } = useSettings();

  // ResizeObserver loop error suppression is handled by an early <script> in
  // index.html (before Bun's dev console proxy captures it).

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [infoNodeId, setInfoNodeId] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nodePickerOpen, setNodePickerOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState<
    ValidationIssue[] | null
  >(null);

  // Undo/Redo
  const undoRedo = useUndoRedo(
    () => flow.nodes,
    () => flow.edges,
    (nodes) => flow.setNodes(nodes as any),
    (edges) => flow.setEdges(edges as any),
    settings.undoHistorySize,
  );

  // Copy/Paste
  const copyPaste = useCopyPaste(
    () => flow.nodes,
    () => flow.edges,
    (nodes) => flow.setNodes((nds: any) => [...nds, ...nodes]),
    (edges) => flow.setEdges((eds: any) => [...eds, ...edges]),
  );

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleAddNode = useCallback(
    (type: string) => {
      if (!contextMenu) return;
      const position = flow.reactFlowInstance.screenToFlowPosition({
        x: contextMenu.x,
        y: contextMenu.y,
      });
      flow.addNode(type, position);
      undoRedo.takeSnapshot();
      setContextMenu(null);
    },
    [contextMenu, flow, undoRedo],
  );

  // Add node at viewport center (for NodePickerPanel)
  const handleAddNodeAtCenter = useCallback(
    (type: string) => {
      const position = flow.reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      flow.addNode(type, position);
      undoRedo.takeSnapshot();
    },
    [flow, undoRedo],
  );

  // Keep the runner's live nodes ref in sync so rework uses fresh node data.
  // Render-body for synchronous access; useEffect as post-commit safety net.
  runner.liveNodesRef.current = flow.nodes;
  useEffect(() => {
    runner.liveNodesRef.current = flow.nodes;
  }, [flow.nodes]);

  const handleRunFlow = useCallback(() => {
    runner.runFlow(flow.nodes, flow.edges);
  }, [runner, flow.nodes, flow.edges]);

  const handleImportFlow = useCallback(
    (flowData: { nodes: any[]; edges: any[]; viewport?: any }) => {
      flow.importFlow(flowData);
      runner.setDisplayData({});
      runner.setNodeErrors({});
      setImportDialogOpen(false);
    },
    [flow, runner],
  );

  const handleValidate = useCallback(() => {
    const issues = validateWorkflow(flow.nodes, flow.edges);
    setValidationIssues(issues);
  }, [flow.nodes, flow.edges]);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      undo: undoRedo.undo,
      redo: undoRedo.redo,
      copy: copyPaste.copy,
      paste: copyPaste.paste,
      exportFlow: flow.exportFlow,
      runFlow: handleRunFlow,
      escape: () => {
        setContextMenu(null);
        setFullscreenImage(null);
        setInfoNodeId(null);
        setSettingsOpen(false);
        setNodePickerOpen(false);
      },
    }),
    [undoRedo, copyPaste, flow.exportFlow, handleRunFlow],
  );
  useKeyboardShortcuts(shortcutHandlers);

  // Take snapshot on significant changes
  const handleNodesChange = useCallback(
    (changes: any) => {
      flow.handleNodesChange(changes);
      const hasStructuralChange = changes.some(
        (c: any) =>
          c.type === "add" || c.type === "remove" || c.type === "position",
      );
      if (hasStructuralChange) undoRedo.takeSnapshot();
    },
    [flow, undoRedo],
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      flow.handleEdgesChange(changes);
      const hasStructuralChange = changes.some(
        (c: any) => c.type === "add" || c.type === "remove",
      );
      if (hasStructuralChange) undoRedo.takeSnapshot();
    },
    [flow, undoRedo],
  );

  const handleConnect = useCallback(
    (params: any) => {
      flow.handleConnect(params);
      undoRedo.takeSnapshot();
    },
    [flow, undoRedo],
  );

  const clearWorkflow = useCallback(() => {
    flow.setNodes([]);
    flow.setEdges([]);
    localStorage.setItem("relaxui_autosave_v1", JSON.stringify({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }));
  }, [flow]);

  return (
    <RuntimeContext.Provider
      value={useMemo(
        () => ({
          globalNodes: flow.nodes,
          globalEdges: flow.edges,
          hoveredEdgeId,
          setHoveredEdgeId,
          updateNodeData: flow.updateNodeData,
          removeEdgeByHandle: flow.removeEdgeByHandle,
          displayData: runner.displayData,
          computingNodes: runner.computingNodes,
          nodeErrors: runner.nodeErrors,
          activeEdges: runner.activeEdges,
          setInfoNodeId,
          deleteNode: flow.deleteNode,
          setCurrentView: flow.setCurrentView,
          setFullscreenImage,
          modelLoadingState: runner.modelLoadingState,
          executionTimes: runner.executionTimes,
          clearDisplayData: runner.clearDisplayData,
          resolveApproval: runner.resolveApproval,
          rejectApproval: runner.rejectApproval,
          pauseNode: runner.pauseNode,
          resumeNode: runner.resumeNode,
          stopNode: runner.stopNode,
        }),
        [
          flow.nodes, flow.edges, hoveredEdgeId, flow.updateNodeData,
          flow.removeEdgeByHandle, runner.displayData, runner.computingNodes,
          runner.nodeErrors, runner.activeEdges, flow.deleteNode,
          flow.setCurrentView, runner.modelLoadingState, runner.executionTimes,
          runner.clearDisplayData, runner.resolveApproval, runner.rejectApproval,
          runner.pauseNode, runner.resumeNode, runner.stopNode,
        ],
      )}
    >
      <div className="w-full h-screen flex flex-col bg-(--relax-bg-primary) font-sans overflow-hidden select-none text-(--relax-text-default)">
        <TopBar
          currentView={flow.currentView}
          setCurrentView={flow.setCurrentView}
          breadcrumbs={flow.breadcrumbs}
          runStatus={runner.runStatus}
          runFlow={handleRunFlow}
          stopFlow={runner.stopFlow}
          exportFlow={flow.exportFlow}
          openImport={() => setImportDialogOpen(true)}
          clearWorkflow={clearWorkflow}
          undo={undoRedo.undo}
          redo={undoRedo.redo}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          openSettings={() => setSettingsOpen(true)}
          openNodePicker={() => setNodePickerOpen(true)}
          validateWorkflow={handleValidate}
        />

        {/* REACT FLOW CANVAS */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={flow.visibleNodes}
            edges={flow.visibleEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodesDelete={flow.onNodesDelete}
            onConnect={handleConnect}
            onNodeDoubleClick={(_event, node) =>
              node.type === "macroNode" && flow.setCurrentView(node.id)
            }
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onPaneContextMenu={handlePaneContextMenu as any}
            onPaneClick={() => setContextMenu(null)}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 50, y: 50, zoom: 1 }}
          >
            <Background
              color="var(--relax-text-muted)"
              gap={30}
              variant={BackgroundVariant.Dots}
            />
            <Controls
              showInteractive={false}
              className="bg-(--relax-bg-elevated)! border! border-(--relax-border)! rounded-lg! overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)] [&>button]:border-0! [&>button]:border-b! [&>button]:border-solid! [&>button]:border-b-(--relax-border)! [&>button]:bg-transparent! [&>button]:fill-(--relax-text-muted)! [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:bg-(--relax-border)! [&>button:hover]:fill-(--relax-accent)! [&>button:last-child]:border-b-0!"
            />
            {showMiniMap && (
              <MiniMap
                nodeColor={(n) =>
                  runner.computingNodes.has(n.id)
                    ? "#00e5ff"
                    : n.type === "macroNode"
                      ? "#00e5ff"
                      : "#3f4b59"
                }
                maskColor="rgba(0, 0, 0, 0.7)"
                className="bg-(--relax-bg-elevated)! border! border-(--relax-border)! rounded-lg!"
              />
            )}
          </ReactFlow>

          {/* MiniMap toggle — icon button matching zoom controls style */}
          <button
            onClick={() => setShowMiniMap((v) => !v)}
            className="absolute bottom-25 left-3.75 z-20 w-6.5 h-6.5 flex items-center justify-center bg-(--relax-bg-elevated) border border-(--relax-border) rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-all duration-200 hover:bg-(--relax-border) group/map"
            title={showMiniMap ? "Hide MiniMap" : "Show MiniMap"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-colors duration-200 group-hover/map:fill-(--relax-accent) ${showMiniMap ? "fill-(--relax-accent)" : "fill-(--relax-text-muted)"}`}
              viewBox="0 0 24 24"
            >
              <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
            </svg>
          </button>
        </div>

        {/* CONTEXT MENU */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            currentView={flow.currentView}
            onSelect={handleAddNode}
          />
        )}

        {/* IMPORT DIALOG */}
        {importDialogOpen && (
          <ImportDialog
            onImport={handleImportFlow}
            onClose={() => setImportDialogOpen(false)}
          />
        )}

        {/* SETTINGS DIALOG */}
        {settingsOpen && (
          <SettingsDialog onClose={() => setSettingsOpen(false)} />
        )}

        {/* NODE PICKER PANEL */}
        {nodePickerOpen && (
          <NodePickerPanel
            currentView={flow.currentView}
            onSelect={handleAddNodeAtCenter}
            onClose={() => setNodePickerOpen(false)}
          />
        )}

        {/* INFO MODAL */}
        {infoNodeId && (
          <InfoModal nodeId={infoNodeId} onClose={() => setInfoNodeId(null)} />
        )}

        {/* FULLSCREEN IMAGE MODAL */}
        {fullscreenImage && (
          <FullscreenModal
            image={fullscreenImage}
            onClose={() => setFullscreenImage(null)}
          />
        )}

        {/* VALIDATION RESULTS */}
        {validationIssues !== null && (
          <div
            className="fixed inset-0 z-110 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setValidationIssues(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-xl shadow-2xl w-full max-w-md max-h-[60vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-(--relax-border)">
                <h2 className="text-white text-sm font-bold tracking-widest">
                  VALIDATION
                </h2>
                <button
                  onClick={() => setValidationIssues(null)}
                  className="text-(--relax-text-muted) hover:text-white transition-colors text-lg leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {validationIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-(--relax-success) text-lg mb-2">
                      &#10003;
                    </div>
                    <p className="text-(--relax-success) text-xs font-bold tracking-wider">
                      NO ISSUES FOUND
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {validationIssues.map((issue, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2 rounded border text-xs ${
                          issue.severity === "error"
                            ? "bg-red-500/10 border-red-500/30 text-red-400"
                            : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                        }`}
                      >
                        <span className="font-bold text-[9px] uppercase tracking-wider">
                          {issue.severity}
                        </span>
                        <span className="mx-1.5 opacity-40">|</span>
                        <span className="font-mono text-white/70">
                          {issue.nodeLabel}
                        </span>
                        <span className="mx-1.5 opacity-40">—</span>
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </RuntimeContext.Provider>
  );
}
