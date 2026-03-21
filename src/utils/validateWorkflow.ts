import type { FlowNode } from "@/types.ts";
import type { Edge } from "@xyflow/react";

export interface ValidationIssue {
  nodeId: string;
  nodeLabel: string;
  severity: "error" | "warning";
  message: string;
}

const NODES_NEEDING_MODEL = new Set([
  "transformersPipeline",
  "transformersModelLoader",
  "transformersTokenizerLoader",
  "transformersProcessorLoader",
]);

export function validateWorkflow(
  nodes: FlowNode[],
  edges: Edge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const connectedNodeIds = new Set<string>();

  for (const e of edges) {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  }

  for (const node of nodes) {
    const label = node.data.label || node.type || node.id;

    // Skip comment nodes and macro internals that are inside macros
    if (node.type === "commentNode") continue;

    // Disconnected nodes (no edges at all)
    if (!connectedNodeIds.has(node.id) && nodes.length > 1) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        severity: "warning",
        message: "Node is disconnected (no edges)",
      });
    }

    // Nodes that need a model_id but don't have one set
    if (NODES_NEEDING_MODEL.has(node.type || "")) {
      if (!node.data.model_id) {
        issues.push({
          nodeId: node.id,
          nodeLabel: label,
          severity: "error",
          message: "Missing model ID",
        });
      }
    }

    // Pipeline nodes without a task selected
    if (node.type === "transformersPipeline" && !node.data.task) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        severity: "error",
        message: "No pipeline task selected",
      });
    }

    // Input nodes with empty values
    if (
      (node.type === "inputText" || node.type === "inputImage") &&
      !node.data.value
    ) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        severity: "warning",
        message: "Input value is empty",
      });
    }

    // Custom script nodes with empty script
    if (node.type === "customScript" && !node.data.script?.trim()) {
      issues.push({
        nodeId: node.id,
        nodeLabel: label,
        severity: "warning",
        message: "Script is empty",
      });
    }
  }

  return issues;
}
