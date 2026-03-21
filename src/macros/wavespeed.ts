import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const wavespeedImageEdit: MacroDefinition = {
  label: "Wavespeed Image Edit",
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
        data: { label: "Wavespeed Image Edit", key: "" },
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
      // [4] prompt edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 380 },
        data: { param: "prompt" },
      },
      // [5] image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 520 },
        data: { param: "image" },
      },
      // [6] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 590, y: 60 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [7] body script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 590, y: 340 },
        data: {
          script:
            'return JSON.stringify({\n  images: [in2],\n  prompt: in1,\n  seed: -1,\n  output_format: "png",\n  enable_base64_output: false,\n  enable_sync_mode: false\n});',
          inputs: ["in1", "in2"],
        },
      },
      // [8] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 900, y: 60 },
        data: { value: "POST", label: "Method" },
      },
      // [9] submit URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 900, y: 250 },
        data: {
          value:
            "https://api.wavespeed.ai/api/v3/bytedance/seedream-v5.0-lite/edit",
          label: "Submit URL",
        },
      },
      // [10] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1170, y: 140 },
        data: {},
      },
      // [11] extract request id — response: { code, data: { id, urls: { get }, ... } }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1460, y: 60 },
        data: { path: "data.id" },
      },
      // [12] extract result URL (data.urls.get) — used as both poll and result URL
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1460, y: 300 },
        data: { path: "data.urls.get" },
      },
      // [13] pollUntil — polls result URL; response: { code, data: { status, outputs } }
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1730, y: 60 },
        data: {
          interval: 2000,
          statusPath: "data.status",
          doneValue: "completed",
          failValue: "failed",
        },
      },
      // [14] extract image URL — result: { code, data: { outputs: ["url"] } }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2040, y: 120 },
        data: { path: "data.outputs.0" },
      },
      // [15] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2310, y: 120 },
        data: { param: "image" },
      },
      // [16] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2310, y: 360 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key param → resolver in1
      {
        id: generateId("e"),
        source: nodes[1]!.id,
        sourceHandle: "out",
        target: nodes[3]!.id,
        targetHandle: "in1",
      },
      // WAVESPEED_KEY settings → resolver in2
      {
        id: generateId("e"),
        source: nodes[2]!.id,
        sourceHandle: "out",
        target: nodes[3]!.id,
        targetHandle: "in2",
      },
      // resolver → headers script
      {
        id: generateId("e"),
        source: nodes[3]!.id,
        sourceHandle: "out",
        target: nodes[6]!.id,
        targetHandle: "in1",
      },
      // prompt → body in1
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[7]!.id,
        targetHandle: "in1",
      },
      // image → body in2
      {
        id: generateId("e"),
        source: nodes[5]!.id,
        sourceHandle: "out",
        target: nodes[7]!.id,
        targetHandle: "in2",
      },
      // method → httpRequest
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "method",
      },
      // URL → httpRequest
      {
        id: generateId("e"),
        source: nodes[9]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "url",
      },
      // headers → httpRequest
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "headers",
      },
      // body → httpRequest
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "body",
      },
      // httpRequest → extract request id [11]
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract result URL [12]
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[12]!.id,
        targetHandle: "json",
      },
      // result URL → pollUntil url [13] (same URL for poll + result)
      {
        id: generateId("e"),
        source: nodes[12]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "url",
      },
      // headers → pollUntil [13]
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "headers",
      },
      // pollUntil → extract image [14]
      {
        id: generateId("e"),
        source: nodes[13]!.id,
        sourceHandle: "out",
        target: nodes[14]!.id,
        targetHandle: "json",
      },
      // image → macroOutput [15]
      {
        id: generateId("e"),
        source: nodes[14]!.id,
        sourceHandle: "out",
        target: nodes[15]!.id,
        targetHandle: "in",
      },
      // request_id → macroOutput [16]
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[16]!.id,
        targetHandle: "in",
      },
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
            "return JSON.stringify({\n  video: in1,\n  face_image: in2\n});",
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
        position: { x: 700, y: 260 },
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
      // [9] extract request id — response: { code, data: { id, status, urls: { get }, ... } }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1300, y: 100 },
        data: { path: "data.id" },
      },
      // [10] extract result URL (data.urls.get)
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1300, y: 350 },
        data: { path: "data.urls.get" },
      },
      // [11] pollUntil — polls result URL; response: { code, data: { status, outputs } }
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
      // [12] extract video URL — result: { code, data: { outputs: ["url"] } }
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1950, y: 100 },
        data: { path: "data.outputs.0" },
      },
      // [13] macroOutput video
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2250, y: 100 },
        data: { param: "video" },
      },
      // [14] macroOutput request_id
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
      {
        id: generateId("e"),
        source: nodes[1]!.id,
        sourceHandle: "out",
        target: nodes[4]!.id,
        targetHandle: "in1",
      },
      // video → body
      {
        id: generateId("e"),
        source: nodes[2]!.id,
        sourceHandle: "out",
        target: nodes[5]!.id,
        targetHandle: "in1",
      },
      // face_image → body
      {
        id: generateId("e"),
        source: nodes[3]!.id,
        sourceHandle: "out",
        target: nodes[5]!.id,
        targetHandle: "in2",
      },
      // method → httpRequest
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "method",
      },
      // URL → httpRequest
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "url",
      },
      // headers → httpRequest
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "headers",
      },
      // body → httpRequest
      {
        id: generateId("e"),
        source: nodes[5]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "body",
      },
      // httpRequest → extract request id [9]
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract result URL [10]
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "json",
      },
      // result URL → pollUntil url [11] (same URL for poll + result)
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "url",
      },
      // headers → pollUntil [11]
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "headers",
      },
      // pollUntil → extract video [12]
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[12]!.id,
        targetHandle: "json",
      },
      // video → macroOutput [13]
      {
        id: generateId("e"),
        source: nodes[12]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "in",
      },
      // request_id → macroOutput [14]
      {
        id: generateId("e"),
        source: nodes[9]!.id,
        sourceHandle: "out",
        target: nodes[14]!.id,
        targetHandle: "in",
      },
    ];

    return { nodes, edges };
  },
};
