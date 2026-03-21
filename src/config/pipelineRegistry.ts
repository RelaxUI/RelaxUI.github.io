import type { PipelineTaskDef } from "@/types.ts";

/* ────────────────────────────────────────────────────────────────────────────
 * Pipeline Task Registry
 *
 * Defines every Transformers.js pipeline task that RelaxUI supports.
 * Each entry carries everything the UI needs to render the node and the
 * runtime needs to invoke the pipeline.
 * ──────────────────────────────────────────────────────────────────────── */

export const PIPELINE_TASKS: Record<string, PipelineTaskDef> = {
  /* ─── NLP ─────────────────────────────────────────────────────────── */

  "text-classification": {
    label: "Text Classification",
    category: "NLP",
    description:
      "Assign a label (e.g. positive / negative) to a piece of text.",
    defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "token-classification": {
    label: "Token Classification",
    category: "NLP",
    description: "Label each token in the input (NER, POS tagging, etc.).",
    defaultModel: "Xenova/bert-base-NER",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "highlighted-text",
  },

  "question-answering": {
    label: "Question Answering",
    category: "NLP",
    description:
      "Extract an answer span from a context passage given a question.",
    defaultModel: "Xenova/distilbert-base-cased-distilled-squad",
    inputs: [
      { id: "question", label: "QUESTION", type: "string", required: true },
      { id: "context", label: "CONTEXT", type: "string", required: true },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "highlighted-answer",
  },

  "fill-mask": {
    label: "Fill Mask",
    category: "NLP",
    description:
      "Predict the masked token in a sentence (text must contain [MASK]).",
    defaultModel: "Xenova/bert-base-uncased",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  summarization: {
    label: "Summarization",
    category: "NLP",
    description: "Produce a shorter summary of the input text.",
    defaultModel: "Xenova/distilbart-cnn-6-6",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [
      { id: "result", label: "RESULT", type: "json" },
      { id: "summary_text", label: "SUMMARY", type: "string" },
    ],
    visualization: "side-by-side",
  },

  "text-generation": {
    label: "Text Generation",
    category: "NLP",
    description: "Generate text continuing from the given prompt.",
    defaultModel: "onnx-community/Qwen2.5-0.5B-Instruct",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [
      { id: "result", label: "RESULT", type: "json" },
      { id: "generated_text", label: "GENERATED TEXT", type: "string" },
    ],
    visualization: "raw-json",
  },

  translation: {
    label: "Translation",
    category: "NLP",
    description: "Translate text between languages.",
    defaultModel: "Xenova/nllb-200-distilled-600M",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    optionalInputs: [
      { id: "src_lang", label: "SOURCE LANGUAGE", type: "string" },
      { id: "tgt_lang", label: "TARGET LANGUAGE", type: "string" },
    ],
    outputs: [
      { id: "result", label: "RESULT", type: "json" },
      { id: "translation_text", label: "TRANSLATION", type: "string" },
    ],
    visualization: "side-by-side",
  },

  "zero-shot-classification": {
    label: "Zero-Shot Classification",
    category: "NLP",
    description:
      "Classify text into arbitrary candidate labels without fine-tuning.",
    defaultModel: "Xenova/mobilebert-uncased-mnli",
    inputs: [
      { id: "text", label: "TEXT", type: "string", required: true },
      {
        id: "labels",
        label: "LABELS (comma-separated)",
        type: "string",
        required: true,
      },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "text2text-generation": {
    label: "Text-to-Text Generation",
    category: "NLP",
    description:
      "Encoder-decoder generation for tasks like translation, summarization, and paraphrasing (T5/BART-style).",
    defaultModel: "Xenova/flan-t5-small",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [
      { id: "result", label: "RESULT", type: "json" },
      { id: "generated_text", label: "GENERATED TEXT", type: "string" },
    ],
    visualization: "side-by-side",
  },

  "sentence-similarity": {
    label: "Sentence Similarity",
    category: "NLP",
    description:
      "Compute similarity between sentences using embeddings and cosine similarity.",
    defaultModel: "Xenova/all-MiniLM-L6-v2",
    inputs: [
      { id: "text", label: "SENTENCE 1", type: "string", required: true },
      { id: "context", label: "SENTENCE 2", type: "string", required: true },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "feature-extraction": {
    label: "Feature Extraction",
    category: "NLP",
    description:
      "Extract dense vector embeddings from text for downstream tasks.",
    defaultModel: "Xenova/all-MiniLM-L6-v2",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "tensor" }],
    visualization: "tensor-info",
  },

  /* ─── Vision ──────────────────────────────────────────────────────── */

  "image-classification": {
    label: "Image Classification",
    category: "Vision",
    description: "Assign a label to an entire image.",
    defaultModel: "Xenova/vit-base-patch16-224",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "object-detection": {
    label: "Object Detection",
    category: "Vision",
    description:
      "Detect objects in an image and return bounding boxes with labels.",
    defaultModel: "Xenova/detr-resnet-50",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    optionalInputs: [{ id: "threshold", label: "THRESHOLD", type: "number" }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bounding-boxes",
  },

  "image-segmentation": {
    label: "Image Segmentation",
    category: "Vision",
    description:
      "Segment an image into labelled regions (panoptic / semantic).",
    defaultModel: "Xenova/detr-resnet-50-panoptic",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "segmentation-mask",
  },

  "depth-estimation": {
    label: "Depth Estimation",
    category: "Vision",
    description: "Estimate per-pixel depth from a single image.",
    defaultModel: "Xenova/depth-anything-small-hf",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [
      { id: "result", label: "RESULT", type: "json" },
      { id: "depth_map", label: "DEPTH MAP", type: "image" },
    ],
    visualization: "raw-json",
  },

  "background-removal": {
    label: "Background Removal",
    category: "Vision",
    description: "Remove the background from an image.",
    defaultModel: "Xenova/modnet",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "image" }],
    visualization: "raw-json",
  },

  "image-to-image": {
    label: "Image-to-Image",
    category: "Vision",
    description:
      "Transform an input image (super-resolution, style transfer, etc.).",
    defaultModel: "Xenova/swin2SR-classical-sr-x2-64",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "image" }],
    visualization: "raw-json",
  },

  "image-feature-extraction": {
    label: "Image Feature Extraction",
    category: "Vision",
    description: "Extract dense vector embeddings from an image.",
    defaultModel: "Xenova/vit-base-patch16-224-in21k",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "tensor" }],
    visualization: "tensor-info",
  },

  /* ─── Audio ───────────────────────────────────────────────────────── */

  "automatic-speech-recognition": {
    label: "Automatic Speech Recognition",
    category: "Audio",
    description: "Transcribe speech audio into text.",
    defaultModel: "Xenova/whisper-tiny.en",
    inputs: [{ id: "audio", label: "AUDIO", type: "audio", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "transcript",
  },

  "audio-classification": {
    label: "Audio Classification",
    category: "Audio",
    description:
      "Classify an audio clip (e.g. speech emotion, speaker gender).",
    defaultModel:
      "Xenova/wav2vec2-large-xlsr-53-gender-recognition-librispeech",
    inputs: [{ id: "audio", label: "AUDIO", type: "audio", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "text-to-speech": {
    label: "Text-to-Speech",
    category: "Audio",
    description: "Synthesise speech audio from text.",
    defaultModel: "Xenova/mms-tts-eng",
    inputs: [{ id: "text", label: "TEXT", type: "string", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "audio" }],
    visualization: "raw-json",
  },

  /* ─── Multimodal ──────────────────────────────────────────────────── */

  "image-to-text": {
    label: "Image-to-Text",
    category: "Multimodal",
    description: "Generate a text caption for an image.",
    defaultModel: "Xenova/vit-gpt2-image-captioning",
    inputs: [{ id: "image", label: "IMAGE", type: "image", required: true }],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "image-caption",
  },

  "document-question-answering": {
    label: "Document Question Answering",
    category: "Multimodal",
    description: "Answer a question about the content of a document image.",
    defaultModel: "Xenova/donut-base-finetuned-docvqa",
    inputs: [
      { id: "image", label: "IMAGE", type: "image", required: true },
      { id: "question", label: "QUESTION", type: "string", required: true },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "highlighted-answer",
  },

  "zero-shot-image-classification": {
    label: "Zero-Shot Image Classification",
    category: "Multimodal",
    description:
      "Classify an image into arbitrary candidate labels using CLIP-style models.",
    defaultModel: "Xenova/clip-vit-base-patch32",
    inputs: [
      { id: "image", label: "IMAGE", type: "image", required: true },
      {
        id: "labels",
        label: "LABELS (comma-separated)",
        type: "string",
        required: true,
      },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },

  "zero-shot-object-detection": {
    label: "Zero-Shot Object Detection",
    category: "Multimodal",
    description: "Detect objects matching arbitrary text queries in an image.",
    defaultModel: "Xenova/owlvit-base-patch16",
    inputs: [
      { id: "image", label: "IMAGE", type: "image", required: true },
      {
        id: "labels",
        label: "LABELS (comma-separated)",
        type: "string",
        required: true,
      },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bounding-boxes",
  },

  "zero-shot-audio-classification": {
    label: "Zero-Shot Audio Classification",
    category: "Multimodal",
    description:
      "Classify an audio clip against arbitrary text labels using CLAP-style models.",
    defaultModel: "Xenova/clap-htsat-unfused",
    inputs: [
      { id: "audio", label: "AUDIO", type: "audio", required: true },
      {
        id: "labels",
        label: "LABELS (comma-separated)",
        type: "string",
        required: true,
      },
    ],
    outputs: [{ id: "result", label: "RESULT", type: "json" }],
    visualization: "bar-chart",
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Category index — maps a human-readable group name to its task keys.
 * ──────────────────────────────────────────────────────────────────────── */

export const PIPELINE_CATEGORIES: Record<string, string[]> = {
  NLP: [
    "text-classification",
    "token-classification",
    "question-answering",
    "fill-mask",
    "summarization",
    "text-generation",
    "text2text-generation",
    "translation",
    "zero-shot-classification",
    "sentence-similarity",
    "feature-extraction",
  ],
  Vision: [
    "image-classification",
    "object-detection",
    "image-segmentation",
    "depth-estimation",
    "background-removal",
    "image-to-image",
    "image-feature-extraction",
  ],
  Audio: [
    "automatic-speech-recognition",
    "audio-classification",
    "text-to-speech",
  ],
  Multimodal: [
    "image-to-text",
    "document-question-answering",
    "zero-shot-image-classification",
    "zero-shot-object-detection",
    "zero-shot-audio-classification",
  ],
};
