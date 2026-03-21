import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const falai: MacroDefinition = {
  label: "fal.ai",
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
          label: "fal.ai",
          key: "",
          model: "fal-ai/bytedance/seedream/v5/lite/edit",
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
      // [2] FAL_KEY from app settings
      {
        id: generateId("n"),
        type: "macroInSettings",
        macroId: mId,
        position: { x: 50, y: 190 },
        data: { param: "FAL_KEY" },
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
      // [7] image_url edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 750 },
        data: { param: "image_url" },
      },
      // [8] converter — blob/url → data URI for fal.ai
      {
        id: generateId("n"),
        type: "converter",
        macroId: mId,
        position: { x: 350, y: 720 },
        data: { outputFormat: "dataURI" },
      },
      // [9] URL builder script — constructs URL from model param
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 330 },
        data: {
          script: 'return "https://queue.fal.run/" + in1;',
          inputs: ["in1"],
        },
      },
      // [10] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 650, y: 60 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Key " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [11] body script — merges prompt, image, extra_params
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 650, y: 400 },
        data: {
          script: `const img = new Image();
await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = in2; });
const extra = JSON.parse(in3 || "{}");
const body = {
  prompt: in1,
  image_urls: [in2],
  image_size: { width: img.naturalWidth, height: img.naturalHeight },
  max_images: 1,
  enable_safety_checker: false,
  ...extra
};
return JSON.stringify(body);`,
          inputs: ["in1", "in2", "in3"],
        },
      },
      // [12] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 1000, y: 60 },
        data: { value: "POST", label: "Method" },
      },
      // [13] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1270, y: 140 },
        data: {},
      },
      // [14] extract status_url
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 80 },
        data: { path: "status_url" },
      },
      // [15] extract response_url
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 220 },
        data: { path: "response_url" },
      },
      // [16] extract request_id
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 360 },
        data: { path: "request_id" },
      },
      // [17] pollUntil
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1830, y: 60 },
        data: {
          interval: 2000,
          statusPath: "status",
          doneValue: "COMPLETED",
          failValue: "FAILED",
        },
      },
      // [18] extract image URL from result
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2140, y: 120 },
        data: { path: "images.0.url" },
      },
      // [19] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2410, y: 120 },
        data: { param: "image" },
      },
      // [20] macroOutput request_id
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
      {
        id: generateId("e"),
        source: nodes[1]!.id,
        sourceHandle: "out",
        target: nodes[3]!.id,
        targetHandle: "in1",
      },
      // FAL_KEY settings → resolver in2
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
        target: nodes[10]!.id,
        targetHandle: "in1",
      },
      // model param → URL builder
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "in1",
      },
      // image_url → converter
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "in",
      },
      // prompt → body in1
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "in1",
      },
      // converter → body in2 (data URI)
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "in2",
      },
      // extra_params → body in3
      {
        id: generateId("e"),
        source: nodes[5]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "in3",
      },
      // method → httpRequest
      {
        id: generateId("e"),
        source: nodes[12]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "method",
      },
      // URL builder → httpRequest
      {
        id: generateId("e"),
        source: nodes[9]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "url",
      },
      // headers → httpRequest
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "headers",
      },
      // body → httpRequest
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "body",
      },
      // httpRequest → extract status_url
      {
        id: generateId("e"),
        source: nodes[13]!.id,
        sourceHandle: "out",
        target: nodes[14]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract response_url
      {
        id: generateId("e"),
        source: nodes[13]!.id,
        sourceHandle: "out",
        target: nodes[15]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract request_id
      {
        id: generateId("e"),
        source: nodes[13]!.id,
        sourceHandle: "out",
        target: nodes[16]!.id,
        targetHandle: "json",
      },
      // status_url → pollUntil url
      {
        id: generateId("e"),
        source: nodes[14]!.id,
        sourceHandle: "out",
        target: nodes[17]!.id,
        targetHandle: "url",
      },
      // headers → pollUntil
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[17]!.id,
        targetHandle: "headers",
      },
      // response_url → pollUntil resultUrl
      {
        id: generateId("e"),
        source: nodes[15]!.id,
        sourceHandle: "out",
        target: nodes[17]!.id,
        targetHandle: "resultUrl",
      },
      // pollUntil → extract image
      {
        id: generateId("e"),
        source: nodes[17]!.id,
        sourceHandle: "out",
        target: nodes[18]!.id,
        targetHandle: "json",
      },
      // image → macroOutput
      {
        id: generateId("e"),
        source: nodes[18]!.id,
        sourceHandle: "out",
        target: nodes[19]!.id,
        targetHandle: "in",
      },
      // request_id → macroOutput
      {
        id: generateId("e"),
        source: nodes[16]!.id,
        sourceHandle: "out",
        target: nodes[20]!.id,
        targetHandle: "in",
      },
    ];

    return { nodes, edges };
  },
};
