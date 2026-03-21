import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const openRouter: MacroDefinition = {
  label: "OpenRouter API",
  category: "API",
  create: (pos, parentMacroId) => {
    const mId = generateId("macro");
    const nodes: FlowNode[] = [
      {
        id: mId,
        type: "macroNode",
        position: pos,
        macroId: parentMacroId,
        data: {
          label: "OpenRouter API",
          key: "",
          model: "x-ai/grok-4.1-fast",
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
      // [2] OPENROUTER_KEY from app settings
      {
        id: generateId("n"),
        type: "macroInSettings",
        macroId: mId,
        position: { x: 50, y: 190 },
        data: { param: "OPENROUTER_KEY" },
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
      // [6] text edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 610 },
        data: { param: "text" },
      },
      // [7] image edge
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 750 },
        data: { param: "image" },
      },
      // [8] macroConnections
      {
        id: generateId("n"),
        type: "macroConnections",
        macroId: mId,
        position: { x: 50, y: 890 },
        data: {},
      },
      // [9] method
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 450, y: 60 },
        data: { value: "POST", label: "Method" },
      },
      // [10] URL
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 450, y: 250 },
        data: {
          value: "https://openrouter.ai/api/v1/chat/completions",
          label: "URL",
        },
      },
      // [11] headers script
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 450, y: 440 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      // [12] body script — reads model, text, image, connections, extra_params
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 450, y: 710 },
        data: {
          script: `const extra = JSON.parse(in5 || "{}");
const payload = {
  model: in1,
  modalities: in4 && in4.length > 0 ? in4 : ["text"],
  stream: true,
  messages: [{
    role: "user",
    content: in2 ? [
      { type: "text", text: in3 },
      { type: "image_url", image_url: { url: in2 } }
    ] : [{ type: "text", text: in3 }]
  }],
  ...extra
};
return JSON.stringify(payload);`,
          inputs: ["in1", "in2", "in3", "in4", "in5"],
        },
      },
      // [13] httpRequest
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 850, y: 300 },
        data: {},
      },
      // [14] extract text
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1150, y: 180 },
        data: { path: "choices.0.delta.content" },
      },
      // [15] extract image
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1150, y: 450 },
        data: { path: "choices.0.delta.images.0.image_url.url" },
      },
      // [16] macroOutput text
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1450, y: 180 },
        data: { param: "text" },
      },
      // [17] macroOutput image
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1450, y: 450 },
        data: { param: "image" },
      },
    ];

    const edges: Edge[] = [
      // key param → resolver in1
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[3]!.id, targetHandle: "in1" },
      // OPENROUTER_KEY settings → resolver in2
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[3]!.id, targetHandle: "in2" },
      // resolver → headers script
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[11]!.id, targetHandle: "in1" },
      // model → body in1
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "in1" },
      // image → body in2
      { id: generateId("e"), source: nodes[7]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "in2" },
      // text → body in3
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "in3" },
      // connections → body in4
      { id: generateId("e"), source: nodes[8]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "in4" },
      // extra_params → body in5
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[12]!.id, targetHandle: "in5" },
      // method → httpRequest
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "method" },
      // URL → httpRequest
      { id: generateId("e"), source: nodes[10]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "url" },
      // headers → httpRequest
      { id: generateId("e"), source: nodes[11]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "headers" },
      // body → httpRequest
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "body" },
      // httpRequest → extract text
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "json" },
      // httpRequest → extract image
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "json" },
      // text → macroOutput
      { id: generateId("e"), source: nodes[14]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "in" },
      // image → macroOutput
      { id: generateId("e"), source: nodes[15]!.id, sourceHandle: "out", target: nodes[17]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
