import { DEFAULTS } from "@/config/defaults.ts";
import { executeNode } from "@/engine/nodeExecutors.ts";
import type { FlowNode } from "@/types.ts";
import type { Edge } from "@xyflow/react";

interface GraphRunnerHooks {
  onNodeStart: (id: string) => void;
  onNodeEnd: (id: string) => void;
  onEdgeActive: (id: string) => void;
  onError: (id: string, msg: string) => void;
  onModelLoadStart?: (id: string) => void;
  onModelProgress?: (id: string, info: any) => void;
  onModelLoadEnd?: (id: string) => void;
}

export class GraphRunner {
  nodes: FlowNode[];
  edges: Edge[];
  setDisplayData: (nodeId: string, val: any, isStream: boolean) => void;
  setRunStatus: (status: string) => void;
  hooks: GraphRunnerHooks;
  expectedInputs: Record<string, Set<string>>;
  receivedInputs: Record<string, Record<string, any>>;
  isRunning: boolean;
  executionDelayMs: number;
  pendingApprovals: Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>;
  pausedNodes: Set<string>;
  stoppedNodes: Set<string>;
  pauseResolvers: Map<string, () => void>;

  constructor(
    nodes: FlowNode[],
    edges: Edge[],
    setDisplayData: (nodeId: string, val: any, isStream: boolean) => void,
    setRunStatus: (status: string) => void,
    hooks: GraphRunnerHooks,
    executionDelayMs?: number,
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.setDisplayData = setDisplayData;
    this.setRunStatus = setRunStatus;
    this.hooks = hooks;
    this.expectedInputs = {};
    this.receivedInputs = {};
    this.isRunning = true;
    this.executionDelayMs = executionDelayMs ?? DEFAULTS.nodeExecutionDelayMs;
    this.pendingApprovals = new Map();
    this.pausedNodes = new Set();
    this.stoppedNodes = new Set();
    this.pauseResolvers = new Map();
  }

  pauseNode(nodeId: string) {
    this.pausedNodes.add(nodeId);
  }

  resumeNode(nodeId: string) {
    this.pausedNodes.delete(nodeId);
    const resolver = this.pauseResolvers.get(nodeId);
    if (resolver) {
      this.pauseResolvers.delete(nodeId);
      resolver();
    }
  }

  stopNode(nodeId: string) {
    this.stoppedNodes.add(nodeId);
    // Also unblock if paused so the loop can exit
    this.pausedNodes.delete(nodeId);
    const resolver = this.pauseResolvers.get(nodeId);
    if (resolver) {
      this.pauseResolvers.delete(nodeId);
      resolver();
    }
  }

  /** Awaits until the node is unpaused. Returns false if stopped. */
  async waitIfPaused(nodeId: string): Promise<boolean> {
    if (this.stoppedNodes.has(nodeId)) return false;
    if (!this.pausedNodes.has(nodeId)) return true;
    await new Promise<void>((resolve) => {
      this.pauseResolvers.set(nodeId, resolve);
    });
    return !this.stoppedNodes.has(nodeId);
  }

  async start() {
    this.setRunStatus("RUNNING...");
    this.edges.forEach((e) => {
      let tId = e.target;
      let tHandle = e.targetHandle!;
      const tNode = this.nodes.find((n) => n.id === tId);
      if (tNode?.type === "macroNode") {
        const mIn = this.nodes.find(
          (n) =>
            n.macroId === tId &&
            n.type === "macroInEdge" &&
            n.data.param === tHandle,
        );
        if (mIn) {
          tId = mIn.id;
          tHandle = "in";
        }
      }
      if (!this.expectedInputs[tId]) this.expectedInputs[tId] = new Set();
      this.expectedInputs[tId]!.add(tHandle);
    });

    for (const n of this.nodes) {
      if (!this.expectedInputs[n.id] || this.expectedInputs[n.id]!.size === 0)
        this.executeNode(n.id);
    }
  }

  pushValue(
    sourceId: string,
    sourceHandle: string,
    value: any,
    isStream = false,
  ): Promise<void>[] {
    if (!this.isRunning) return [];
    let sId = sourceId;
    let sHandle = sourceHandle;
    const sourceNode = this.nodes.find((n) => n.id === sId);

    if (sourceNode?.type === "macroOutput") {
      sId = sourceNode.macroId!;
      sHandle = sourceNode.data.param;
    }

    const outgoingEdges = this.edges.filter(
      (e) => e.source === sId && e.sourceHandle === sHandle,
    );

    const promises: Promise<void>[] = [];

    outgoingEdges.forEach((e) => {
      this.hooks.onEdgeActive(e.id);
      let tId = e.target;
      let tHandle = e.targetHandle!;
      const targetNode = this.nodes.find((n) => n.id === tId);

      if (targetNode?.type === "macroNode") {
        const mIn = this.nodes.find(
          (n) =>
            n.macroId === tId &&
            n.type === "macroInEdge" &&
            n.data.param === tHandle,
        );
        if (mIn) {
          tId = mIn.id;
          tHandle = "in";
        }
      }

      if (!this.receivedInputs[tId]) this.receivedInputs[tId] = {};
      this.receivedInputs[tId]![tHandle] = value;

      const expected = this.expectedInputs[tId];
      if (
        expected &&
        Object.keys(this.receivedInputs[tId]!).length >= expected.size
      ) {
        if (isStream) {
          promises.push(this.executeNode(tId, isStream));
        } else {
          setTimeout(() => {
            if (this.isRunning) this.executeNode(tId, isStream);
          }, this.executionDelayMs);
        }
      }
    });

    return promises;
  }

  async executeNode(nodeId: string, isStream = false) {
    if (!this.isRunning) return;
    this.hooks.onNodeStart(nodeId);

    // Yield to browser to paint computing animation before potentially blocking inference
    await new Promise((r) => setTimeout(r, 0));

    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const inputs = { ...(this.receivedInputs[nodeId] || {}) };

    try {
      await executeNode(node, inputs, this, isStream);
    } catch (err: any) {
      console.error(`Error in node ${node.id}:`, err);
      if (node.type === "outputText")
        this.setDisplayData(node.id, `Error: ${err.message}`, false);
      this.hooks.onError(nodeId, err.message);
      this.setRunStatus("ERROR");
    } finally {
      this.hooks.onNodeEnd(nodeId);
    }
  }

  stop() {
    this.isRunning = false;
  }
}
