import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const wavespeedImageEdit: MacroDefinition = {
  label: "Wavespeed",
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
        data: {
          label: "Wavespeed",
          key: "",
          model: "bytedance/seedream-v5.0-lite/edit",
        },
      },
      // [1] key param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 50 },
        data: { param: "key" },
      },
      // [2] WAVESPEED_KEY from app settings
      {
        id: generateId("n"),
        type: "macroInSettings",
        macroId: mId,
        position: { x: 50, y: 190 },
        data: { param: "WAVESPEED_KEY" },
      },
      // [3] key resolver — param overrides settings
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 280, y: 60 },
        data: {
          script: "return in1 || in2;",
          inputs: ["in1", "in2"],
        },
      },
      // [4] model param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 330 },
        data: { param: "model" },
      },
      // [5] extra_params edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 470 },
        data: { param: "extra_params" },
      },
      // [6] prompt edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 610 },
        data: { param: "prompt" },
      },
      // [7] image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 750 },
        data: { param: "image" },
      },
      // [8] URL builder — constructs URL from model param
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 330 },
        data: {
          script: 'return "https://api.wavespeed.ai/api/v3/" + in1;',
          inputs: ["in1"],
        },
      },
      // [9] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 650, y: 60 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [10] body script — merges prompt, image, extra_params
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 650, y: 400 },
        data: {
          script: `const extra = JSON.parse(in3 || "{}");
const body = {
  images: [in2],
  prompt: in1,
  seed: -1,
  output_format: "png",
  ...extra
};
return JSON.stringify(body);`,
          inputs: ["in1", "in2", "in3"],
        },
      },
      // [11] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 1000, y: 60 },
        data: { value: "POST", label: "Method" },
      },
      // [12] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1270, y: 140 },
        data: {},
      },
      // [13] extract request id
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 60 },
        data: { path: "data.id" },
      },
      // [14] extract result URL (data.urls.get)
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 300 },
        data: { path: "data.urls.get" },
      },
      // [15] pollUntil
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1830, y: 60 },
        data: {
          interval: 2000,
          statusPath: "data.status",
          doneValue: "completed",
          failValue: "failed",
        },
      },
      // [16] extract image URL
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2140, y: 120 },
        data: { path: "data.outputs.0" },
      },
      // [17] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2410, y: 120 },
        data: { param: "image" },
      },
      // [18] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2410, y: 360 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key param → resolver in1
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[3]!.id, targetHandle: "in1" },
      // WAVESPEED_KEY settings → resolver in2
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[3]!.id, targetHandle: "in2" },
      // resolver → headers script
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[9]!.id, targetHandle: "in1" },
      // model param → URL builder
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "in1" },
      // prompt → body in1
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "in1" },
      // image → body in2
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "in2" },
      // extra_params → body in3
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "in3" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[11]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "method" },
      // URL builder → httpRequest
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "body" },
      // httpRequest → extract request id
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "json" },
      // httpRequest → extract result URL
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "json" },
      // result URL → pollUntil url
      { id: generateId("e"), source: nodes[14]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "url" },
      // headers → pollUntil
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "headers" },
      // pollUntil → extract image
      { id: generateId("e"), source: nodes[15]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "json" },
      // image → macroOutput
      { id: generateId("e"), source: nodes[16]!.id, sourceHandle: "out", target: nodes[17]!.id, targetHandle: "in" },
      // request_id → macroOutput
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[18]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};

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
        data: {
          label: "Wavespeed Head Swap",
          key: "",
          model: "wavespeed-ai/video-head-swap",
        },
      },
      // [1] key param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "key" },
      },
      // [2] model param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 220 },
        data: { param: "model" },
      },
      // [3] extra_params edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 360 },
        data: { param: "extra_params" },
      },
      // [4] video edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 500 },
        data: { param: "video" },
      },
      // [5] face_image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 640 },
        data: { param: "face_image" },
      },
      // [6] URL builder
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 220 },
        data: {
          script: 'return "https://api.wavespeed.ai/api/v3/" + in1;',
          inputs: ["in1"],
        },
      },
      // [7] headers script
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
      // [8] body script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 450 },
        data: {
          script: `const extra = JSON.parse(in3 || "{}");
return JSON.stringify({
  video: in1,
  face_image: in2,
  ...extra
});`,
          inputs: ["in1", "in2", "in3"],
        },
      },
      // [9] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 700, y: 80 },
        data: { value: "POST", label: "Method" },
      },
      // [10] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1000, y: 200 },
        data: {},
      },
      // [11] extract request id
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1300, y: 100 },
        data: { path: "data.id" },
      },
      // [12] extract result URL
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1300, y: 350 },
        data: { path: "data.urls.get" },
      },
      // [13] pollUntil
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1600, y: 100 },
        data: {
          interval: 2000,
          statusPath: "data.status",
          doneValue: "completed",
          failValue: "failed",
        },
      },
      // [14] extract video URL
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1950, y: 100 },
        data: { path: "data.outputs.0" },
      },
      // [15] macroOutput video
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2250, y: 100 },
        data: { param: "video" },
      },
      // [16] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2250, y: 350 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key → headers
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[7]!.id, targetHandle: "in1" },
      // model → URL builder
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[6]!.id, targetHandle: "in1" },
      // video → body in1
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "in1" },
      // face_image → body in2
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "in2" },
      // extra_params → body in3
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[8]!.id, targetHandle: "in3" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "method" },
      // URL builder → httpRequest
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[10]!.id, targetHandle: "body" },
      // httpRequest → extract request id
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[11]!.id, targetHandle: "json" },
      // httpRequest → extract result URL
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "json" },
      // result URL → pollUntil url
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "url" },
      // headers → pollUntil
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "headers" },
      // pollUntil → extract video
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "json" },
      // video → macroOutput
      { id: generateId("e"), source: nodes[14]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "in" },
      // request_id → macroOutput
      { id: generateId("e"), source: nodes[11]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
