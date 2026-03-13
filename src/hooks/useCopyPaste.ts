import type { FlowNode } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";
import { useCallback, useRef } from "react";

interface Clipboard {
  nodes: FlowNode[];
  edges: Edge[];
}

export function useCopyPaste(
  getNodes: () => FlowNode[],
  getEdges: () => Edge[],
  addNodes: (nodes: FlowNode[]) => void,
  addEdges: (edges: Edge[]) => void,
) {
  const clipboard = useRef<Clipboard | null>(null);

  const copy = useCallback(() => {
    const nodes = getNodes();
    const selectedNodes = nodes.filter((n: any) => n.selected);
    if (selectedNodes.length === 0) return;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // Also include macro children
    const macroChildren = nodes.filter(
      (n) => n.macroId && selectedIds.has(n.macroId),
    );
    macroChildren.forEach((n) => selectedIds.add(n.id));

    const allNodesToClip = nodes.filter((n) => selectedIds.has(n.id));

    // Get internal edges
    const edges = getEdges();
    const internalEdges = edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );

    clipboard.current = {
      nodes: JSON.parse(JSON.stringify(allNodesToClip)),
      edges: JSON.parse(JSON.stringify(internalEdges)),
    };
  }, [getNodes, getEdges]);

  const paste = useCallback(() => {
    if (!clipboard.current) return;

    const idMap = new Map<string, string>();
    const { nodes: clipNodes, edges: clipEdges } = clipboard.current;

    // Generate new IDs
    for (const n of clipNodes) {
      idMap.set(n.id, generateId("node"));
    }

    const offset = 50;
    const newNodes: FlowNode[] = clipNodes.map((n) => ({
      ...n,
      id: idMap.get(n.id)!,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      selected: true,
      macroId: n.macroId ? idMap.get(n.macroId) || n.macroId : n.macroId,
    }));

    const newEdges: Edge[] = clipEdges.map((e) => ({
      ...e,
      id: generateId("e"),
      source: idMap.get(e.source) || e.source,
      target: idMap.get(e.target) || e.target,
    }));

    addNodes(newNodes);
    addEdges(newEdges);
  }, [addNodes, addEdges]);

  return { copy, paste };
}
