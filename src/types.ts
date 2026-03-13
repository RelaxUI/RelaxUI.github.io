import type { Edge, Node } from "@xyflow/react";

export interface NodeDimension {
  w: number;
  h: number;
  title: string;
  sub: string;
}

export interface NodeInfo {
  desc: string;
  in: string;
  out: string;
}

export interface HandleDef {
  id: string;
  label: string;
  offsetY: number;
}

export interface NodeHandles {
  sources: HandleDef[];
  targets: HandleDef[];
}

export interface MacroDefinition {
  label: string;
  category?: string;
  create: (
    pos: { x: number; y: number },
    parentMacroId: string | null,
  ) => {
    nodes: FlowNode[];
    edges: Edge[];
  };
}

export interface FlowNode extends Node {
  macroId?: string | null;
  data: Record<string, any>;
}

export interface PipelineInput {
  id: string;
  label: string;
  type: "string" | "image" | "audio" | "array" | "json" | "boolean" | "number";
  required?: boolean;
}

export interface PipelineOutput {
  id: string;
  label: string;
  type: "json" | "string" | "image" | "audio" | "tensor";
}

export type VisualizationType =
  | "bar-chart"
  | "highlighted-text"
  | "highlighted-answer"
  | "side-by-side"
  | "bounding-boxes"
  | "segmentation-mask"
  | "tensor-info"
  | "transcript"
  | "image-caption"
  | "raw-json";

export interface PipelineTaskDef {
  label: string;
  category: string;
  description: string;
  defaultModel: string;
  inputs: PipelineInput[];
  optionalInputs?: PipelineInput[];
  outputs: PipelineOutput[];
  executionOptions?: Record<string, any>;
  visualization?: VisualizationType;
}

export interface ModelClassDef {
  label: string;
  category: string;
  description: string;
  executionModes: ("call" | "generate")[];
  callOutputs?: string[];
  generateOutputs?: string[];
  companionLoaders: ("AutoTokenizer" | "AutoProcessor")[];
  requiresProcessor?: boolean;
  suggestedDtype?: Record<string, string>;
}

export interface ParamSchema {
  type: "number" | "boolean" | "dropdown" | "string";
  default: any;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface ModelLoadingStatus {
  status: "loading" | "ready" | "error";
  progress?: {
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
    status?: string;
  } | null;
  error?: string;
}

export interface RuntimeContextValue {
  globalNodes: FlowNode[];
  globalEdges: Edge[];
  hoveredEdgeId: string | null;
  setHoveredEdgeId: (id: string | null) => void;
  updateNodeData: (id: string, key: string, value: any) => void;
  removeEdgeByHandle: (nodeId: string, handleId: string) => void;
  displayData: Record<string, any>;
  computingNodes: Set<string>;
  nodeErrors: Record<string, string>;
  activeEdges: Map<
    string,
    { ts: number; timer: ReturnType<typeof setTimeout> }
  >;
  setInfoNodeId: (id: string | null) => void;
  deleteNode: (id: string) => void;
  setCurrentView: (id: string | null) => void;
  setFullscreenImage: (img: any) => void;
  modelLoadingState: Record<string, ModelLoadingStatus>;
  executionTimes: Record<string, number>;
}
