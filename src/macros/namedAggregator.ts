import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

export const namedAggregator: MacroDefinition = {
  label: "Named Aggregator",
  category: "Utility",
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
          label: "Named Aggregator",
          folder: "",
          ext: ".jpg",
        },
      },
      // [1] folder param
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 50 },
        data: { param: "folder" },
      },
      // [2] ext param (file extension)
      {
        id: generateId("n"),
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 190 },
        data: { param: "ext" },
      },
      // [3] item edge (data to collect)
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 330 },
        data: { param: "item" },
      },
      // [4] counter edge (file name index)
      {
        id: generateId("n"),
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 470 },
        data: { param: "counter" },
      },
      // [5] textTemplate — builds "folder/counter.ext"
      {
        id: generateId("n"),
        type: "customScript",
        macroId: mId,
        position: { x: 350, y: 100 },
        data: {
          script: 'return in1 + "/" + in2 + in3;',
          inputs: ["in1", "in2", "in3"],
        },
      },
      // [6] listAggregator
      {
        id: generateId("n"),
        type: "listAggregator",
        macroId: mId,
        position: { x: 650, y: 200 },
        data: {},
      },
      // [7] macroOutput list
      {
        id: generateId("n"),
        type: "macroOutput",
        macroId: mId,
        position: { x: 1000, y: 250 },
        data: { param: "list" },
      },
    ];

    const edges: Edge[] = [
      // folder → script in1
      { id: generateId("e"), source: nodes[1]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in1" },
      // counter → script in2
      { id: generateId("e"), source: nodes[4]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in2" },
      // ext → script in3
      { id: generateId("e"), source: nodes[2]!.id, sourceHandle: "out", target: nodes[5]!.id, targetHandle: "in3" },
      // item → aggregator item
      { id: generateId("e"), source: nodes[3]!.id, sourceHandle: "out", target: nodes[6]!.id, targetHandle: "item" },
      // script → aggregator name
      { id: generateId("e"), source: nodes[5]!.id, sourceHandle: "out", target: nodes[6]!.id, targetHandle: "name" },
      // aggregator → output
      { id: generateId("e"), source: nodes[6]!.id, sourceHandle: "list", target: nodes[7]!.id, targetHandle: "in" },
    ];

    return { nodes, edges };
  },
};
