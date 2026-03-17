import { getDefaultDevice } from "@/config/defaults.ts";
import { MODEL_CLASSES } from "@/config/modelClassRegistry.ts";
import type { FlowNode, MacroDefinition } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

function createModelClassMacro(className: string): MacroDefinition {
  const classDef = MODEL_CLASSES[className]!;

  return {
    label: classDef.label,
    category: classDef.category,
    create: (pos, parentMacroId) => {
      const mId = generateId("macro");
      const nodes: FlowNode[] = [];
      const edges: Edge[] = [];

      // 1. Macro shell
      nodes.push({
        id: mId,
        type: "macroNode",
        position: pos,
        macroId: parentMacroId,
        data: {
          label: classDef.label,
          model_id: "",
        },
      });

      // 2. macroInParam for model_id
      const modelParamId = generateId("n");
      nodes.push({
        id: modelParamId,
        type: "macroInParam",
        macroId: mId,
        position: { x: 50, y: 80 },
        data: { param: "model_id" },
      });

      // 3. macroInEdge for text input
      const textEdgeId = generateId("n");
      nodes.push({
        id: textEdgeId,
        type: "macroInEdge",
        macroId: mId,
        position: { x: 50, y: 220 },
        data: { param: "text" },
      });

      // 4. Model Loader Node
      const modelLoaderId = generateId("n");
      nodes.push({
        id: modelLoaderId,
        type: "transformersModelLoader",
        macroId: mId,
        position: { x: 350, y: 80 },
        data: {
          modelClass: className,
          model_id: "",
          device: getDefaultDevice(),
          dtype: classDef.suggestedDtype || undefined,
        },
      });

      // 5. Companion loader (Tokenizer or Processor)
      const companionType = classDef.companionLoaders[0] || "AutoTokenizer";
      const isProcessor =
        companionType === "AutoProcessor" || classDef.requiresProcessor;
      const companionId = generateId("n");
      nodes.push({
        id: companionId,
        type: isProcessor
          ? "transformersProcessorLoader"
          : "transformersTokenizerLoader",
        macroId: mId,
        position: { x: 350, y: 340 },
        data: { model_id: "" },
      });

      // Wire model_id param to model loader and companion loader
      edges.push({
        id: generateId("e"),
        source: modelParamId,
        sourceHandle: "out",
        target: modelLoaderId,
        targetHandle: "model_id",
      });
      edges.push({
        id: generateId("e"),
        source: modelParamId,
        sourceHandle: "out",
        target: companionId,
        targetHandle: "model_id",
      });

      let yOut = 80;

      if (classDef.executionModes.includes("generate")) {
        // 6a. Generate Node
        const generateId_ = generateId("n");
        nodes.push({
          id: generateId_,
          type: "transformersGenerate",
          macroId: mId,
          position: { x: 700, y: 120 },
          data: { useStreamer: true, max_new_tokens: 128 },
        });

        // 7a. Tokenizer Encode Node (to convert text -> tensors)
        const encodeId = generateId("n");
        nodes.push({
          id: encodeId,
          type: isProcessor
            ? "transformersProcessor"
            : "transformersTokenizerEncode",
          macroId: mId,
          position: { x: 350, y: 560 },
          data: {},
        });

        // Wire text input to encode
        edges.push({
          id: generateId("e"),
          source: textEdgeId,
          sourceHandle: "out",
          target: encodeId,
          targetHandle: "text",
        });

        // Wire companion to encode
        edges.push({
          id: generateId("e"),
          source: companionId,
          sourceHandle: isProcessor ? "processor" : "tokenizer",
          target: encodeId,
          targetHandle: isProcessor ? "processor" : "tokenizer",
        });

        // Wire encode output to generate
        edges.push({
          id: generateId("e"),
          source: encodeId,
          sourceHandle: "tensors",
          target: generateId_,
          targetHandle: "tensors",
        });

        // Wire model to generate
        edges.push({
          id: generateId("e"),
          source: modelLoaderId,
          sourceHandle: "model",
          target: generateId_,
          targetHandle: "model",
        });

        // Wire tokenizer to generate (for streaming)
        if (!isProcessor) {
          edges.push({
            id: generateId("e"),
            source: companionId,
            sourceHandle: "tokenizer",
            target: generateId_,
            targetHandle: "tokenizer",
          });
        }

        // 8a. Tokenizer Decode Node
        const decodeId = generateId("n");
        nodes.push({
          id: decodeId,
          type: "transformersTokenizerDecode",
          macroId: mId,
          position: { x: 1050, y: 120 },
          data: { skip_special_tokens: true },
        });

        // Wire generated_ids to decode
        edges.push({
          id: generateId("e"),
          source: generateId_,
          sourceHandle: "generated_ids",
          target: decodeId,
          targetHandle: "token_ids",
        });

        // Wire companion to decode
        if (!isProcessor) {
          edges.push({
            id: generateId("e"),
            source: companionId,
            sourceHandle: "tokenizer",
            target: decodeId,
            targetHandle: "tokenizer",
          });
        }

        // Output: decoded text
        const textOutId = generateId("n");
        nodes.push({
          id: textOutId,
          type: "macroOutput",
          macroId: mId,
          position: { x: 1350, y: 120 },
          data: { param: "text" },
        });
        edges.push({
          id: generateId("e"),
          source: decodeId,
          sourceHandle: "text",
          target: textOutId,
          targetHandle: "in",
        });

        // Output: stream
        const streamOutId = generateId("n");
        nodes.push({
          id: streamOutId,
          type: "macroOutput",
          macroId: mId,
          position: { x: 1350, y: 300 },
          data: { param: "stream" },
        });
        edges.push({
          id: generateId("e"),
          source: generateId_,
          sourceHandle: "stream",
          target: streamOutId,
          targetHandle: "in",
        });
      } else {
        // 6b. For "call" mode — encode → modelCall → postProcess → macroOutput

        // Encode node
        const encodeId = generateId("n");
        nodes.push({
          id: encodeId,
          type: isProcessor
            ? "transformersProcessor"
            : "transformersTokenizerEncode",
          macroId: mId,
          position: { x: 350, y: 560 },
          data: {},
        });

        // Wire text input → encode
        edges.push({
          id: generateId("e"),
          source: textEdgeId,
          sourceHandle: "out",
          target: encodeId,
          targetHandle: "text",
        });

        // Wire companion → encode
        edges.push({
          id: generateId("e"),
          source: companionId,
          sourceHandle: isProcessor ? "processor" : "tokenizer",
          target: encodeId,
          targetHandle: isProcessor ? "processor" : "tokenizer",
        });

        // Model Call node
        const modelCallId = generateId("n");
        nodes.push({
          id: modelCallId,
          type: "transformersModelCall",
          macroId: mId,
          position: { x: 700, y: 120 },
          data: {},
        });

        // Wire model → modelCall
        edges.push({
          id: generateId("e"),
          source: modelLoaderId,
          sourceHandle: "model",
          target: modelCallId,
          targetHandle: "model",
        });

        // Wire encode → modelCall
        edges.push({
          id: generateId("e"),
          source: encodeId,
          sourceHandle: "tensors",
          target: modelCallId,
          targetHandle: "tensors",
        });

        // Post-Process node
        const postProcessId = generateId("n");
        nodes.push({
          id: postProcessId,
          type: "transformersPostProcessCall",
          macroId: mId,
          position: { x: 1050, y: 120 },
          data: {
            postProcessCategory: classDef.postProcessCategory || "base",
          },
        });

        // Wire modelCall outputs → postProcess
        edges.push({
          id: generateId("e"),
          source: modelCallId,
          sourceHandle: "outputs",
          target: postProcessId,
          targetHandle: "outputs",
        });

        // Wire companion → postProcess (for decoding)
        edges.push({
          id: generateId("e"),
          source: companionId,
          sourceHandle: isProcessor ? "processor" : "tokenizer",
          target: postProcessId,
          targetHandle: isProcessor ? "processor" : "tokenizer",
        });

        // Wire encode → postProcess (for input_ids context)
        edges.push({
          id: generateId("e"),
          source: encodeId,
          sourceHandle: "tensors",
          target: postProcessId,
          targetHandle: "encoded_inputs",
        });

        // Output: result
        const resultOutId = generateId("n");
        nodes.push({
          id: resultOutId,
          type: "macroOutput",
          macroId: mId,
          position: { x: 1350, y: 120 },
          data: { param: "result" },
        });
        edges.push({
          id: generateId("e"),
          source: postProcessId,
          sourceHandle: "result",
          target: resultOutId,
          targetHandle: "in",
        });
      }

      return { nodes, edges };
    },
  };
}

export const MODEL_CLASS_MACROS: Record<string, MacroDefinition> = {};
for (const className of Object.keys(MODEL_CLASSES)) {
  MODEL_CLASS_MACROS[`model_${className}`] = createModelClassMacro(className);
}
