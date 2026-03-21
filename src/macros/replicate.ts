import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const replicate: MacroDefinition = {
  label: "Replicate",
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
          label: "Replicate",
          key: "",
          model: "bytedance/seedream-5-lite",
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
      // [2] REPLICATE_KEY from app settings
      {
        id: generateId("n"),
        type: "macroInSettings",
        macroId: mId,
        position: { x: 50, y: 190 },
        data: { param: "REPLICATE_KEY" },
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
          script:
            'return "https://api.replicate.com/v1/models/" + in1 + "/predictions";',
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
          script: `return JSON.stringify({
  "Authorization": "Bearer " + in1,
  "Content-Type": "application/json",
  "Prefer": "wait"
});`,
          inputs: ["in1"],
        },
      },
      // [10] body script — merges edge inputs with extra_params
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 650, y: 400 },
        data: {
          script: `const extra = JSON.parse(in3 || "{}");
const input = { ...extra };
if (in1) input.prompt = in1;
if (in2) input.image = in2;
return JSON.stringify({ input });`,
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
      // [12] httpRequest
      {
        id: generateId("n"),
        type: "httpRequest",
        macroId: mId,
        position: { x: 1270, y: 140 },
        data: {},
      },
      // [13] extract status — checks if response is already complete
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 1560, y: 60 },
        data: {
          script: `const resp = typeof in1 === "string" ? JSON.parse(in1) : in1;
if (resp.status === "succeeded") return JSON.stringify(resp);
const getUrl = resp.urls && resp.urls.get;
if (!getUrl) return JSON.stringify(resp);
return "";`,
          inputs: ["in1"],
        },
      },
      // [14] extract urls.get for polling
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 300 },
        data: { path: "urls.get" },
      },
      // [15] extract request id
      {
        id: generateId("n"),
        type: "jsonPath",
        macroId: mId,
        position: { x: 1560, y: 500 },
        data: { path: "id" },
      },
      // [16] pollUntil — polls urls.get until succeeded/failed
      {
        id: generateId("n"),
        type: "pollUntil",
        macroId: mId,
        position: { x: 1830, y: 200 },
        data: {
          interval: 3000,
          statusPath: "status",
          doneValue: "succeeded",
          failValue: "failed",
        },
      },
      // [17] result selector — picks sync response or poll result, extracts output
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 2140, y: 120 },
        data: {
          script: `const sync = in1 ? (typeof in1 === "string" ? JSON.parse(in1) : in1) : null;
const poll = in2 ? (typeof in2 === "string" ? JSON.parse(in2) : in2) : null;
const result = (sync && sync.status === "succeeded") ? sync : poll;
if (!result) return null;
return result.output;`,
          inputs: ["in1", "in2"],
        },
      },
      // [18] macroOutput result
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2410, y: 120 },
        data: { param: "result" },
      },
      // [19] macroOutput request_id
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 2410, y: 500 },
        data: { param: "request_id" },
      },
    ];

    const edges: Edge[] = [
      // key param → resolver in1
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[3]!.id, targetHandle: "in1" },
      // REPLICATE_KEY settings → resolver in2
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
      // httpRequest → status checker in1
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[13]!.id, targetHandle: "in1" },
      // httpRequest → extract urls.get
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[14]!.id, targetHandle: "json" },
      // httpRequest → extract request id
      { id: generateId("e"), source: nodes[12]!.id, sourceHandle: "out", target: nodes[15]!.id, targetHandle: "json" },
      // urls.get → pollUntil url
      { id: generateId("e"), source: nodes[14]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "url" },
      // headers → pollUntil
      { id: generateId("e"), source: nodes[9]!.id, sourceHandle: "out", target: nodes[16]!.id, targetHandle: "headers" },
      // status checker (sync result) → result selector in1
      { id: generateId("e"), source: nodes[13]!.id, sourceHandle: "out", target: nodes[17]!.id, targetHandle: "in1" },
      // pollUntil → result selector in2
      { id: generateId("e"), source: nodes[16]!.id, sourceHandle: "out", target: nodes[17]!.id, targetHandle: "in2" },
      // result selector → macroOutput result
      { id: generateId("e"), source: nodes[17]!.id, sourceHandle: "out", target: nodes[18]!.id, targetHandle: "in" },
      // request_id → macroOutput
      { id: generateId("e"), source: nodes[15]!.id, sourceHandle: "out", target: nodes[19]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
