import { getDefaultDevice } from "@/config/defaults.ts";
import { MODEL_CLASSES } from "@/config/modelClassRegistry.ts";
import { PIPELINE_TASKS } from "@/config/pipelineRegistry.ts";
import type { FlowNode } from "@/types.ts";
import { generateId } from "@/utils/generateId.ts";
import type { Edge } from "@xyflow/react";

/* ────────────────────────────────────────────────────────────────────────────
 * RelaxUI Workflow Registry
 *
 * Pre-made workflows for every Transformers.js pipeline task.
 * Each workflow is fully configured with sample data and default models
 * so users can run them immediately after loading.
 * ──────────────────────────────────────────────────────────────────────── */

export interface RegistryWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  defaultModel: string;
  create: () => { nodes: FlowNode[]; edges: Edge[] };
}

/* ─── Sample Data ────────────────────────────────────────────────────────── */

const SAMPLE = {
  textClassification:
    "I love this product! It's amazing and works perfectly.",
  tokenClassification:
    "John Smith works at Microsoft in Seattle, Washington.",
  qaQuestion: "What is the capital of France?",
  qaContext:
    "France is a country in Western Europe. Its capital is Paris, which is known worldwide for the Eiffel Tower, the Louvre Museum, and Notre-Dame Cathedral. Paris has been the capital of France since the 10th century.",
  fillMask: "The capital of France is [MASK].",
  summarization:
    "Climate change is one of the most pressing issues facing our planet today. Rising global temperatures are causing widespread environmental changes, including melting ice caps, rising sea levels, and more frequent extreme weather events. Scientists have warned that without significant reductions in greenhouse gas emissions, these impacts will continue to worsen. Governments around the world are working to implement policies to reduce carbon emissions and transition to renewable energy sources. The Paris Agreement, signed by 196 countries, aims to limit global warming to 1.5 degrees Celsius above pre-industrial levels.",
  textGeneration: "Once upon a time in a land far away,",
  translation: "Hello, how are you today? I hope you are having a wonderful day.",
  srcLang: "eng_Latn",
  tgtLang: "fra_Latn",
  zeroShotText:
    "I just bought a new smartphone and it has an incredible camera.",
  zeroShotLabels: "technology, sports, food, politics, entertainment",
  featureExtraction:
    "This is a sample sentence for extracting vector embeddings.",
  imageUrl:
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg",
  documentUrl:
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/receipt.png",
  audioUrl:
    "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav",
  documentQuestion: "What is the total amount?",
  imageLabels: "cat, dog, bird, fish, rabbit",
  objectLabels: "cat, remote control, couch",
  audioLabels: "speech, music, noise, silence",
  ttsText:
    "Hello, welcome to RelaxUI. This is a text to speech demonstration.",
};

/* ─── Workflow Factory ───────────────────────────────────────────────────── */

interface InputSpec {
  type: "inputText" | "inputImage" | "audioInput";
  value: string;
  label: string;
  handleId: string;
}

interface OutputSpec {
  type: "outputText" | "outputImage" | "audioOutput" | "universalOutput";
  label: string;
  handleId: string;
  targetHandle?: string;
}

interface ExtraConnection {
  sourceIdx: number;
  targetIdx: number;
  targetHandle: string;
}

function createPipelineWorkflow(
  taskKey: string,
  inputs: InputSpec[],
  outputs: OutputSpec[],
  extraConnections?: ExtraConnection[],
  options?: { modelId?: string; label?: string },
): { nodes: FlowNode[]; edges: Edge[] } {
  const taskDef = PIPELINE_TASKS[taskKey]!;
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];

  const pipelineId = generateId("n");
  nodes.push({
    id: pipelineId,
    type: "transformersPipeline",
    position: { x: 450, y: 200 },
    macroId: null,
    data: {
      task: taskKey,
      model_id: options?.modelId || taskDef.defaultModel,
      device: getDefaultDevice(),
      label: options?.label || taskDef.label,
    },
  });

  const inputIds: string[] = [];
  inputs.forEach((inp, i) => {
    const id = generateId("n");
    inputIds.push(id);
    nodes.push({
      id,
      type: inp.type,
      position: { x: 80, y: 100 + i * 200 },
      macroId: null,
      data: { value: inp.value, label: inp.label },
    });
    edges.push({
      id: generateId("e"),
      source: id,
      sourceHandle: inp.type === "audioInput" ? "audio" : "out",
      target: pipelineId,
      targetHandle: inp.handleId,
    });
  });

  const outputIds: string[] = [];
  outputs.forEach((out, i) => {
    const id = generateId("n");
    outputIds.push(id);
    nodes.push({
      id,
      type: out.type,
      position: { x: 850, y: 100 + i * 250 },
      macroId: null,
      data: { label: out.label },
    });
    const defaultTarget =
      out.type === "audioOutput" ? "audio"
      : out.type === "universalOutput" ? "data"
      : "in";
    edges.push({
      id: generateId("e"),
      source: pipelineId,
      sourceHandle: out.handleId,
      target: id,
      targetHandle: out.targetHandle || defaultTarget,
    });
  });

  if (extraConnections) {
    extraConnections.forEach((conn) => {
      const sourceId = inputIds[conn.sourceIdx]!;
      const targetId = outputIds[conn.targetIdx]!;
      const sourceNode = nodes.find((n) => n.id === sourceId)!;
      edges.push({
        id: generateId("e"),
        source: sourceId,
        sourceHandle: sourceNode.type === "audioInput" ? "audio" : "out",
        target: targetId,
        targetHandle: conn.targetHandle,
      });
    });
  }

  return { nodes, edges };
}

/* ─── Registry Entries ───────────────────────────────────────────────────── */

export const WORKFLOW_REGISTRY: RegistryWorkflow[] = [
  /* ─── NLP ────────────────────────────────────────────────────────────── */
  {
    id: "text-classification",
    name: "Text Classification",
    description:
      "Classify text sentiment (positive/negative) using DistilBERT",
    category: "NLP",
    tags: ["sentiment", "classification"],
    defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    create: () =>
      createPipelineWorkflow(
        "text-classification",
        [
          {
            type: "inputText",
            value: SAMPLE.textClassification,
            label: "Input Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "token-classification",
    name: "Token Classification (NER)",
    description:
      "Named Entity Recognition - identify people, organizations, locations",
    category: "NLP",
    tags: ["NER", "entities"],
    defaultModel: "Xenova/bert-base-NER",
    create: () =>
      createPipelineWorkflow(
        "token-classification",
        [
          {
            type: "inputText",
            value: SAMPLE.tokenClassification,
            label: "Input Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "NER Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "question-answering",
    name: "Question Answering",
    description:
      "Extract answers from a context passage given a question",
    category: "NLP",
    tags: ["QA", "extractive"],
    defaultModel: "Xenova/distilbert-base-cased-distilled-squad",
    create: () =>
      createPipelineWorkflow(
        "question-answering",
        [
          {
            type: "inputText",
            value: SAMPLE.qaQuestion,
            label: "Question",
            handleId: "question",
          },
          {
            type: "inputText",
            value: SAMPLE.qaContext,
            label: "Context",
            handleId: "context",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Answer",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "fill-mask",
    name: "Fill Mask",
    description: "Predict the masked word in a sentence using BERT",
    category: "NLP",
    tags: ["MLM", "BERT"],
    defaultModel: "Xenova/bert-base-uncased",
    create: () =>
      createPipelineWorkflow(
        "fill-mask",
        [
          {
            type: "inputText",
            value: SAMPLE.fillMask,
            label: "Masked Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Predictions",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "summarization",
    name: "Summarization",
    description: "Generate a concise summary of a long text passage",
    category: "NLP",
    tags: ["summary", "abstractive"],
    defaultModel: "Xenova/distilbart-cnn-6-6",
    create: () =>
      createPipelineWorkflow(
        "summarization",
        [
          {
            type: "inputText",
            value: SAMPLE.summarization,
            label: "Long Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Summary Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "text-generation",
    name: "Text Generation",
    description: "Continue generating text from a prompt using Qwen 2.5 0.5B",
    category: "NLP",
    tags: ["generation", "Qwen"],
    defaultModel: "onnx-community/Qwen2.5-0.5B-Instruct",
    create: () =>
      createPipelineWorkflow(
        "text-generation",
        [
          {
            type: "inputText",
            value: SAMPLE.textGeneration,
            label: "Prompt",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Generated Text",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "translation",
    name: "Translation",
    description: "Translate text between languages using NLLB-200",
    category: "NLP",
    tags: ["translate", "multilingual"],
    defaultModel: "Xenova/nllb-200-distilled-600M",
    create: () =>
      createPipelineWorkflow(
        "translation",
        [
          {
            type: "inputText",
            value: SAMPLE.translation,
            label: "Source Text",
            handleId: "text",
          },
          {
            type: "inputText",
            value: SAMPLE.srcLang,
            label: "Source Language",
            handleId: "src_lang",
          },
          {
            type: "inputText",
            value: SAMPLE.tgtLang,
            label: "Target Language",
            handleId: "tgt_lang",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Translation",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "zero-shot-classification",
    name: "Zero-Shot Classification",
    description:
      "Classify text into custom categories without fine-tuning",
    category: "NLP",
    tags: ["zero-shot", "classification"],
    defaultModel: "Xenova/mobilebert-uncased-mnli",
    create: () =>
      createPipelineWorkflow(
        "zero-shot-classification",
        [
          {
            type: "inputText",
            value: SAMPLE.zeroShotText,
            label: "Input Text",
            handleId: "text",
          },
          {
            type: "inputText",
            value: SAMPLE.zeroShotLabels,
            label: "Candidate Labels",
            handleId: "labels",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "feature-extraction",
    name: "Feature Extraction",
    description:
      "Extract dense vector embeddings from text using MiniLM",
    category: "NLP",
    tags: ["embeddings", "vectors"],
    defaultModel: "Xenova/all-MiniLM-L6-v2",
    create: () =>
      createPipelineWorkflow(
        "feature-extraction",
        [
          {
            type: "inputText",
            value: SAMPLE.featureExtraction,
            label: "Input Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Embeddings",
            handleId: "result",
          },
        ],
      ),
  },

  /* ─── Vision ─────────────────────────────────────────────────────────── */
  {
    id: "image-classification",
    name: "Image Classification",
    description: "Classify an image into categories using ViT",
    category: "Vision",
    tags: ["vision", "classification"],
    defaultModel: "Xenova/vit-base-patch16-224",
    create: () =>
      createPipelineWorkflow(
        "image-classification",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "object-detection",
    name: "Object Detection",
    description:
      "Detect objects and bounding boxes in an image using DETR. Shows annotated image + rich result view.",
    category: "Vision",
    tags: ["vision", "detection", "DETR"],
    defaultModel: "Xenova/detr-resnet-50",
    create: () =>
      createPipelineWorkflow(
        "object-detection",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Detection Result",
            handleId: "result",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "image-segmentation",
    name: "Image Segmentation",
    description: "Segment an image into labeled regions using DETR. Shows annotated image + rich result view.",
    category: "Vision",
    tags: ["vision", "segmentation"],
    defaultModel: "Xenova/detr-resnet-50-panoptic",
    create: () =>
      createPipelineWorkflow(
        "image-segmentation",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Segmentation Result",
            handleId: "result",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "depth-estimation",
    name: "Depth Estimation",
    description: "Estimate per-pixel depth from a single image",
    category: "Vision",
    tags: ["vision", "depth"],
    defaultModel: "Xenova/depth-anything-small-hf",
    create: () =>
      createPipelineWorkflow(
        "depth-estimation",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Depth Map",
            handleId: "depth_map",
            targetHandle: "img2",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "background-removal",
    name: "Background Removal",
    description: "Remove the background from an image",
    category: "Vision",
    tags: ["vision", "background"],
    defaultModel: "Xenova/modnet",
    create: () =>
      createPipelineWorkflow(
        "background-removal",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Result",
            handleId: "result",
            targetHandle: "img2",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "image-to-image",
    name: "Image-to-Image (Super Resolution)",
    description: "Upscale/transform an image using Swin2SR",
    category: "Vision",
    tags: ["vision", "super-resolution"],
    defaultModel: "Xenova/swin2SR-classical-sr-x2-64",
    create: () =>
      createPipelineWorkflow(
        "image-to-image",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Result",
            handleId: "result",
            targetHandle: "img2",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "image-feature-extraction",
    name: "Image Feature Extraction",
    description:
      "Extract dense vector embeddings from an image using ViT",
    category: "Vision",
    tags: ["vision", "embeddings"],
    defaultModel: "Xenova/vit-base-patch16-224-in21k",
    create: () =>
      createPipelineWorkflow(
        "image-feature-extraction",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Feature Vectors",
            handleId: "result",
          },
        ],
      ),
  },

  /* ─── Audio ──────────────────────────────────────────────────────────── */
  {
    id: "automatic-speech-recognition",
    name: "Speech Recognition (ASR)",
    description: "Transcribe speech audio into text using Whisper",
    category: "Audio",
    tags: ["audio", "ASR", "whisper"],
    defaultModel: "Xenova/whisper-tiny.en",
    create: () =>
      createPipelineWorkflow(
        "automatic-speech-recognition",
        [
          {
            type: "audioInput",
            value: SAMPLE.audioUrl,
            label: "Audio Input",
            handleId: "audio",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Transcription",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "audio-classification",
    name: "Audio Classification",
    description:
      "Classify an audio clip (e.g. gender recognition)",
    category: "Audio",
    tags: ["audio", "classification"],
    defaultModel:
      "Xenova/wav2vec2-large-xlsr-53-gender-recognition-librispeech",
    create: () =>
      createPipelineWorkflow(
        "audio-classification",
        [
          {
            type: "audioInput",
            value: SAMPLE.audioUrl,
            label: "Audio Input",
            handleId: "audio",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "text-to-speech",
    name: "Text-to-Speech",
    description: "Synthesize speech audio from text using MMS-TTS",
    category: "Audio",
    tags: ["audio", "TTS"],
    defaultModel: "Xenova/mms-tts-eng",
    create: () =>
      createPipelineWorkflow(
        "text-to-speech",
        [
          {
            type: "inputText",
            value: SAMPLE.ttsText,
            label: "Input Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "audioOutput",
            label: "Audio Output",
            handleId: "result",
            targetHandle: "audio",
          },
        ],
      ),
  },

  /* ─── Multimodal ─────────────────────────────────────────────────────── */
  {
    id: "image-to-text",
    name: "Image Captioning",
    description: "Generate a text caption for an image",
    category: "Multimodal",
    tags: ["multimodal", "captioning"],
    defaultModel: "Xenova/vit-gpt2-image-captioning",
    create: () =>
      createPipelineWorkflow(
        "image-to-text",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Caption",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "document-question-answering",
    name: "Document Question Answering",
    description: "Answer questions about document images",
    category: "Multimodal",
    tags: ["multimodal", "document", "QA"],
    defaultModel: "Xenova/donut-base-finetuned-docvqa",
    create: () =>
      createPipelineWorkflow(
        "document-question-answering",
        [
          {
            type: "inputImage",
            value: SAMPLE.documentUrl,
            label: "Document Image",
            handleId: "image",
          },
          {
            type: "inputText",
            value: SAMPLE.documentQuestion,
            label: "Question",
            handleId: "question",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Answer",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "zero-shot-image-classification",
    name: "Zero-Shot Image Classification",
    description:
      "Classify an image into custom categories using CLIP",
    category: "Multimodal",
    tags: ["multimodal", "zero-shot", "CLIP"],
    defaultModel: "Xenova/clip-vit-base-patch32",
    create: () =>
      createPipelineWorkflow(
        "zero-shot-image-classification",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
          {
            type: "inputText",
            value: SAMPLE.imageLabels,
            label: "Candidate Labels",
            handleId: "labels",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
  {
    id: "zero-shot-object-detection",
    name: "Zero-Shot Object Detection",
    description:
      "Detect objects matching text queries in an image. Shows annotated image + rich result view.",
    category: "Multimodal",
    tags: ["multimodal", "zero-shot", "detection"],
    defaultModel: "Xenova/owlvit-base-patch16",
    create: () =>
      createPipelineWorkflow(
        "zero-shot-object-detection",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
          {
            type: "inputText",
            value: SAMPLE.objectLabels,
            label: "Object Labels",
            handleId: "labels",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Detection Result",
            handleId: "result",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
      ),
  },
  {
    id: "zero-shot-audio-classification",
    name: "Zero-Shot Audio Classification",
    description:
      "Classify audio against arbitrary text labels using CLAP",
    category: "Multimodal",
    tags: ["multimodal", "zero-shot", "audio"],
    defaultModel: "Xenova/clap-htsat-unfused",
    create: () =>
      createPipelineWorkflow(
        "zero-shot-audio-classification",
        [
          {
            type: "audioInput",
            value: SAMPLE.audioUrl,
            label: "Audio Input",
            handleId: "audio",
          },
          {
            type: "inputText",
            value: SAMPLE.audioLabels,
            label: "Candidate Labels",
            handleId: "labels",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Classification Result",
            handleId: "result",
          },
        ],
      ),
  },
];

/* ─── Batch Workflow Templates ──────────────────────────────────────────── */

function createBatchPipelineWorkflow(
  taskKey: string,
  inputType: "inputText" | "inputImage" | "audioInput",
  sampleValue: string,
  inputLabel: string,
): { nodes: FlowNode[]; edges: Edge[] } {
  const taskDef = PIPELINE_TASKS[taskKey]!;
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];

  const inputId = generateId("n");
  const batchId = generateId("n");
  const pipelineId = generateId("n");
  const aggId = generateId("n");
  const downloadId = generateId("n");
  const outputId = generateId("n");

  // Input node (folder or text)
  if (inputType === "inputImage") {
    nodes.push({
      id: inputId,
      type: "folderInput",
      position: { x: 80, y: 200 },
      macroId: null,
      data: { label: inputLabel },
    });
  } else {
    nodes.push({
      id: inputId,
      type: inputType,
      position: { x: 80, y: 200 },
      macroId: null,
      data: { value: sampleValue, label: inputLabel },
    });
  }

  // BatchIterator
  nodes.push({
    id: batchId,
    type: "batchIterator",
    position: { x: 350, y: 200 },
    macroId: null,
    data: { label: "Batch Iterator", batchSize: 1, delayMs: 500 },
  });

  // Pipeline
  nodes.push({
    id: pipelineId,
    type: "transformersPipeline",
    position: { x: 620, y: 150 },
    macroId: null,
    data: {
      task: taskKey,
      model_id: taskDef.defaultModel,
      device: getDefaultDevice(),
      label: taskDef.label,
    },
  });

  // ListAggregator
  nodes.push({
    id: aggId,
    type: "listAggregator",
    position: { x: 980, y: 200 },
    macroId: null,
    data: { label: "Collect Results" },
  });

  // DownloadData
  nodes.push({
    id: downloadId,
    type: "downloadData",
    position: { x: 1300, y: 200 },
    macroId: null,
    data: { label: "Download" },
  });

  // OutputText for live preview
  nodes.push({
    id: outputId,
    type: "outputText",
    position: { x: 980, y: 450 },
    macroId: null,
    data: { label: "Live Preview" },
  });

  const sourceHandle =
    inputType === "audioInput"
      ? "audio"
      : inputType === "inputImage"
        ? "out"
        : "out";
  const pipelineInputHandle =
    inputType === "audioInput"
      ? "audio"
      : inputType === "inputImage"
        ? "image"
        : "text";

  // Wiring
  edges.push(
    {
      id: generateId("e"),
      source: inputId,
      sourceHandle: inputType === "inputImage" ? "out" : sourceHandle,
      target: batchId,
      targetHandle: "list",
    },
    {
      id: generateId("e"),
      source: batchId,
      sourceHandle: "item",
      target: pipelineId,
      targetHandle: pipelineInputHandle,
    },
    {
      id: generateId("e"),
      source: pipelineId,
      sourceHandle: "result",
      target: aggId,
      targetHandle: "item",
    },
    {
      id: generateId("e"),
      source: aggId,
      sourceHandle: "list",
      target: downloadId,
      targetHandle: "in",
    },
    {
      id: generateId("e"),
      source: pipelineId,
      sourceHandle: "result",
      target: outputId,
      targetHandle: "in",
    },
  );

  return { nodes, edges };
}

WORKFLOW_REGISTRY.push(
  {
    id: "batch-image-captioning",
    name: "Batch Image Captioning",
    description:
      "Caption multiple images from a folder using image-to-text pipeline",
    category: "Batch Processing",
    tags: ["batch", "captioning", "vision"],
    defaultModel: "Xenova/vit-gpt2-image-captioning",
    create: () =>
      createBatchPipelineWorkflow(
        "image-to-text",
        "inputImage",
        SAMPLE.imageUrl,
        "Image Folder",
      ),
  },
  {
    id: "batch-text-classification",
    name: "Batch Text Classification",
    description:
      "Classify multiple text items through text-classification pipeline",
    category: "Batch Processing",
    tags: ["batch", "classification", "NLP"],
    defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    create: () =>
      createBatchPipelineWorkflow(
        "text-classification",
        "inputText",
        '["I love this product!", "Terrible experience.", "It was okay."]',
        "Text Items (JSON)",
      ),
  },
  {
    id: "batch-background-removal",
    name: "Batch Background Removal",
    description: "Remove backgrounds from multiple images in a folder",
    category: "Batch Processing",
    tags: ["batch", "background", "vision"],
    defaultModel: "Xenova/modnet",
    create: () =>
      createBatchPipelineWorkflow(
        "background-removal",
        "inputImage",
        SAMPLE.imageUrl,
        "Image Folder",
      ),
  },
);

/* ─── Model-Class Workflow Factory ───────────────────────────────────────── */

interface ClassInputDef {
  type: "inputText" | "inputImage" | "audioInput";
  value: string;
  label: string;
}

interface ClassWorkflowCfg {
  modelClass: string;
  modelId: string;
  device?: string;
  dtype?: string | Record<string, string>;
  useProcessor: boolean;
  useTokenizer: boolean;
  maxNewTokens?: number;
  doSample?: boolean;
  useStreamer?: boolean;
  input: ClassInputDef;
  secondaryInput?: ClassInputDef & { processorHandle: string };
  processorInput?: "text" | "image" | "audio";
}

function createClassWorkflow(cfg: ClassWorkflowCfg): {
  nodes: FlowNode[];
  edges: Edge[];
} {
  const nodes: FlowNode[] = [];
  const edges: Edge[] = [];
  const classDef = MODEL_CLASSES[cfg.modelClass]!;

  // ── Row 1: loaders ──
  const modelLoaderId = generateId("n");
  nodes.push({
    id: modelLoaderId,
    type: "transformersModelLoader",
    position: { x: 80, y: 50 },
    macroId: null,
    data: {
      label: classDef.label,
      modelClass: cfg.modelClass,
      model_id: cfg.modelId,
      device: cfg.device || getDefaultDevice(),
      dtype: cfg.dtype,
    },
  });

  let tokenizerId: string | null = null;
  let processorId: string | null = null;

  if (cfg.useTokenizer) {
    tokenizerId = generateId("n");
    nodes.push({
      id: tokenizerId,
      type: "transformersTokenizerLoader",
      position: { x: 80, y: 280 },
      macroId: null,
      data: { label: "Tokenizer", model_id: cfg.modelId },
    });
  }

  if (cfg.useProcessor) {
    processorId = generateId("n");
    nodes.push({
      id: processorId,
      type: "transformersProcessorLoader",
      position: { x: 80, y: cfg.useTokenizer ? 460 : 280 },
      macroId: null,
      data: { label: "Processor", model_id: cfg.modelId },
    });
  }

  // ── Row 2: input + encoding ──
  const inputId = generateId("n");
  nodes.push({
    id: inputId,
    type: cfg.input.type,
    position: { x: 380, y: cfg.useProcessor ? 440 : 280 },
    macroId: null,
    data: { value: cfg.input.value, label: cfg.input.label },
  });

  const inputSourceHandle =
    cfg.input.type === "audioInput" ? "audio" : "out";

  // Encode / process step
  let tensorsSourceId: string;
  let tensorsSourceHandle = "tensors";

  if (cfg.useProcessor && processorId) {
    const procNodeId = generateId("n");
    tensorsSourceId = procNodeId;
    nodes.push({
      id: procNodeId,
      type: "transformersProcessor",
      position: { x: 600, y: 350 },
      macroId: null,
      data: { label: "Process" },
    });
    edges.push({
      id: generateId("e"),
      source: processorId,
      sourceHandle: "processor",
      target: procNodeId,
      targetHandle: "processor",
    });
    edges.push({
      id: generateId("e"),
      source: inputId,
      sourceHandle: inputSourceHandle,
      target: procNodeId,
      targetHandle: cfg.processorInput || "text",
    });
    // Secondary input (e.g. image alongside text for vision-language models)
    if (cfg.secondaryInput) {
      const secId = generateId("n");
      nodes.push({
        id: secId,
        type: cfg.secondaryInput.type,
        position: { x: 380, y: 600 },
        macroId: null,
        data: { value: cfg.secondaryInput.value, label: cfg.secondaryInput.label },
      });
      edges.push({
        id: generateId("e"),
        source: secId,
        sourceHandle: cfg.secondaryInput.type === "audioInput" ? "audio" : "out",
        target: procNodeId,
        targetHandle: cfg.secondaryInput.processorHandle,
      });
    }
  } else if (tokenizerId) {
    const encodeId = generateId("n");
    tensorsSourceId = encodeId;
    nodes.push({
      id: encodeId,
      type: "transformersTokenizerEncode",
      position: { x: 600, y: 280 },
      macroId: null,
      data: { label: "Encode" },
    });
    edges.push({
      id: generateId("e"),
      source: tokenizerId,
      sourceHandle: "tokenizer",
      target: encodeId,
      targetHandle: "tokenizer",
    });
    edges.push({
      id: generateId("e"),
      source: inputId,
      sourceHandle: inputSourceHandle,
      target: encodeId,
      targetHandle: "text",
    });
  } else {
    tensorsSourceId = inputId;
    tensorsSourceHandle = inputSourceHandle;
  }

  const canGenerate = classDef.executionModes.includes("generate");

  if (canGenerate) {
    // ── Row 3: Generate ──
    const generateNodeId = generateId("n");
    nodes.push({
      id: generateNodeId,
      type: "transformersGenerate",
      position: { x: 850, y: 150 },
      macroId: null,
      data: {
        label: "Generate",
        useStreamer: cfg.useStreamer ?? true,
        max_new_tokens: cfg.maxNewTokens ?? 128,
        ...(cfg.doSample !== undefined ? { do_sample: cfg.doSample } : {}),
      },
    });

    edges.push({
      id: generateId("e"),
      source: modelLoaderId,
      sourceHandle: "model",
      target: generateNodeId,
      targetHandle: "model",
    });
    edges.push({
      id: generateId("e"),
      source: tensorsSourceId,
      sourceHandle: tensorsSourceHandle,
      target: generateNodeId,
      targetHandle: "tensors",
    });

    // Wire tokenizer to generate for streaming
    if (tokenizerId && cfg.useStreamer !== false) {
      edges.push({
        id: generateId("e"),
        source: tokenizerId,
        sourceHandle: "tokenizer",
        target: generateNodeId,
        targetHandle: "tokenizer",
      });
    }

    // ── Row 4: Decode + Outputs ──
    const decoderTokenizerId = tokenizerId || processorId;

    if (decoderTokenizerId) {
      const decodeId = generateId("n");
      nodes.push({
        id: decodeId,
        type: "transformersTokenizerDecode",
        position: { x: 1100, y: 250 },
        macroId: null,
        data: { label: "Decode", skip_special_tokens: true },
      });
      edges.push({
        id: generateId("e"),
        source: generateNodeId,
        sourceHandle: "generated_ids",
        target: decodeId,
        targetHandle: "token_ids",
      });
      if (tokenizerId) {
        edges.push({
          id: generateId("e"),
          source: tokenizerId,
          sourceHandle: "tokenizer",
          target: decodeId,
          targetHandle: "tokenizer",
        });
      }

      const textOutId = generateId("n");
      nodes.push({
        id: textOutId,
        type: "outputText",
        position: { x: 1350, y: 250 },
        macroId: null,
        data: { label: "Decoded Text" },
      });
      edges.push({
        id: generateId("e"),
        source: decodeId,
        sourceHandle: "text",
        target: textOutId,
        targetHandle: "in",
      });
    }

    // Stream output
    if (cfg.useStreamer !== false && tokenizerId) {
      const streamOutId = generateId("n");
      nodes.push({
        id: streamOutId,
        type: "outputText",
        position: { x: 1350, y: 50 },
        macroId: null,
        data: { label: "Stream" },
      });
      edges.push({
        id: generateId("e"),
        source: generateNodeId,
        sourceHandle: "stream",
        target: streamOutId,
        targetHandle: "in",
      });
    }
  } else {
    // ── Call-only topology: encode → modelCall → postProcess → output ──
    const modelCallId = generateId("n");
    nodes.push({
      id: modelCallId,
      type: "transformersModelCall",
      position: { x: 850, y: 150 },
      macroId: null,
      data: { label: "Model Call" },
    });

    edges.push({
      id: generateId("e"),
      source: modelLoaderId,
      sourceHandle: "model",
      target: modelCallId,
      targetHandle: "model",
    });
    edges.push({
      id: generateId("e"),
      source: tensorsSourceId,
      sourceHandle: tensorsSourceHandle,
      target: modelCallId,
      targetHandle: "tensors",
    });

    // Post-Process node
    const postProcessId = generateId("n");
    nodes.push({
      id: postProcessId,
      type: "transformersPostProcessCall",
      position: { x: 1100, y: 150 },
      macroId: null,
      data: {
        label: "Post-Process",
        postProcessCategory: classDef.postProcessCategory || "base",
      },
    });

    edges.push({
      id: generateId("e"),
      source: modelCallId,
      sourceHandle: "outputs",
      target: postProcessId,
      targetHandle: "outputs",
    });

    // Wire tokenizer/processor to post-process for decoding
    if (tokenizerId) {
      edges.push({
        id: generateId("e"),
        source: tokenizerId,
        sourceHandle: "tokenizer",
        target: postProcessId,
        targetHandle: "tokenizer",
      });
    }
    if (processorId) {
      edges.push({
        id: generateId("e"),
        source: processorId,
        sourceHandle: "processor",
        target: postProcessId,
        targetHandle: "processor",
      });
    }

    // Wire encoded inputs to post-process (for context like input_ids)
    edges.push({
      id: generateId("e"),
      source: tensorsSourceId,
      sourceHandle: tensorsSourceHandle,
      target: postProcessId,
      targetHandle: "encoded_inputs",
    });

    // Output node
    const resultOutId = generateId("n");
    nodes.push({
      id: resultOutId,
      type: "outputText",
      position: { x: 1350, y: 150 },
      macroId: null,
      data: { label: "Result" },
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
}

/* ─── Model-Class Registry Entries ───────────────────────────────────────── */

const CLASS_WORKFLOWS: RegistryWorkflow[] = [
  {
    id: "class-causal-lm",
    name: "Causal LM (GPT-2)",
    description:
      "Open-ended text generation with AutoModelForCausalLM — streaming token output",
    category: "Model Class: Text",
    tags: ["generate", "streaming", "GPT"],
    defaultModel: "Xenova/gpt2",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForCausalLM",
        modelId: "Xenova/gpt2",
        useProcessor: false,
        useTokenizer: true,
        useStreamer: true,
        maxNewTokens: 128,
        input: {
          type: "inputText",
          value: "The future of artificial intelligence is",
          label: "Prompt",
        },
      }),
  },
  {
    id: "class-seq2seq-lm",
    name: "Seq2Seq LM (Flan-T5)",
    description:
      "Encoder-decoder generation with AutoModelForSeq2SeqLM — translation, summarization, instruction-following",
    category: "Model Class: Text",
    tags: ["generate", "seq2seq", "T5"],
    defaultModel: "Xenova/flan-t5-small",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForSeq2SeqLM",
        modelId: "Xenova/flan-t5-small",
        useProcessor: false,
        useTokenizer: true,
        useStreamer: true,
        maxNewTokens: 128,
        input: {
          type: "inputText",
          value: "Translate to French: Hello, how are you today?",
          label: "Instruction",
        },
      }),
  },
  {
    id: "class-masked-lm",
    name: "Masked LM (BERT)",
    description:
      "Forward pass to predict [MASK] positions with AutoModelForMaskedLM",
    category: "Model Class: Text",
    tags: ["call", "MLM", "BERT"],
    defaultModel: "Xenova/bert-base-uncased",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForMaskedLM",
        modelId: "Xenova/bert-base-uncased",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "The capital of France is [MASK].",
          label: "Masked Text",
        },
      }),
  },
  {
    id: "class-speech-seq2seq",
    name: "Speech-to-Text (Whisper)",
    description:
      "Automatic speech recognition with AutoModelForSpeechSeq2Seq — transcribe audio to text",
    category: "Model Class: Audio",
    tags: ["generate", "ASR", "Whisper"],
    defaultModel: "Xenova/whisper-tiny.en",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForSpeechSeq2Seq",
        modelId: "Xenova/whisper-tiny.en",
        dtype: "q8",
        useProcessor: true,
        useTokenizer: true,
        useStreamer: false,
        maxNewTokens: 128,
        processorInput: "audio",
        input: {
          type: "audioInput",
          value: SAMPLE.audioUrl,
          label: "Audio Input",
        },
      }),
  },
  {
    id: "class-vision2seq",
    name: "Image Captioning (ViT-GPT2)",
    description:
      "Generate text captions from images with AutoModelForVision2Seq — vision encoder + text decoder",
    category: "Model Class: Vision",
    tags: ["generate", "captioning", "ViT"],
    defaultModel: "Xenova/vit-gpt2-image-captioning",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForVision2Seq",
        modelId: "Xenova/vit-gpt2-image-captioning",
        useProcessor: true,
        useTokenizer: true,
        useStreamer: false,
        maxNewTokens: 64,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-florence2",
    name: "Florence-2 (Vision-Language)",
    description:
      "Microsoft Florence-2 for captioning, OCR, object detection — multimodal vision-language model",
    category: "Model Class: Vision",
    tags: ["generate", "Florence", "VL"],
    defaultModel: "onnx-community/Florence-2-base-ft",
    create: () =>
      createClassWorkflow({
        modelClass: "Florence2ForConditionalGeneration",
        modelId: "onnx-community/Florence-2-base-ft",
        dtype: "fp32",
        useProcessor: true,
        useTokenizer: true,
        useStreamer: false,
        maxNewTokens: 128,
        processorInput: "text",
        input: {
          type: "inputText",
          value: "<CAPTION>",
          label: "Task Prompt",
        },
        secondaryInput: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
          processorHandle: "image",
        },
      }),
  },
  {
    id: "class-qwen3-5-vl",
    name: "Qwen 3.5 (0.8B ONNX)",
    description:
      "Qwen 3.5 0.8B multimodal model — describe images, answer visual questions with streaming. Requires WebGPU.",
    category: "Model Class: Vision",
    tags: ["generate", "Qwen", "VL", "WebGPU"],
    defaultModel: "onnx-community/Qwen3.5-0.8B-ONNX",
    create: () =>
      createClassWorkflow({
        modelClass: "Qwen3_5ForConditionalGeneration",
        modelId: "onnx-community/Qwen3.5-0.8B-ONNX",
        device: "webgpu",
        dtype: {
          embed_tokens: "q4",
          vision_encoder: "fp16",
          decoder_model_merged: "q4",
        } as any,
        useProcessor: true,
        useTokenizer: true,
        useStreamer: true,
        doSample: true,
        maxNewTokens: 512,
        processorInput: "text",
        input: {
          type: "inputText",
          value:
            "<|im_start|>user\n<|vision_start|><|image_pad|><|vision_end|>Describe this image in detail.<|im_end|>\n<|im_start|>assistant\n",
          label: "Chat Prompt",
        },
        secondaryInput: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
          processorHandle: "image",
        },
      }),
  },
  // ── Call-only Model Class Workflows ──
  {
    id: "class-base-model",
    name: "Base Model (Feature Extraction)",
    description:
      "Extract raw hidden states with AutoModel — general-purpose feature extractor",
    category: "Model Class: Text",
    tags: ["call", "features", "embeddings"],
    defaultModel: "Xenova/bert-base-uncased",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModel",
        modelId: "Xenova/bert-base-uncased",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "The quick brown fox jumps over the lazy dog.",
          label: "Input Text",
        },
      }),
  },
  {
    id: "class-sequence-classification",
    name: "Sequence Classification",
    description:
      "Classify text sequences into labels with AutoModelForSequenceClassification",
    category: "Model Class: Text",
    tags: ["call", "classification", "sentiment"],
    defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForSequenceClassification",
        modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "I love this product! It's amazing and works perfectly.",
          label: "Text to Classify",
        },
      }),
  },
  {
    id: "class-token-classification",
    name: "Token Classification (NER)",
    description:
      "Per-token classification for NER and POS tagging with AutoModelForTokenClassification",
    category: "Model Class: Text",
    tags: ["call", "NER", "tokens"],
    defaultModel: "Xenova/bert-base-NER",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForTokenClassification",
        modelId: "Xenova/bert-base-NER",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "John Smith works at Microsoft in Seattle, Washington.",
          label: "Text for NER",
        },
      }),
  },
  {
    id: "class-question-answering",
    name: "Question Answering",
    description:
      "Extractive question answering with AutoModelForQuestionAnswering",
    category: "Model Class: Text",
    tags: ["call", "QA", "extractive"],
    defaultModel: "Xenova/distilbert-base-cased-distilled-squad",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForQuestionAnswering",
        modelId: "Xenova/distilbert-base-cased-distilled-squad",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "What is the capital of France? [SEP] France is a country in Western Europe. Its capital is Paris.",
          label: "Question [SEP] Context",
        },
      }),
  },
  {
    id: "class-image-classification",
    name: "Image Classification (ViT)",
    description:
      "Classify images into categories with AutoModelForImageClassification",
    category: "Model Class: Vision",
    tags: ["call", "classification", "ViT"],
    defaultModel: "Xenova/vit-base-patch16-224",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForImageClassification",
        modelId: "Xenova/vit-base-patch16-224",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-object-detection",
    name: "Object Detection (DETR)",
    description:
      "Detect objects with bounding boxes using AutoModelForObjectDetection",
    category: "Model Class: Vision",
    tags: ["call", "detection", "DETR"],
    defaultModel: "Xenova/detr-resnet-50",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForObjectDetection",
        modelId: "Xenova/detr-resnet-50",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-image-segmentation",
    name: "Image Segmentation",
    description:
      "Instance/panoptic segmentation with AutoModelForImageSegmentation",
    category: "Model Class: Vision",
    tags: ["call", "segmentation", "panoptic"],
    defaultModel: "Xenova/detr-resnet-50-panoptic",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForImageSegmentation",
        modelId: "Xenova/detr-resnet-50-panoptic",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-semantic-segmentation",
    name: "Semantic Segmentation",
    description:
      "Per-pixel class labels with AutoModelForSemanticSegmentation",
    category: "Model Class: Vision",
    tags: ["call", "segmentation", "semantic"],
    defaultModel: "Xenova/segformer-b0-finetuned-ade-512-512",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForSemanticSegmentation",
        modelId: "Xenova/segformer-b0-finetuned-ade-512-512",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-universal-segmentation",
    name: "Universal Segmentation",
    description:
      "Panoptic, instance, and semantic segmentation with AutoModelForUniversalSegmentation",
    category: "Model Class: Vision",
    tags: ["call", "segmentation", "universal"],
    defaultModel: "onnx-community/maskformer-swin-small-ade",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForUniversalSegmentation",
        modelId: "onnx-community/maskformer-swin-small-ade",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-mask-generation",
    name: "Mask Generation (SAM)",
    description:
      "Prompt-based segmentation mask generation with AutoModelForMaskGeneration",
    category: "Model Class: Vision",
    tags: ["call", "SAM", "masks"],
    defaultModel: "Xenova/slimsam-77-uniform",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForMaskGeneration",
        modelId: "Xenova/slimsam-77-uniform",
        useProcessor: true,
        useTokenizer: false,
        processorInput: "image",
        input: {
          type: "inputImage",
          value: SAMPLE.imageUrl,
          label: "Input Image",
        },
      }),
  },
  {
    id: "class-text-to-spectrogram",
    name: "TTS Spectrogram (SpeechT5)",
    description:
      "Generate speech from text with AutoModelForTextToSpectrogram — requires speaker embeddings and vocoder (use text-to-speech pipeline for easier setup)",
    category: "Model Class: Audio",
    tags: ["call", "TTS", "SpeechT5"],
    defaultModel: "Xenova/speecht5_tts",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForTextToSpectrogram",
        modelId: "Xenova/speecht5_tts",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "Hello, this is a test of the text to speech system.",
          label: "Text Input",
        },
      }),
  },
  {
    id: "class-text-to-waveform",
    name: "TTS Waveform (MMS)",
    description:
      "End-to-end text-to-waveform synthesis with AutoModelForTextToWaveform",
    category: "Model Class: Audio",
    tags: ["call", "TTS", "waveform"],
    defaultModel: "Xenova/mms-tts-eng",
    create: () =>
      createClassWorkflow({
        modelClass: "AutoModelForTextToWaveform",
        modelId: "Xenova/mms-tts-eng",
        useProcessor: false,
        useTokenizer: true,
        input: {
          type: "inputText",
          value: "Hello, this is a test of the text to speech system.",
          label: "Text Input",
        },
      }),
  },
];

WORKFLOW_REGISTRY.push(...CLASS_WORKFLOWS);

/* ─── Additional Workflows (v0.4.0) ─────────────────────────────────────── */

WORKFLOW_REGISTRY.push(
  {
    id: "bria-rmbg-2",
    name: "Background Removal (BRIA RMBG-2.0)",
    description:
      "Remove image backgrounds using BRIA RMBG-2.0 (gated model — requires HF token in Settings)",
    category: "Vision",
    tags: ["background-removal", "segmentation", "gated"],
    defaultModel: "briaai/RMBG-2.0",
    create: () =>
      createPipelineWorkflow(
        "image-segmentation",
        [
          {
            type: "inputImage",
            value: SAMPLE.imageUrl,
            label: "Input Image",
            handleId: "image",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Result",
            handleId: "result",
            targetHandle: "img2",
          },
        ],
        [{ sourceIdx: 0, targetIdx: 0, targetHandle: "img1" }],
        { modelId: "briaai/RMBG-2.0", label: "Background Removal (BRIA)" },
      ),
  },
  {
    id: "kokoro-tts",
    name: "Kokoro TTS",
    description:
      "Text-to-speech synthesis using Kokoro 82M ONNX model",
    category: "Audio",
    tags: ["TTS", "speech", "kokoro"],
    defaultModel: "onnx-community/Kokoro-82M-ONNX",
    create: () =>
      createPipelineWorkflow(
        "text-to-speech",
        [
          {
            type: "inputText",
            value: "Hello, this is a test of the Kokoro text to speech system.",
            label: "Text Input",
            handleId: "text",
          },
        ],
        [
          {
            type: "audioOutput",
            label: "Audio Output",
            handleId: "result",
            targetHandle: "audio",
          },
        ],
        undefined,
        { modelId: "onnx-community/Kokoro-82M-ONNX", label: "Kokoro TTS" },
      ),
  },
  {
    id: "jina-clip-v2",
    name: "Jina CLIP v2 (Embeddings)",
    description:
      "Generate embeddings using Jina CLIP v2 for text and image understanding",
    category: "NLP",
    tags: ["embeddings", "CLIP", "feature-extraction"],
    defaultModel: "jinaai/jina-clip-v2",
    create: () =>
      createPipelineWorkflow(
        "feature-extraction",
        [
          {
            type: "inputText",
            value: "A photo of a beautiful sunset over the ocean.",
            label: "Input Text",
            handleId: "text",
          },
        ],
        [
          {
            type: "universalOutput",
            label: "Embedding Info",
            handleId: "result",
          },
        ],
        undefined,
        { modelId: "jinaai/jina-clip-v2", label: "Jina CLIP v2" },
      ),
  },
  {
    id: "image-captioning-workflow",
    name: "Image Captioning Workflow",
    description:
      "Complete pipeline: load images from folder, resize, caption via OpenRouter API, review, aggregate, and download as ZIP",
    category: "Workflows",
    tags: ["captioning", "batch", "review", "zip"],
    defaultModel: "x-ai/grok-4.1-fast",
    create: () => {
      const nodes: FlowNode[] = [];
      const edges: Edge[] = [];

      const folderId = generateId("n");
      nodes.push({
        id: folderId,
        type: "folderInput",
        position: { x: 50, y: 200 },
        macroId: null,
        data: { label: "Image Folder" },
      });

      const batchId = generateId("n");
      nodes.push({
        id: batchId,
        type: "batchIterator",
        position: { x: 350, y: 200 },
        macroId: null,
        data: { label: "Iterate Images", batchSize: 1, delayMs: 1000 },
      });
      edges.push({
        id: generateId("e"),
        source: folderId,
        sourceHandle: "images",
        target: batchId,
        targetHandle: "list",
      });

      const processId = generateId("n");
      nodes.push({
        id: processId,
        type: "imageProcess",
        position: { x: 650, y: 200 },
        macroId: null,
        data: { label: "Resize 1K 1:1", aspectRatio: "1:1", resolution: "1K" },
      });
      edges.push({
        id: generateId("e"),
        source: batchId,
        sourceHandle: "item",
        target: processId,
        targetHandle: "image",
      });

      const reviewId = generateId("n");
      nodes.push({
        id: reviewId,
        type: "reviewNode",
        position: { x: 1300, y: 200 },
        macroId: null,
        data: { label: "Review Captions" },
      });

      const aggId = generateId("n");
      nodes.push({
        id: aggId,
        type: "listAggregator",
        position: { x: 1650, y: 200 },
        macroId: null,
        data: { label: "Collect Captions" },
      });
      edges.push({
        id: generateId("e"),
        source: reviewId,
        sourceHandle: "out",
        target: aggId,
        targetHandle: "item",
      });

      const downloadId = generateId("n");
      nodes.push({
        id: downloadId,
        type: "downloadData",
        position: { x: 1950, y: 200 },
        macroId: null,
        data: { label: "Download ZIP", format: "zip" },
      });
      edges.push({
        id: generateId("e"),
        source: aggId,
        sourceHandle: "list",
        target: downloadId,
        targetHandle: "in",
      });

      return { nodes, edges };
    },
  },
);

/* ─── Category Index ─────────────────────────────────────────────────────── */

export const REGISTRY_CATEGORIES: Record<string, RegistryWorkflow[]> = {};
for (const wf of WORKFLOW_REGISTRY) {
  if (!REGISTRY_CATEGORIES[wf.category]) REGISTRY_CATEGORIES[wf.category] = [];
  REGISTRY_CATEGORIES[wf.category]!.push(wf);
}
