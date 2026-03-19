import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const falai: MacroDefinition = {
  label: "fal.ai Image Edit",
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
        data: { label: "fal.ai Image Edit", key: "" },
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
      // [3] image_url edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 360 },
        data: { param: "image_url" },
      },
      // [4] converter — blob/url → data URI for fal.ai
      {
        id: generateId("n"),
        type: "converter",
        macroId: mId,
        position: { x: 200, y: 360 },
        data: { outputFormat: "dataURI" },
      },
      // [5] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 80 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Key " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [6] body script (no inline conversion — Converter handles it)
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 350 },
        data: {
          script:
            'return JSON.stringify({\n  prompt: in1,\n  image_urls: [in2],\n  negative_prompt: "low resolution, error, worst quality, low quality, deformed",\n  enable_prompt_expansion: false,\n  enable_safety_checker: false,\n  num_images: 1,\n  output_format: "jpeg"\n});',
          inputs: ["in1", "in2"],
        },
      },
      // [7] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 750, y: 80 },
        data: { value: "POST", label: "Method" },
      },
      // [8] submit URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 750, y: 240 },
        data: {
          value: "https://queue.fal.run/fal-ai/qwen-image-2/edit",
          label: "Submit URL",
        },
      },
      // [9] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1050, y: 200 },
        data: {},
      },
      // [10] extract status_url from submit response
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1350, y: 100 },
        data: { path: "status_url" },
      },
      // [11] extract response_url from submit response
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1350, y: 250 },
        data: { path: "response_url" },
      },
      // [12] extract request_id from submit response
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1350, y: 400 },
        data: { path: "request_id" },
      },
      // [13] pollUntil
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1700, y: 100 },
        data: {
          interval: 2000,
          statusPath: "status",
          doneValue: "COMPLETED",
          failValue: "FAILED",
        },
      },
      // [14] extract image URL from result
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2050, y: 100 },
        data: { path: "images.0.url" },
      },
      // [15] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2350, y: 100 },
        data: { param: "image" },
      },
      // [16] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2350, y: 350 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key → headers
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in1" },
      // image_url → converter
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[4]!.id, targetHandle: "in" },
      // prompt → body
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[6]!.id, targetHandle: "in1" },
      // converter → body (data URI)
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[6]!.id, targetHandle: "in2" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "method" },
      // URL → httpRequest
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "body" },
      // httpRequest → extract status_url
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "json" },
      // httpRequest → extract response_url
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[11]!.id, targetHandle: "json" },
      // httpRequest → extract request_id
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "json" },
      // status_url → pollUntil url
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "url" },
      // headers → pollUntil
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "headers" },
      // response_url → pollUntil resultUrl
      { id: generateId("e"), source: nodes[11]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "resultUrl" },
      // pollUntil → extract image
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "json" },
      // image → macroOutput
      { id: generateId("e"), source: nodes[14]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "in" },
      // request_id → macroOutput
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
