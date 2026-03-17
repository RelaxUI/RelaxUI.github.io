import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";

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
import { useUndoRedo } from "@/hooks/useUndoRedo.ts";
import { edgeTypes, nodeTypes } from "@/nodes/registry.ts";

export function FlowEditor() {
  const flow = useFlowState();
  const runner = useGraphRunner();

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

  // Undo/Redo
  const undoRedo = useUndoRedo(
    () => flow.nodes,
    () => flow.edges,
    (nodes) => flow.setNodes(nodes as any),
    (edges) => flow.setEdges(edges as any),
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
  }, [flow]);

  const resetToDefault = useCallback(() => {
    const d = flow.getDefaultGraph();
    flow.setNodes(d.nodes as any);
    flow.setEdges(d.edges as any);
  }, [flow]);

  return (
    <RuntimeContext.Provider
      value={{
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
      }}
    >
      <div className="w-full h-screen flex flex-col bg-[var(--relax-bg-primary)] font-sans overflow-hidden select-none text-[var(--relax-text-default)]">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
          .font-sans { font-family: 'Inter', sans-serif; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a323d; border-radius: 3px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f4b59; }
          @keyframes borderPulse {
              0% { border-color: rgba(0, 255, 170, 0.4); box-shadow: 0 0 15px rgba(0, 255, 170, 0.2); }
              50% { border-color: rgba(0, 255, 170, 1); box-shadow: 0 0 30px rgba(0, 255, 170, 0.5); }
              100% { border-color: rgba(0, 255, 170, 0.4); box-shadow: 0 0 15px rgba(0, 255, 170, 0.2); }
          }
          .computing-node { animation: borderPulse 1.5s infinite; border-color: #00e5ff !important; }
          .react-flow__node { cursor: default; }
          .custom-drag-handle { cursor: grab; }
          .custom-drag-handle:active { cursor: grabbing; }
          @keyframes dashMove { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
          .edge-dashed-animate { stroke-dasharray: 12 12; animation: dashMove 0.5s linear infinite; }
          .custom-handle { width: 12px !important; height: 12px !important; transition: all 0.2s ease; }
          .custom-handle:hover { width: 18px !important; height: 18px !important; }
          .react-flow__attribution { display: none; }
        `}</style>

        <TopBar
          currentView={flow.currentView}
          setCurrentView={flow.setCurrentView}
          breadcrumbs={flow.breadcrumbs}
          runStatus={runner.runStatus}
          runFlow={handleRunFlow}
          exportFlow={flow.exportFlow}
          openImport={() => setImportDialogOpen(true)}
          clearWorkflow={clearWorkflow}
          resetToDefault={resetToDefault}
          undo={undoRedo.undo}
          redo={undoRedo.redo}
          canUndo={undoRedo.canUndo}
          canRedo={undoRedo.canRedo}
          openSettings={() => setSettingsOpen(true)}
          openNodePicker={() => setNodePickerOpen(true)}
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
            <Background color="#1f2630" gap={40} />
            <Controls
              showInteractive={false}
              className="!bg-[#131820] !border !border-[#1f2630] !rounded-lg overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.5)] [&>button]:!border-0 [&>button]:!border-b [&>button]:!border-solid [&>button]:!border-b-[#1f2630] [&>button]:!bg-transparent [&>button]:!fill-[#5a6b7c] [&>button]:transition-all [&>button]:duration-200 [&>button:hover]:!bg-[#1f2630] [&>button:hover]:!fill-[#00e5ff] [&>button:last-child]:!border-b-0"
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
                className="!bg-[#131820] !border !border-[#1f2630] !rounded-lg"
              />
            )}
          </ReactFlow>

          {/* MiniMap toggle — icon button matching zoom controls style */}
          <button
            onClick={() => setShowMiniMap((v) => !v)}
            className="absolute bottom-[100px] left-[15px] z-20 w-[26px] h-[26px] flex items-center justify-center bg-[#131820] border border-[#1f2630] rounded-lg shadow-[0_4px_15px_rgba(0,0,0,0.5)] transition-all duration-200 hover:bg-[#1f2630] group/map"
            title={showMiniMap ? "Hide MiniMap" : "Show MiniMap"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-colors duration-200 group-hover/map:fill-[#00e5ff] ${showMiniMap ? "fill-[#00e5ff]" : "fill-[#5a6b7c]"}`}
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
          <SettingsDialog
            onClose={() => setSettingsOpen(false)}
            openImport={() => setImportDialogOpen(true)}
            exportFlow={flow.exportFlow}
            clearWorkflow={clearWorkflow}
            resetToDefault={resetToDefault}
          />
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
      </div>
    </RuntimeContext.Provider>
  );
}
