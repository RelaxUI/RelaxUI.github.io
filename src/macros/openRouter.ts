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
          model: "black-forest-labs/flux.2-pro",
        },
      },
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "key" },
      },
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 220 },
        data: { param: "model" },
      },
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 360 },
        data: { param: "text" },
      },
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 500 },
        data: { param: "image" },
      },
      {
        id: generateId("n"),
        type: "macroConnections",
        macroId: mId,
        position: { x: 50, y: 640 },
        data: {},
      },
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 400, y: 80 },
        data: { value: "POST", label: "Method" },
      },
      {
        id: generateId("n"),
        type: "inputText",
        macroId: mId,
        position: { x: 400, y: 240 },
        data: {
          value: "https://openrouter.ai/api/v1/chat/completions",
          label: "URL",
        },
      },
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 400 },
        data: {
          script:
            'return JSON.stringify({\n  "Authorization": "Bearer " + in1,\n  "Content-Type": "application/json"\n});',
          inputs: ["in1"],
        },
      },
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 400, y: 650 },
        data: {
          script:
            'const payload = {\n  model: in1,\n  modalities: in4 && in4.length > 0 ? in4 : ["text"],\n  stream: true,\n  messages:[{\n    role: "user",\n    content: in2 ?[\n      { type: "text", text: in3 },\n      { type: "image_url", image_url: { url: in2 } }\n    ] :[{ type: "text", text: in3 }]\n  }]\n};\nreturn JSON.stringify(payload);',
          inputs: ["in1", "in2", "in3", "in4"],
        },
      },
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 750, y: 300 },
        data: {},
      },
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1050, y: 180 },
        data: { path: "choices.0.delta.content" },
      },
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1050, y: 450 },
        data: { path: "choices.0.delta.images.0.image_url.url" },
      },
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1350, y: 180 },
        data: { param: "text" },
      },
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1350, y: 450 },
        data: { param: "image" },
      },
    ];

    const edges: Edge[] = [
      {
        id: generateId("e"),
        source: nodes[1]!.id,
        sourceHandle: "out",
        target: nodes[8]!.id,
        targetHandle: "in1",
      },
      {
        id: generateId("e"),
        source: nodes[2]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "in1",
      },
      {
        id: generateId("e"),
        source: nodes[4]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "in2",
      },
      {
        id: generateId("e"),
        source: nodes[3]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "in3",
      },
      {
        id: generateId("e"),
        source: nodes[5]!.id,
        sourceHandle: "out",
        target: nodes[9]!.id,
        targetHandle: "in4",
      },
      {
        id: generateId("e"),
        source: nodes[6]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "method",
      },
      {
        id: generateId("e"),
        source: nodes[7]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "url",
      },
      {
        id: generateId("e"),
        source: nodes[8]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "headers",
      },
      {
        id: generateId("e"),
        source: nodes[9]!.id,
        sourceHandle: "out",
        target: nodes[10]!.id,
        targetHandle: "body",
      },
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[11]!.id,
        targetHandle: "json",
      },
      {
        id: generateId("e"),
        source: nodes[10]!.id,
        sourceHandle: "out",
        target: nodes[12]!.id,
        targetHandle: "json",
      },
      {
        id: generateId("e"),
        source: nodes[11]!.id,
        sourceHandle: "out",
        target: nodes[13]!.id,
        targetHandle: "in",
      },
      {
        id: generateId("e"),
        source: nodes[12]!.id,
        sourceHandle: "out",
        target: nodes[14]!.id,
        targetHandle: "in",
      },
    ];

    return { nodes, edges };
  },
};
