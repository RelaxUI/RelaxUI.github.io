import { getDefaultDevice } from "@/config/defaults.ts";
import { NODE_DIMENSIONS } from "@/config/nodeDimensions.ts";
import { readSetting } from "@/hooks/useSettings.ts";
import { PREBUILT_MACROS } from "@/macros/macroFactory.ts";
import type { FlowNode } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "relaxui_autosave_v1";

function getDefaultGraph() {
  const textId = generateId("n");
  const imageId = generateId("n");
  const textOutId = generateId("n");
  const imgOutId = generateId("n");
  const macroObj = PREBUILT_MACROS.openRouter!.create({ x: 450, y: 200 }, null);

  const baseNodes: FlowNode[] = [
    {
      id: textId,
      type: "inputText",
      position: { x: 80, y: 150 },
      data: { value: "Change the image, add a red balloon", label: "Text" },
      macroId: null,
    },
    {
      id: imageId,
      type: "inputImage",
      position: { x: 80, y: 350 },
      data: {
        value:
          "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg/1280px-Tokyo_Shibuya_Scramble_Crossing_2018-10-09.jpg",
        label: "Image",
      },
      macroId: null,
    },
    {
      id: textOutId,
      type: "outputText",
      position: { x: 850, y: 100 },
      data: { label: "Response Text" },
      macroId: null,
    },
    {
      id: imgOutId,
      type: "outputImage",
      position: { x: 850, y: 400 },
      data: { label: "Generated Image" },
      macroId: null,
    },
  ];

  const baseEdges = [
    {
      id: generateId("e"),
      source: textId,
      sourceHandle: "out",
      target: macroObj.nodes[0]!.id,
      targetHandle: "text",
    },
    {
      id: generateId("e"),
      source: imageId,
      sourceHandle: "out",
      target: macroObj.nodes[0]!.id,
      targetHandle: "image",
    },
    {
      id: generateId("e"),
      source: macroObj.nodes[0]!.id,
      sourceHandle: "image",
      target: imgOutId,
      targetHandle: "in2",
    },
    {
      id: generateId("e"),
      source: imageId,
      sourceHandle: "out",
      target: imgOutId,
      targetHandle: "in1",
    },
  ];

  return {
    nodes: [...baseNodes, ...macroObj.nodes],
    edges: [...baseEdges, ...macroObj.edges],
  };
}

function getInitialData() {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse local storage cache", e);
  }
  return getDefaultGraph();
}

const defaultData = getInitialData();

export function useFlowState() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultData.edges);
  const [currentView, setCurrentView] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();

  // Auto-save — strip large runtime data (base64 files, blobs) to avoid exceeding localStorage quota
  useEffect(() => {
    const debounceMs = readSetting("autoSaveDebounceMs");
    const timer = setTimeout(() => {
      const savedNodes = nodes.map((n: any) => {
        const data = { ...n.data };
        // Strip large transient values that are re-loaded at runtime
        if (n.type === "folderInput") {
          delete data.value;
          delete data.fileMeta;
          delete data.count;
        }
        // Strip any data URL values over 64KB (images, audio, video loaded from file inputs)
        for (const key of Object.keys(data)) {
          if (typeof data[key] === "string" && data[key].length > 65536 && data[key].startsWith("data:")) {
            delete data[key];
          }
        }
        return { ...n, data };
      });
      const flow = {
        nodes: savedNodes,
        edges,
        viewport: reactFlowInstance
          ? reactFlowInstance.getViewport()
          : { x: 0, y: 0, zoom: 1 },
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flow));
      } catch {
        // Still too large — clear and retry with minimal data
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [nodes, edges, reactFlowInstance]);

  // Fit view when entering/exiting macro views
  useEffect(() => {
    // Small delay to let React Flow update visible nodes before fitting
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.15, duration: 200 });
    }, 50);
    return () => clearTimeout(timer);
  }, [currentView, reactFlowInstance]);

  // Breadcrumbs
  const breadcrumbs: FlowNode[] = [];
  let currId = currentView;
  while (currId) {
    const node = nodes.find((n: any) => n.id === currId);
    if (!node) break;
    breadcrumbs.unshift(node as FlowNode);
    currId = (node as any).macroId;
  }

  const updateNodeData = useCallback(
    (id: string, key: string, value: any) => {
      setNodes((nds: any[]) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n,
        ),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      const nodesToDelete = reactFlowInstance
        .getNodes()
        .filter((n: any) => n.id === id || n.macroId === id);
      reactFlowInstance.deleteElements({ nodes: nodesToDelete });
    },
    [reactFlowInstance],
  );

  const removeEdgeByHandle = useCallback(
    (nodeId: string, handleId: string) => {
      const edgesToDelete = reactFlowInstance
        .getEdges()
        .filter(
          (e) =>
            (e.source === nodeId && e.sourceHandle === handleId) ||
            (e.target === nodeId && e.targetHandle === handleId),
        );
      reactFlowInstance.deleteElements({ edges: edgesToDelete });
    },
    [reactFlowInstance],
  );

  const exportFlow = useCallback(() => {
    const flow = {
      version: 1,
      nodes,
      edges,
      viewport: reactFlowInstance
        ? reactFlowInstance.getViewport()
        : { x: 0, y: 0, zoom: 1 },
    };
    const blob = new Blob([JSON.stringify(flow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dataflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, reactFlowInstance]);

  const importFlow = useCallback(
    (flow: { nodes: any[]; edges: any[]; viewport?: any }) => {
      setNodes(flow.nodes);
      setEdges(flow.edges || []);
      setCurrentView(null);
      setTimeout(() => {
        if (flow.viewport) reactFlowInstance.setViewport(flow.viewport);
        else reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    },
    [setNodes, setEdges, reactFlowInstance],
  );

  const onNodesDelete = useCallback(
    (deleted: any[]) => {
      const childrenToDelete = reactFlowInstance
        .getNodes()
        .filter((n: any) => deleted.some((d) => n.macroId === d.id));
      if (childrenToDelete.length > 0)
        setTimeout(
          () => reactFlowInstance.deleteElements({ nodes: childrenToDelete }),
          0,
        );
    },
    [reactFlowInstance],
  );

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      if (PREBUILT_MACROS[type]) {
        const { nodes: mNodes, edges: mEdges } = PREBUILT_MACROS[type]!.create(
          position,
          currentView,
        );
        setNodes((nds: any[]) => [...nds, ...mNodes]);
        setEdges((eds: any[]) => [...eds, ...mEdges]);
      } else {
        const dims = NODE_DIMENSIONS[type];
        const newNode: FlowNode = {
          id: generateId("node"),
          type,
          position,
          macroId: currentView,
          data: {
            label: dims?.title || type,
            value: "",
            path: "",
            param: "param",
            script: type === "customScript" ? "return in1;" : "",
            inputs: type === "customScript" ? ["in1", "in2"] : undefined,
            task:
              type === "transformersPipeline"
                ? "text-classification"
                : undefined,
            model_id: "",
            device: getDefaultDevice(),
            modelClass:
              type === "transformersModelLoader" ? "AutoModel" : undefined,
          },
        };
        setNodes((nds: any[]) => [...nds, newNode]);
      }
    },
    [currentView, setNodes, setEdges],
  );

  const handleNodesChange = useCallback(
    (changes: any) => setNodes((nds: any[]) => applyNodeChanges(changes, nds)),
    [setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: any) => setEdges((eds: any[]) => applyEdgeChanges(changes, eds)),
    [setEdges],
  );

  const handleConnect = useCallback(
    (params: any) => setEdges((eds: any[]) => addEdge(params, eds)),
    [setEdges],
  );

  const activeView = currentView || null;
  // Build a Set of node IDs in the active view for O(1) edge filtering
  const viewNodeIds = new Set<string>();
  const visibleNodes = [];
  for (const n of nodes as any[]) {
    if ((n.macroId || null) === activeView) {
      viewNodeIds.add(n.id);
      visibleNodes.push(n.dragHandle ? n : { ...n, dragHandle: ".custom-drag-handle" });
    }
  }
  const visibleEdges = edges.filter(
    (e) => viewNodeIds.has(e.source) && viewNodeIds.has(e.target),
  );

  return {
    nodes: nodes as FlowNode[],
    edges,
    setNodes,
    setEdges,
    currentView,
    setCurrentView,
    breadcrumbs,
    updateNodeData,
    deleteNode,
    removeEdgeByHandle,
    exportFlow,
    importFlow,
    onNodesDelete,
    addNode,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    visibleNodes,
    visibleEdges,
    reactFlowInstance,
  };
}
