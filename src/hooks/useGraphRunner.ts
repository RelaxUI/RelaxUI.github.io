import { DEFAULTS } from "@/config/defaults.ts";
import { GraphRunner } from "@/engine/GraphRunner.ts";
import type { FlowNode, ModelLoadingStatus } from "@/types.ts";
import type { Edge } from "@xyflow/react";
import { useCallback, useRef, useState } from "react";

export function useGraphRunner() {
  const [displayData, setDisplayData] = useState<Record<string, any>>({});
  const [runStatus, setRunStatus] = useState("IDLE");
  const [computingNodes, setComputingNodes] = useState<Set<string>>(new Set());
  const [activeEdges, setActiveEdges] = useState<
    Map<string, { ts: number; timer: ReturnType<typeof setTimeout> }>
  >(new Map());
  const [nodeErrors, setNodeErrors] = useState<Record<string, string>>({});
  const [modelLoadingState, setModelLoadingState] = useState<
    Record<string, ModelLoadingStatus>
  >({});
  const [executionTimes, setExecutionTimes] = useState<Record<string, number>>(
    {},
  );

  const runnerRef = useRef<GraphRunner | null>(null);
  const nodeStartTimes = useRef<Record<string, number>>({});

  const clearDisplayData = useCallback((nodeId: string) => {
    setDisplayData((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
  }, []);

  const resolveApproval = useCallback((nodeId: string, value: any) => {
    runnerRef.current?.pendingApprovals?.get(nodeId)?.resolve(value);
  }, []);

  const rejectApproval = useCallback((nodeId: string) => {
    runnerRef.current?.pendingApprovals?.get(nodeId)?.reject({ action: "cancel" });
  }, []);

  const pauseNode = useCallback((nodeId: string) => {
    runnerRef.current?.pauseNode(nodeId);
  }, []);

  const resumeNode = useCallback((nodeId: string) => {
    runnerRef.current?.resumeNode(nodeId);
  }, []);

  const stopNode = useCallback((nodeId: string) => {
    runnerRef.current?.stopNode(nodeId);
  }, []);

  const triggerEdge = useCallback((id: string) => {
    setActiveEdges((prev) => {
      const next = new Map(prev);
      if (next.has(id)) clearTimeout(next.get(id)!.timer);
      next.set(id, {
        ts: Date.now(),
        timer: setTimeout(
          () =>
            setActiveEdges((p) => {
              const n = new Map(p);
              n.delete(id);
              return n;
            }),
          DEFAULTS.edgeAnimationMs,
        ),
      });
      return next;
    });
  }, []);

  const handleDisplayDataUpdate = useCallback(
    (nodeId: string, val: any, isStream: boolean) => {
      setDisplayData((prev) => ({
        ...prev,
        [nodeId]:
          isStream && typeof val === "string"
            ? (prev[nodeId] || "") + val
            : val,
      }));
    },
    [],
  );

  const runFlow = useCallback(
    (nodes: FlowNode[], edges: Edge[]) => {
      if (runnerRef.current) runnerRef.current.stop();
      setDisplayData({});
      setNodeErrors({});
      setComputingNodes(new Set());
      setActiveEdges(new Map());
      setExecutionTimes({});
      nodeStartTimes.current = {};

      const runner = new GraphRunner(
        nodes,
        edges,
        handleDisplayDataUpdate,
        setRunStatus,
        {
          onNodeStart: (id) => {
            nodeStartTimes.current[id] = Date.now();
            setComputingNodes((prev) => new Set(prev).add(id));
          },
          onNodeEnd: (id) => {
            const startTime = nodeStartTimes.current[id];
            if (startTime) {
              const elapsed = Date.now() - startTime;
              setExecutionTimes((prev) => ({ ...prev, [id]: elapsed }));
            }
            setComputingNodes((prev) => {
              const n = new Set(prev);
              n.delete(id);
              return n;
            });
          },
          onEdgeActive: triggerEdge,
          onError: (id, msg) => {
            setNodeErrors((prev) => ({ ...prev, [id]: msg }));
            setModelLoadingState((prev) => ({
              ...prev,
              [id]: { status: "error", error: msg },
            }));
          },
          onModelLoadStart: (id) =>
            setModelLoadingState((prev) => ({
              ...prev,
              [id]: { status: "loading", progress: null },
            })),
          onModelProgress: (id, info) =>
            setModelLoadingState((prev) => ({
              ...prev,
              [id]: { status: "loading", progress: info },
            })),
          onModelLoadEnd: (id) =>
            setModelLoadingState((prev) => ({
              ...prev,
              [id]: { status: "ready" },
            })),
        },
      );
      runnerRef.current = runner;
      runner.start();
    },
    [handleDisplayDataUpdate, triggerEdge],
  );

  return {
    displayData,
    runStatus,
    computingNodes,
    activeEdges,
    nodeErrors,
    modelLoadingState,
    executionTimes,
    runFlow,
    setDisplayData,
    setNodeErrors,
    clearDisplayData,
    resolveApproval,
    rejectApproval,
    pauseNode,
    resumeNode,
    stopNode,
    runnerRef,
  };
}
