import { PIPELINE_TASKS } from "@/config/pipelineRegistry.ts";
import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

function createPipelineMacro(taskName: string): MacroDefinition {
  const taskDef = PIPELINE_TASKS[taskName]!;

  return {
    label: `${taskDef.label}`,
    category: taskDef.category,
    create: (pos, parentMacroId) => {
      const mId = generateId("macro");
      const nodes: FlowNode[] = [];
      const edges: Edge[] = [];

      // 1. Macro shell
      nodes.push({
        id: mId,
        type: "macroNode",
        position: pos,
        macroId: parentMacroId,
        data: {
          label: taskDef.label,
          model_id: taskDef.defaultModel,
        },
      });

      // 2. macroInParam for model_id
      const modelParamId = generateId("n");
      nodes.push({
        id: modelParamId,
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "model_id" },
      });

      // 3. macroInEdge for each required input
      let yOffset = 220;
      const inputEdgeIds: string[] = [];
      taskDef.inputs.forEach((inp) => {
        const inEdgeId = generateId("n");
        inputEdgeIds.push(inEdgeId);
        nodes.push({
          id: inEdgeId,
          type: "macroInEdge",
          macroId: mId,
          position: { x: 50, y: yOffset },
          data: { param: inp.id },
        });
        yOffset += 140;
      });

      // 4. macroConnections node
      nodes.push({
        id: generateId("n"),
        type: "macroConnections",
        macroId: mId,
        position: { x: 50, y: yOffset },
        data: {},
      });

      // 5. Internal PipelineNode
      const pipelineNodeId = generateId("n");
      nodes.push({
        id: pipelineNodeId,
        type: "transformersPipeline",
        macroId: mId,
        position: { x: 400, y: 200 },
        data: {
          task: taskName,
          model_id: "",
          device: "wasm",
        },
      });

      // 6. macroOutput for each output
      taskDef.outputs.forEach((out, i) => {
        const outId = generateId("n");
        nodes.push({
          id: outId,
          type: "macroOutput",
          macroId: mId,
          position: { x: 750, y: 180 + i * 140 },
          data: { param: out.id },
        });
        edges.push({
          id: generateId("e"),
          source: pipelineNodeId,
          sourceHandle: out.id,
          target: outId,
          targetHandle: "in",
        });
      });

      // 7. Wire model_id param to pipeline
      edges.push({
        id: generateId("e"),
        source: modelParamId,
        sourceHandle: "out",
        target: pipelineNodeId,
        targetHandle: "model_id",
      });

      // 8. Wire each input edge to pipeline
      inputEdgeIds.forEach((inId, i) => {
        edges.push({
          id: generateId("e"),
          source: inId,
          sourceHandle: "out",
          target: pipelineNodeId,
          targetHandle: taskDef.inputs[i]!.id,
        });
      });

      return { nodes, edges };
    },
  };
}

export const PIPELINE_MACROS: Record<string, MacroDefinition> = {};
for (const taskName of Object.keys(PIPELINE_TASKS)) {
  PIPELINE_MACROS[`pipeline_${taskName}`] = createPipelineMacro(taskName);
}
