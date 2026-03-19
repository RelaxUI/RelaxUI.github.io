import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const wavespeed: MacroDefinition = {
  label: "Wavespeed Head Swap",
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
        data: { label: "Wavespeed Head Swap", key: "" },
      },
      // [1] key param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "key" },
      },
      // [2] video edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 220 },
        data: { param: "video" },
      },
      // [3] face_image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 360 },
        data: { param: "face_image" },
      },
      // [4] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 80 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [5] body script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 350 },
        data: {
          script:
            'return JSON.stringify({\n  video: in1,\n  face_image: in2\n});',
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
      // [7] submit URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 700, y: 240 },
        data: {
          value: "https://api.wavespeed.ai/api/v3/wavespeed-ai/video-head-swap",
          label: "Submit URL",
        },
      },
      // [8] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1000, y: 200 },
        data: {},
      },
      // [9] extract request id — response: { "id": "...", "status": "pending" }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1300, y: 200 },
        data: { path: "id" },
      },
      // [10] build poll URL
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 1600, y: 100 },
        data: {
          script:
            'return "https://api.wavespeed.ai/api/v3/predictions/" + in1;',
          inputs: ["in1"],
        },
      },
      // [11] build result URL — separate /result endpoint per docs
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 1600, y: 300 },
        data: {
          script:
            'return "https://api.wavespeed.ai/api/v3/predictions/" + in1 + "/result";',
          inputs: ["in1"],
        },
      },
      // [12] pollUntil — status response: { "id": "...", "status": "processing" }
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1950, y: 150 },
        data: {
          interval: 2000,
          statusPath: "status",
          doneValue: "completed",
          failValue: "failed",
        },
      },
      // [13] extract video URL — result response: { "outputs": ["url"] }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2300, y: 100 },
        data: { path: "outputs.0" },
      },
      // [14] macroOutput video
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2600, y: 100 },
        data: { param: "video" },
      },
      // [15] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2600, y: 350 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key → headers
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[4]!.id, targetHandle: "in1" },
      // video → body
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in1" },
      // face_image → body
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in2" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "method" },
      // URL → httpRequest
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "body" },
      // httpRequest → extract request id
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "json" },
      // request id → build poll URL
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "in1" },
      // request id → build result URL
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[11]!.id, targetHandle: "in1" },
      // poll URL → pollUntil
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "url" },
      // headers → pollUntil
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "headers" },
      // result URL → pollUntil
      { id: generateId("e"), source: nodes[11]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "resultUrl" },
      // pollUntil → extract video
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "json" },
      // video → macroOutput
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "in" },
      // request_id → macroOutput
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
