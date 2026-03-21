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
      // [1] key param (user can type key directly on macro node)
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
      // [4] prompt edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 380 },
        data: { param: "prompt" },
      },
      // [5] image_url edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 520 },
        data: { param: "image_url" },
      },
      // [6] converter — blob/url → data URI for fal.ai
      {
        id: generateId("n"),
        type: "converter",
        macroId: mId,
        position: { x: 280, y: 490 },
        data: { outputFormat: "dataURI" },
      },
      // [7] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 590, y: 60 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Key " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [8] body script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 590, y: 340 },
        data: {
          script:
            'const img = new Image();\nawait new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = in2; });\nreturn JSON.stringify({\n  prompt: in1,\n  image_urls: [in2],\n  image_size: { width: img.naturalWidth, height: img.naturalHeight },\n  negative_prompt: "low resolution, error, worst quality, low quality, deformed",\n  enable_prompt_expansion: false,\n  enable_safety_checker: false,\n  safety_tolerance: "5",\n  num_images: 1,\n  output_format: "jpeg"\n});',
          inputs: ["in1", "in2"],
        },
      },
      // [9] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 900, y: 60 },
        data: { value: "POST", label: "Method" },
      },
      // [10] submit URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 900, y: 250 },
        data: {
          value: "https://queue.fal.run/fal-ai/bytedance/seedream/v5/lite/edit",
          label: "Submit URL",
        },
      },
      // [11] httpRequest (submit)
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1170, y: 140 },
        data: {},
      },
      // [12] extract status_url
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1460, y: 80 },
        data: { path: "status_url" },
      },
      // [13] extract response_url
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1460, y: 220 },
        data: { path: "response_url" },
      },
      // [14] extract request_id
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1460, y: 360 },
        data: { path: "request_id" },
      },
      // [15] pollUntil
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1730, y: 60 },
        data: {
          interval: 2000,
          statusPath: "status",
          doneValue: "COMPLETED",
          failValue: "FAILED",
        },
      },
      // [16] extract image URL from result
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 2040, y: 120 },
        data: { path: "images.0.url" },
      },
      // [17] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2310, y: 120 },
        data: { param: "image" },
      },
      // [18] macroOutput request_id
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
        target: nodes[7]!.id,
        targetHandle: "in1",
      },
      // image_url → converter
      {
        id: generateId("e"),
        source: nodes[5]!.id,
        sourceHandle: "out",
        target: nodes[6]!.id,
        targetHandle: "in",
      },
      // prompt → body
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "in1",
      },
      // converter → body (data URI)
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "in2",
      },
      // method → httpRequest
      {
        id: generateId("e"),
        source: nodes[9]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "method",
      },
      // URL → httpRequest
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "url",
      },
      // headers → httpRequest
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "headers",
      },
      // body → httpRequest
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "body",
      },
      // httpRequest → extract status_url
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[12]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract response_url
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "json",
      },
      // httpRequest → extract request_id
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[14]!.id,
        targetHandle: "json",
      },
      // status_url → pollUntil url
      {
        id: generateId("e"),
        source: nodes[12]!.id,
        sourceHandle: "out",
        target: nodes[15]!.id,
        targetHandle: "url",
      },
      // headers → pollUntil
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[15]!.id,
        targetHandle: "headers",
      },
      // response_url → pollUntil resultUrl
      {
        id: generateId("e"),
        source: nodes[13]!.id,
        sourceHandle: "out",
        target: nodes[15]!.id,
        targetHandle: "resultUrl",
      },
      // pollUntil → extract image
      {
        id: generateId("e"),
        source: nodes[15]!.id,
        sourceHandle: "out",
        target: nodes[16]!.id,
        targetHandle: "json",
      },
      // image → macroOutput
      {
        id: generateId("e"),
        source: nodes[16]!.id,
        sourceHandle: "out",
        target: nodes[17]!.id,
        targetHandle: "in",
      },
      // request_id → macroOutput
      {
        id: generateId("e"),
        source: nodes[14]!.id,
        sourceHandle: "out",
        target: nodes[18]!.id,
        targetHandle: "in",
      },
    ];

    return { nodes, edges };
  },
};
