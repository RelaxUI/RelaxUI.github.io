import { DEFAULTS } from "@/config/defaults.ts";
import { executeNode } from "@/engine/nodeExecutors.ts";
import { readSetting } from "@/hooks/useSettings.ts";
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

interface PendingEntry {
  triggerHandle: string;
  snapshot: Record<string, any>;
  cancelled?: boolean;
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
  resumedBeforeWait: Set<string>;
  pauseResolvers: Map<string, () => void>;
  _aggregatorLists: Map<string, any[]>;
  _counterValues: Map<string, number>;
  private _pendingExecutions: number;
  private _pendingTimers: number;
  private _hasError: boolean;
  private _liveNodesRef: { current: FlowNode[] } | null;
  private _pendingExec: Map<string, PendingEntry>;

  /** O(1) node lookup by ID (snapshot nodes) */
  private _nodeMap: Map<string, FlowNode>;
  /** O(1) outgoing edges by "sourceId:sourceHandle" */
  private _outEdges: Map<string, Edge[]>;
  /** Active rework cascades — prevents premature completion */
  private _activeReworks: number;
  /** Nodes whose executors are handling a rework cascade — pushValue stores data but skips execution triggers */
  _reworkingNodes: Set<string>;
  /** Debug logging enabled via Settings > Debug mode */
  private _debug: boolean;

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
    this.resumedBeforeWait = new Set();
    this.pauseResolvers = new Map();
    this._aggregatorLists = new Map();
    this._counterValues = new Map();
    this._pendingExecutions = 0;
    this._pendingTimers = 0;
    this._hasError = false;
    this._liveNodesRef = null;
    this._pendingExec = new Map();
    this._activeReworks = 0;
    this._reworkingNodes = new Set();
    this._debug = readSetting("debugMode");

    // Build node lookup map
    this._nodeMap = new Map();
    for (const n of nodes) {
      this._nodeMap.set(n.id, n);
    }

    // Build outgoing edge adjacency map
    this._outEdges = new Map();
    for (const e of edges) {
      const key = `${e.source}:${e.sourceHandle}`;
      let list = this._outEdges.get(key);
      if (!list) {
        list = [];
        this._outEdges.set(key, list);
      }
      list.push(e);
    }
  }

  setLiveNodesRef(ref: { current: FlowNode[] }) {
    this._liveNodesRef = ref;
  }

  /** O(1) node lookup from snapshot */
  getNode(nodeId: string): FlowNode | undefined {
    return this._nodeMap.get(nodeId);
  }

  /** Get the latest version of a node, preferring live React state over snapshot */
  getLiveNode(nodeId: string): FlowNode | undefined {
    if (this._liveNodesRef) {
      const live = this._liveNodesRef.current.find((n) => n.id === nodeId);
      if (live) return live;
    }
    return this._nodeMap.get(nodeId);
  }

  /** O(1) outgoing edges lookup */
  getOutgoingEdges(sourceId: string, sourceHandle: string): Edge[] {
    return this._outEdges.get(`${sourceId}:${sourceHandle}`) || [];
  }

  /** Debug log helper — only outputs when debug mode is on */
  _log(tag: string, ...args: any[]) {
    if (this._debug) console.debug(`[RelaxUI:${tag}]`, ...args);
  }

  /** Track rework cascades to prevent premature completion */
  beginRework() {
    this._activeReworks++;
    this._log("rework", "begin", `active=${this._activeReworks}`);
  }
  endRework() {
    this._activeReworks = Math.max(0, this._activeReworks - 1);
    this._log("rework", "end", `active=${this._activeReworks}`);
  }

  /** Wait for all pending executions and timers from a rework cascade to settle. */
  async waitForCascade(): Promise<void> {
    this._log("cascade", "waiting...", { pendingExec: this._pendingExecutions, pendingTimers: this._pendingTimers });
    const start = Date.now();
    while (this.isRunning && Date.now() - start < 300_000) {
      await new Promise((r) => setTimeout(r, 100));
      if (this._pendingTimers <= 0 && this._pendingExecutions <= 1) break;
    }
    this._log("cascade", `settled in ${Date.now() - start}ms`);
  }

  /** Cancel a pending coalesced execution; the timer still fires but skips executeNode. */
  cancelPendingExec(nodeId: string) {
    const entry = this._pendingExec.get(nodeId);
    if (entry) {
      entry.cancelled = true;
      this._pendingExec.delete(nodeId);
    }
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
    } else {
      // Resume arrived before waitIfPaused — mark so it won't block
      this.resumedBeforeWait.add(nodeId);
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
    if (!this.pausedNodes.has(nodeId)) {
      // Check if resume arrived before we got here — consume it
      this.resumedBeforeWait.delete(nodeId);
      return true;
    }
    // If resume already arrived before this wait, don't block
    if (this.resumedBeforeWait.has(nodeId)) {
      this.resumedBeforeWait.delete(nodeId);
      return !this.stoppedNodes.has(nodeId);
    }
    await new Promise<void>((resolve) => {
      this.pauseResolvers.set(nodeId, resolve);
    });
    return !this.stoppedNodes.has(nodeId);
  }

  async start() {
    this._log("start", `nodes=${this.nodes.length} edges=${this.edges.length}`);
    this.setRunStatus("RUNNING...");
    this.edges.forEach((e) => {
      let tId = e.target;
      let tHandle = e.targetHandle!;
      const tNode = this._nodeMap.get(tId);
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

    const roots: string[] = [];
    for (const n of this.nodes) {
      if (!this.expectedInputs[n.id] || this.expectedInputs[n.id]!.size === 0) {
        roots.push(n.id);
        this.executeNode(n.id);
      }
    }
    this._log("start", "root nodes:", roots.map((id) => ({ id, type: this._nodeMap.get(id)?.type })));

    // If no nodes were queued, complete immediately
    this._checkCompletion();
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
    const sourceNode = this._nodeMap.get(sId);

    if (sourceNode?.type === "macroOutput") {
      sId = sourceNode.macroId!;
      sHandle = sourceNode.data.param;
    }

    const outgoingEdges = this.getOutgoingEdges(sId, sHandle);
    const promises: Promise<void>[] = [];

    outgoingEdges.forEach((e) => {
      this.hooks.onEdgeActive(e.id);
      let tId = e.target;
      let tHandle = e.targetHandle!;
      const targetNode = this._nodeMap.get(tId);

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
      const received = Object.keys(this.receivedInputs[tId]!).length;
      this._log("push", `${sourceId}:${sourceHandle} → ${tId}:${tHandle}`, isStream ? "(stream)" : "", `[${received}/${expected?.size ?? "?"}]`);
      if (
        expected &&
        received >= expected.size
      ) {
        // Node is handling its own rework cascade — data is stored but skip execution
        if (this._reworkingNodes.has(tId)) {
          this._log("push", `skip exec for reworking node ${tId}`);
          return;
        }

        const snapshot = { ...this.receivedInputs[tId]! };

        if (isStream) {
          // Stream: execute immediately, no coalescing needed
          promises.push(this.executeNode(tId, isStream, snapshot));
        } else {
          const pending = this._pendingExec.get(tId);
          if (pending && pending.triggerHandle !== tHandle) {
            // A different handle updated an already-scheduled execution.
            // Update its snapshot so execution uses the latest values.
            pending.snapshot = snapshot;
          } else {
            // New execution: either no pending, or same handle pushing again
            // (e.g. two InputImages → same handle need independent executions)
            const entry: PendingEntry = { triggerHandle: tHandle, snapshot };
            this._pendingExec.set(tId, entry);
            this._pendingTimers++;
            promises.push(new Promise<void>((resolve) => {
              setTimeout(async () => {
                this._pendingTimers--;
                // Clean up if this is still the current pending entry
                if (this._pendingExec.get(tId) === entry) {
                  this._pendingExec.delete(tId);
                }
                if (this.isRunning && !entry.cancelled) {
                  // Use entry.snapshot which may have been updated by later pushes
                  await this.executeNode(tId, isStream, entry.snapshot);
                } else {
                  this._checkCompletion();
                }
                resolve();
              }, this.executionDelayMs);
            }));
          }
        }
      }
    });

    return promises;
  }

  async executeNode(nodeId: string, isStream = false, inputsOverride?: Record<string, any>) {
    if (!this.isRunning) return;
    this._pendingExecutions++;
    this.hooks.onNodeStart(nodeId);

    // Yield to browser to paint computing animation before potentially blocking inference
    await new Promise((r) => setTimeout(r, 0));

    const node = this.getLiveNode(nodeId);
    if (!node) {
      this._pendingExecutions--;
      this._checkCompletion();
      return;
    }
    const inputs = inputsOverride ?? { ...(this.receivedInputs[nodeId] || {}) };
    this._log("exec", `${node.type}[${nodeId}]`, isStream ? "(stream)" : "", { inputs: Object.keys(inputs) });

    try {
      await executeNode(node, inputs, this, isStream);
    } catch (err: any) {
      // Extract a meaningful message from various error types
      let message: string;
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      } else if (err instanceof Event) {
        // e.g. img.onerror rejects with an Event object
        const target = err.target as HTMLElement | null;
        const tag = target?.tagName ?? "unknown";
        const src = (target as any)?.src ?? "";
        message = `${tag.toLowerCase()} load failed${src ? `: ${src.slice(0, 120)}` : ""}`;
      } else if (err && typeof err === "object") {
        message = err.message ?? JSON.stringify(err).slice(0, 200);
      } else {
        message = String(err);
      }

      // Structured log with truncated inputs for debugging
      const truncatedInputs: Record<string, any> = {};
      for (const [k, v] of Object.entries(inputs)) {
        const s = typeof v === "string" ? v : JSON.stringify(v) ?? "";
        truncatedInputs[k] = s.length > 100 ? s.slice(0, 100) + "..." : v;
      }
      console.error(
        `[RelaxUI] Node error: ${message}`,
        { nodeType: node.type, nodeId: node.id, macroId: node.macroId ?? null, inputs: truncatedInputs, error: err },
      );

      if (node.type === "outputText")
        this.setDisplayData(node.id, `Error: ${message}`, false);
      this.hooks.onError(nodeId, message);
      this._hasError = true;
    } finally {
      this.hooks.onNodeEnd(nodeId);
      this._pendingExecutions--;
      this._checkCompletion();
    }
  }

  private _checkCompletion() {
    if (
      this._pendingExecutions <= 0 &&
      this._pendingTimers <= 0 &&
      this._activeReworks <= 0 &&
      this.isRunning
    ) {
      const status = this._hasError ? "ERROR" : "COMPLETED";
      this._log("done", status);
      this.setRunStatus(status);
    }
  }

  stop() {
    this.isRunning = false;

    // Resolve all pending approvals so executors can unwind gracefully
    for (const [id, entry] of this.pendingApprovals) {
      entry.resolve({ action: "stop" });
    }
    this.pendingApprovals.clear();

    // Unblock any paused nodes
    for (const [id, resolver] of this.pauseResolvers) {
      resolver();
    }
    this.pauseResolvers.clear();
    this.pausedNodes.clear();
  }
}
