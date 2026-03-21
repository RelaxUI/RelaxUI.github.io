import { readSetting } from "@/hooks/useSettings.ts";
import type { FlowNode } from "@/types.ts";
import type { Edge } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Snapshot {
  nodes: FlowNode[];
  edges: Edge[];
}

export function useUndoRedo(
  getNodes: () => FlowNode[],
  getEdges: () => Edge[],
  setNodes: (nodes: FlowNode[]) => void,
  setEdges: (edges: Edge[]) => void,
  maxHistorySize?: number,
) {
  const [historyIndex, setHistoryIndex] = useState(-1);
  const history = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplying = useRef(false);

  // Prune history when maxHistorySize setting decreases
  useEffect(() => {
    if (maxHistorySize == null) return;
    if (history.current.length > maxHistorySize) {
      const excess = history.current.length - maxHistorySize;
      history.current = history.current.slice(excess);
      setHistoryIndex((idx) => Math.max(0, idx - excess));
    }
  }, [maxHistorySize]);

  const takeSnapshot = useCallback(() => {
    if (isApplying.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const snap: Snapshot = {
        nodes: JSON.parse(JSON.stringify(getNodes())),
        edges: JSON.parse(JSON.stringify(getEdges())),
      };
      const maxHistory = maxHistorySize ?? readSetting("undoHistorySize");
      const idx = historyIndexRef.current + 1;
      history.current = [...history.current.slice(0, idx), snap].slice(
        -maxHistory,
      );
      setHistoryIndex(history.current.length - 1);
    }, 500);
  }, [getNodes, getEdges, maxHistorySize]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    const snap = history.current[idx];
    if (!snap) return;
    isApplying.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setHistoryIndex(idx);
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => {
      isApplying.current = false;
    }, 100);
  }, [historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex >= history.current.length - 1) return;
    const idx = historyIndex + 1;
    const snap = history.current[idx];
    if (!snap) return;
    isApplying.current = true;
    setNodes(snap.nodes);
    setEdges(snap.edges);
    setHistoryIndex(idx);
    if (applyTimer.current) clearTimeout(applyTimer.current);
    applyTimer.current = setTimeout(() => {
      isApplying.current = false;
    }, 100);
  }, [historyIndex, setNodes, setEdges]);

  return {
    takeSnapshot,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.current.length - 1,
  };
}
