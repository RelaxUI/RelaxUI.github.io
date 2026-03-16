import { PIPELINE_TASKS } from "@/config/pipelineRegistry.ts";
import type { FlowNode, NodeHandles } from "@/types.ts";

// Core nodes
import { BatchIteratorNode } from "@/nodes/core/BatchIteratorNode.tsx";
import { CustomScriptNode } from "@/nodes/core/CustomScriptNode.tsx";
import { DelayNode } from "@/nodes/core/DelayNode.tsx";
import { DownloadDataNode } from "@/nodes/core/DownloadDataNode.tsx";
import { FolderInputNode } from "@/nodes/core/FolderInputNode.tsx";
import { HttpRequestNode } from "@/nodes/core/HttpRequestNode.tsx";
import { MediaInputNode } from "@/nodes/core/MediaInputNode.tsx";
import { InputTextNode } from "@/nodes/core/InputTextNode.tsx";
import { JsonPathNode } from "@/nodes/core/JsonPathNode.tsx";
import { ListAggregatorNode } from "@/nodes/core/ListAggregatorNode.tsx";
import { MacroConnectionsNode } from "@/nodes/core/MacroConnectionsNode.tsx";
import { MacroNode } from "@/nodes/core/MacroNode.tsx";
import { MacroPortNode } from "@/nodes/core/MacroPortNode.tsx";
import { OutputImageNode } from "@/nodes/core/OutputImageNode.tsx";
import { OutputTextNode } from "@/nodes/core/OutputTextNode.tsx";

// Transformers.js nodes
import { CompanionLoaderNode } from "@/nodes/transformers/CompanionLoaderNode.tsx";
import { AudioOutputNode } from "@/nodes/transformers/AudioOutputNode.tsx";
import { ChatTemplateNode } from "@/nodes/transformers/ChatTemplateNode.tsx";
import { EnvConfigNode } from "@/nodes/transformers/EnvConfigNode.tsx";
import { GenerateNode } from "@/nodes/transformers/GenerateNode.tsx";
import { GenerationConfigNode } from "@/nodes/transformers/GenerationConfigNode.tsx";
import { ModelCallNode } from "@/nodes/transformers/ModelCallNode.tsx";
import { ModelLoaderNode } from "@/nodes/transformers/ModelLoaderNode.tsx";
import { PipelineNode } from "@/nodes/transformers/PipelineNode.tsx";
import { PostProcessNode } from "@/nodes/transformers/PostProcessNode.tsx";
import { ProcessorNode } from "@/nodes/transformers/ProcessorNode.tsx";
import { TokenizerDecodeNode } from "@/nodes/transformers/TokenizerDecodeNode.tsx";
import { TokenizerEncodeNode } from "@/nodes/transformers/TokenizerEncodeNode.tsx";

// Edge
import { CustomAnimatedEdge } from "@/components/CustomAnimatedEdge.tsx";

export const nodeTypes: Record<string, any> = {
  inputText: InputTextNode,
  inputImage: MediaInputNode,
  customScript: CustomScriptNode,
  httpRequest: HttpRequestNode,
  jsonPath: JsonPathNode,
  outputText: OutputTextNode,
  outputImage: OutputImageNode,
  macroNode: MacroNode,
  macroInEdge: MacroPortNode,
  macroInParam: MacroPortNode,
  macroOutput: MacroPortNode,
  macroConnections: MacroConnectionsNode,
  folderInput: FolderInputNode,
  batchIterator: BatchIteratorNode,
  delay: DelayNode,
  listAggregator: ListAggregatorNode,
  downloadData: DownloadDataNode,
  // Transformers.js
  transformersPipeline: PipelineNode,
  transformersModelLoader: ModelLoaderNode,
  transformersTokenizerLoader: CompanionLoaderNode,
  transformersProcessorLoader: CompanionLoaderNode,
  transformersGenerate: GenerateNode,
  transformersTokenizerEncode: TokenizerEncodeNode,
  transformersTokenizerDecode: TokenizerDecodeNode,
  transformersProcessor: ProcessorNode,
  transformersChatTemplate: ChatTemplateNode,
  transformersEnvConfig: EnvConfigNode,
  transformersGenerationConfig: GenerationConfigNode,
  audioInput: MediaInputNode,
  audioOutput: AudioOutputNode,
  videoInput: MediaInputNode,
  transformersModelCall: ModelCallNode,
  transformersPostProcessCall: PostProcessNode,
};

export const edgeTypes: Record<string, any> = {
  default: CustomAnimatedEdge,
};

export const getNodeHandles = (
  node: any,
  allNodes: FlowNode[],
): NodeHandles => {
  const handles: NodeHandles = { sources: [], targets: [] };

  if (["inputText", "inputImage"].includes(node.type)) {
    handles.sources.push({ id: "out", label: "OUT", offsetY: 70 });
  } else if (node.type === "customScript") {
    const inputs: string[] = node.data.inputs || ["in1", "in2", "in3", "in4"];
    inputs.forEach((id: string, i: number) =>
      handles.targets.push({
        id,
        label: id.toUpperCase(),
        offsetY: 60 + i * 35,
      }),
    );
    const outY = Math.max(
      110,
      60 + ((inputs.length > 0 ? inputs.length - 1 : 0) * 35) / 2,
    );
    handles.sources.push({ id: "out", label: "OUT", offsetY: outY });
  } else if (node.type === "httpRequest") {
    ["method", "url", "headers", "body"].forEach((id, i) =>
      handles.targets.push({
        id,
        label: id.toUpperCase(),
        offsetY: 60 + i * 35,
      }),
    );
    handles.sources.push({ id: "out", label: "RESPONSE", offsetY: 100 });
  } else if (node.type === "jsonPath") {
    handles.targets.push({ id: "json", label: "JSON", offsetY: 70 });
    handles.sources.push({ id: "out", label: "RESULT", offsetY: 70 });
  } else if (node.type === "outputText") {
    handles.targets.push({ id: "in", label: "IN", offsetY: 110 });
  } else if (node.type === "outputImage") {
    handles.targets.push({ id: "in1", label: "IMAGE", offsetY: 80 });
    handles.targets.push({ id: "in2", label: "IMAGE 2", offsetY: 130 });
    handles.targets.push({ id: "annotations", label: "ANNOTATIONS", offsetY: 180 });
  } else if (
    ["macroInEdge", "macroInParam", "macroConnections"].includes(node.type)
  ) {
    handles.sources.push({ id: "out", label: "OUT", offsetY: 50 });
  } else if (node.type === "macroOutput") {
    handles.targets.push({ id: "in", label: "IN", offsetY: 50 });
  } else if (node.type === "macroNode") {
    const mIns = allNodes.filter(
      (n) => n.macroId === node.id && n.type === "macroInEdge",
    );
    const mOuts = allNodes.filter(
      (n) => n.macroId === node.id && n.type === "macroOutput",
    );
    mIns.forEach((mIn, i) =>
      handles.targets.push({
        id: mIn.data.param || `in${i}`,
        label: (mIn.data.param || `in${i}`).toUpperCase(),
        offsetY: 50 + i * 30,
      }),
    );
    mOuts.forEach((mOut, i) =>
      handles.sources.push({
        id: mOut.data.param || `out${i}`,
        label: (mOut.data.param || `out${i}`).toUpperCase(),
        offsetY: 50 + i * 30,
      }),
    );
  } else if (node.type === "folderInput") {
    handles.sources.push({ id: "out", label: "ALL FILES", offsetY: 50 });
    handles.sources.push({ id: "images", label: "IMAGES", offsetY: 80 });
    handles.sources.push({ id: "audio", label: "AUDIO", offsetY: 110 });
    handles.sources.push({ id: "text", label: "TEXT", offsetY: 140 });
    handles.sources.push({ id: "video", label: "VIDEO", offsetY: 170 });
  } else if (node.type === "batchIterator") {
    handles.targets.push({ id: "list", label: "LIST", offsetY: 70 });
    handles.sources.push({ id: "item", label: "ITEM", offsetY: 70 });
  } else if (node.type === "delay") {
    handles.targets.push({ id: "in", label: "IN", offsetY: 50 });
    handles.sources.push({ id: "out", label: "OUT", offsetY: 50 });
  } else if (node.type === "listAggregator") {
    handles.targets.push({ id: "item", label: "ITEM", offsetY: 70 });
    handles.sources.push({ id: "list", label: "LIST", offsetY: 70 });
  } else if (node.type === "downloadData") {
    handles.targets.push({ id: "in", label: "DATA", offsetY: 70 });
  }
  // --- Transformers.js nodes ---
  else if (node.type === "transformersPipeline") {
    const taskDef = PIPELINE_TASKS[node.data.task];
    if (taskDef) {
      // model_id input handle
      handles.targets.push({ id: "model_id", label: "MODEL ID", offsetY: 50 });
      // task-specific inputs
      let y = 80;
      taskDef.inputs.forEach((inp) => {
        handles.targets.push({ id: inp.id, label: inp.label, offsetY: y });
        y += 30;
      });
      if (taskDef.optionalInputs) {
        taskDef.optionalInputs.forEach((inp) => {
          handles.targets.push({ id: inp.id, label: inp.label, offsetY: y });
          y += 30;
        });
      }
      // device/dtype inputs
      handles.targets.push({ id: "device", label: "DEVICE", offsetY: y });
      y += 30;
      handles.targets.push({ id: "dtype", label: "DTYPE", offsetY: y });
      // outputs
      let oy = 80;
      taskDef.outputs.forEach((out) => {
        handles.sources.push({ id: out.id, label: out.label, offsetY: oy });
        oy += 30;
      });
    } else {
      handles.targets.push({ id: "model_id", label: "MODEL ID", offsetY: 50 });
      handles.targets.push({ id: "text", label: "TEXT", offsetY: 80 });
      handles.sources.push({ id: "result", label: "RESULT", offsetY: 80 });
    }
  } else if (node.type === "transformersModelLoader") {
    handles.sources.push({ id: "model", label: "MODEL", offsetY: 80 });
  } else if (node.type === "transformersTokenizerLoader") {
    handles.sources.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 80 });
  } else if (node.type === "transformersProcessorLoader") {
    handles.sources.push({ id: "processor", label: "PROCESSOR", offsetY: 80 });
  } else if (node.type === "transformersGenerate") {
    handles.targets.push({ id: "model", label: "MODEL", offsetY: 50 });
    handles.targets.push({ id: "tensors", label: "TENSORS", offsetY: 80 });
    handles.targets.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 110 });
    handles.targets.push({
      id: "generation_config",
      label: "GEN CONFIG",
      offsetY: 140,
    });
    handles.sources.push({
      id: "generated_ids",
      label: "TOKEN IDS",
      offsetY: 80,
    });
    handles.sources.push({ id: "stream", label: "STREAM", offsetY: 110 });
  } else if (node.type === "transformersTokenizerEncode") {
    handles.targets.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 50 });
    handles.targets.push({ id: "text", label: "TEXT", offsetY: 80 });
    handles.sources.push({ id: "tensors", label: "TENSORS", offsetY: 70 });
  } else if (node.type === "transformersTokenizerDecode") {
    handles.targets.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 50 });
    handles.targets.push({ id: "token_ids", label: "TOKEN IDS", offsetY: 80 });
    handles.sources.push({ id: "text", label: "TEXT", offsetY: 70 });
  } else if (node.type === "transformersProcessor") {
    handles.targets.push({ id: "processor", label: "PROCESSOR", offsetY: 50 });
    handles.targets.push({ id: "text", label: "TEXT", offsetY: 80 });
    handles.targets.push({ id: "image", label: "IMAGE", offsetY: 110 });
    handles.targets.push({ id: "audio", label: "AUDIO", offsetY: 140 });
    handles.sources.push({ id: "tensors", label: "TENSORS", offsetY: 80 });
  } else if (node.type === "transformersChatTemplate") {
    handles.targets.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 50 });
    handles.targets.push({ id: "processor", label: "PROCESSOR", offsetY: 80 });
    handles.targets.push({ id: "messages", label: "MESSAGES", offsetY: 110 });
    handles.sources.push({ id: "output", label: "OUTPUT", offsetY: 80 });
  } else if (node.type === "transformersEnvConfig") {
    handles.sources.push({ id: "config", label: "CONFIG", offsetY: 70 });
  } else if (node.type === "transformersGenerationConfig") {
    handles.sources.push({ id: "config", label: "CONFIG", offsetY: 70 });
  } else if (node.type === "audioInput") {
    handles.sources.push({ id: "audio", label: "AUDIO", offsetY: 70 });
  } else if (node.type === "audioOutput") {
    handles.targets.push({ id: "audio", label: "AUDIO", offsetY: 70 });
  } else if (node.type === "videoInput") {
    handles.sources.push({ id: "video", label: "VIDEO", offsetY: 70 });
  } else if (node.type === "transformersModelCall") {
    handles.targets.push({ id: "model", label: "MODEL", offsetY: 50 });
    handles.targets.push({ id: "tensors", label: "TENSORS", offsetY: 80 });
    handles.sources.push({ id: "outputs", label: "OUTPUTS", offsetY: 70 });
  } else if (node.type === "transformersPostProcessCall") {
    handles.targets.push({ id: "outputs", label: "OUTPUTS", offsetY: 50 });
    handles.targets.push({ id: "tokenizer", label: "TOKENIZER", offsetY: 80 });
    handles.targets.push({ id: "processor", label: "PROCESSOR", offsetY: 110 });
    handles.targets.push({ id: "encoded_inputs", label: "ENCODED", offsetY: 140 });
    handles.sources.push({ id: "result", label: "RESULT", offsetY: 80 });
  }

  return handles;
};
