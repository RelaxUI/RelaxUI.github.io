import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const replicate: MacroDefinition = {
  label: "Replicate I2V",
  category: "API",
  create: (pos, parentMacroId) => {
    const mId = generateId("macro");
    const nodes: FlowNode[] = [
      // [0] macroNode
      {
        id: mId,
        type: "macroNode",
        position: pos,
        macroId: parentMacroId,
        data: { label: "Replicate I2V", key: "" },
      },
      // [1] key param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "key" },
      },
      // [2] prompt edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 220 },
        data: { param: "prompt" },
      },
      // [3] image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 360 },
        data: { param: "image" },
      },
      // [4] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 80 },
        data: {
          script: `return JSON.stringify({
  "Authorization": "Bearer " + in1,
  "Content-Type": "application/json",
  "Prefer": "wait"
});`,
          inputs: ["in1"],
        },
      },
      // [5] body script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 350 },
        data: {
          script: `return JSON.stringify({
  input: {
    image: in2,
    prompt: in1,
    go_fast: true,
    num_frames: 81,
    resolution: "480p",
    sample_shift: 12,
    frames_per_second: 16
  }
});`,
          inputs: ["in1", "in2"],
        },
      },
      // [6] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 700, y: 80 },
        data: { value: "POST", label: "Method" },
      },
      // [7] URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 700, y: 240 },
        data: {
          value: "https://api.replicate.com/v1/models/wan-video/wan-2.2-i2v-fast/predictions",
          label: "URL",
        },
      },
      // [8] httpRequest
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1050, y: 200 },
        data: {},
      },
      // [9] jsonPath
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1350, y: 200 },
        data: { path: "output" },
      },
      // [10] macroOutput
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1650, y: 200 },
        data: { param: "video" },
      },
    ];

    const edges: Edge[] = [
      // key → headers
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[4]!.id, targetHandle: "in1" },
      // prompt → body in1
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in1" },
      // image → body in2
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in2" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "method" },
      // url → httpRequest
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "body" },
      // httpRequest → jsonPath
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "json" },
      // jsonPath → macroOutput
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
