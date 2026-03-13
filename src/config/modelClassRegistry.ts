import type { ModelClassDef } from "@/types.ts";

/* ────────────────────────────────────────────────────────────────────────────
 * Model Class Registry
 *
 * Defines every Transformers.js AutoModel class that RelaxUI surfaces.
 * Each entry describes execution capabilities (call vs. generate),
 * expected outputs, and what companion loaders (tokenizer / processor)
 * are needed.
 * ──────────────────────────────────────────────────────────────────────── */

export const MODEL_CLASSES: Record<string, ModelClassDef> = {
  /* ─── Base ────────────────────────────────────────────────────────── */

  AutoModel: {
    label: "AutoModel",
    category: "Base",
    description:
      "Generic model loader — returns raw hidden states. Use when no task-specific head is needed.",
    executionModes: ["call"],
    callOutputs: ["last_hidden_state", "pooler_output"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  /* ─── Text Generation ─────────────────────────────────────────────── */

  AutoModelForCausalLM: {
    label: "AutoModelForCausalLM",
    category: "Text Generation",
    description:
      "Causal (left-to-right) language model for open-ended text generation (GPT-style).",
    executionModes: ["call", "generate"],
    callOutputs: ["logits"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  AutoModelForSeq2SeqLM: {
    label: "AutoModelForSeq2SeqLM",
    category: "Text Generation",
    description:
      "Encoder-decoder model for sequence-to-sequence tasks such as translation and summarization (T5 / BART-style).",
    executionModes: ["call", "generate"],
    callOutputs: ["logits", "encoder_last_hidden_state"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  AutoModelForMaskedLM: {
    label: "AutoModelForMaskedLM",
    category: "Text Generation",
    description:
      "Masked language model that predicts missing tokens in a sequence (BERT-style).",
    executionModes: ["call"],
    callOutputs: ["logits"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  /* ─── Classification ──────────────────────────────────────────────── */

  AutoModelForSequenceClassification: {
    label: "AutoModelForSequenceClassification",
    category: "Classification",
    description:
      "Classify an entire input sequence into a set of labels (sentiment, topic, NLI, etc.).",
    executionModes: ["call"],
    callOutputs: ["logits"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  AutoModelForTokenClassification: {
    label: "AutoModelForTokenClassification",
    category: "Classification",
    description:
      "Per-token classification head for NER, POS tagging, and similar tasks.",
    executionModes: ["call"],
    callOutputs: ["logits"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  AutoModelForQuestionAnswering: {
    label: "AutoModelForQuestionAnswering",
    category: "Classification",
    description:
      "Extractive question answering — predicts start and end logits over the context.",
    executionModes: ["call"],
    callOutputs: ["start_logits", "end_logits"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  /* ─── Vision ──────────────────────────────────────────────────────── */

  AutoModelForImageClassification: {
    label: "AutoModelForImageClassification",
    category: "Vision",
    description:
      "Classify an image into one of many labels (ViT, ResNet, etc.).",
    executionModes: ["call"],
    callOutputs: ["logits"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  AutoModelForObjectDetection: {
    label: "AutoModelForObjectDetection",
    category: "Vision",
    description:
      "Detect objects and return bounding boxes with class labels (DETR, YOLOS, etc.).",
    executionModes: ["call"],
    callOutputs: ["logits", "pred_boxes"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  AutoModelForImageSegmentation: {
    label: "AutoModelForImageSegmentation",
    category: "Vision",
    description:
      "Instance / panoptic segmentation — outputs per-pixel masks and labels.",
    executionModes: ["call"],
    callOutputs: ["logits", "pred_masks"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  AutoModelForSemanticSegmentation: {
    label: "AutoModelForSemanticSegmentation",
    category: "Vision",
    description:
      "Semantic segmentation — assigns a class label to every pixel.",
    executionModes: ["call"],
    callOutputs: ["logits"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  AutoModelForUniversalSegmentation: {
    label: "AutoModelForUniversalSegmentation",
    category: "Vision",
    description:
      "Universal segmentation model supporting panoptic, instance, and semantic segmentation.",
    executionModes: ["call"],
    callOutputs: ["class_queries_logits", "masks_queries_logits"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  AutoModelForMaskGeneration: {
    label: "AutoModelForMaskGeneration",
    category: "Vision",
    description:
      "Prompt-based mask generation (SAM-style) — generates segmentation masks from points or boxes.",
    executionModes: ["call"],
    callOutputs: ["iou_scores", "pred_masks"],
    companionLoaders: ["AutoProcessor"],
    requiresProcessor: true,
  },

  /* ─── Audio ───────────────────────────────────────────────────────── */

  AutoModelForSpeechSeq2Seq: {
    label: "AutoModelForSpeechSeq2Seq",
    category: "Audio",
    description:
      "Speech-to-text encoder-decoder model (Whisper-style automatic speech recognition).",
    executionModes: ["call", "generate"],
    callOutputs: ["logits", "encoder_last_hidden_state"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoProcessor", "AutoTokenizer"],
    requiresProcessor: true,
    suggestedDtype: { default: "q8" },
  },

  AutoModelForTextToSpectrogram: {
    label: "AutoModelForTextToSpectrogram",
    category: "Audio",
    description:
      "Generate mel-spectrogram frames from text for speech synthesis (SpeechT5-style).",
    executionModes: ["call", "generate"],
    callOutputs: ["spectrogram"],
    generateOutputs: ["spectrogram"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  AutoModelForTextToWaveform: {
    label: "AutoModelForTextToWaveform",
    category: "Audio",
    description: "End-to-end text-to-waveform synthesis (vocoder-based TTS).",
    executionModes: ["call"],
    callOutputs: ["waveform"],
    companionLoaders: ["AutoTokenizer"],
    requiresProcessor: false,
  },

  /* ─── Vision-Language ─────────────────────────────────────────────── */

  AutoModelForVision2Seq: {
    label: "AutoModelForVision2Seq",
    category: "Vision-Language",
    description:
      "Vision encoder + text decoder for image captioning and visual QA.",
    executionModes: ["call", "generate"],
    callOutputs: ["logits"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoProcessor", "AutoTokenizer"],
    requiresProcessor: true,
  },

  Qwen3_5ForConditionalGeneration: {
    label: "Qwen2.5-VL / Qwen3-VL",
    category: "Vision-Language",
    description:
      "Qwen vision-language model for image understanding and generation.",
    executionModes: ["call", "generate"],
    callOutputs: ["logits"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoProcessor", "AutoTokenizer"],
    requiresProcessor: true,
    suggestedDtype: { default: "q4" },
  },

  Florence2ForConditionalGeneration: {
    label: "Florence-2",
    category: "Vision-Language",
    description:
      "Microsoft Florence-2 model for a wide range of vision and vision-language tasks.",
    executionModes: ["call", "generate"],
    callOutputs: ["logits"],
    generateOutputs: ["output_token_ids"],
    companionLoaders: ["AutoProcessor", "AutoTokenizer"],
    requiresProcessor: true,
    suggestedDtype: { default: "fp32" },
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Category index — maps a human-readable group to its model class keys.
 * ──────────────────────────────────────────────────────────────────────── */

export const MODEL_CLASS_CATEGORIES: Record<string, string[]> = {
  Base: ["AutoModel"],
  "Text Generation": [
    "AutoModelForCausalLM",
    "AutoModelForSeq2SeqLM",
    "AutoModelForMaskedLM",
  ],
  Classification: [
    "AutoModelForSequenceClassification",
    "AutoModelForTokenClassification",
    "AutoModelForQuestionAnswering",
  ],
  Vision: [
    "AutoModelForImageClassification",
    "AutoModelForObjectDetection",
    "AutoModelForImageSegmentation",
    "AutoModelForSemanticSegmentation",
    "AutoModelForUniversalSegmentation",
    "AutoModelForMaskGeneration",
  ],
  Audio: [
    "AutoModelForSpeechSeq2Seq",
    "AutoModelForTextToSpectrogram",
    "AutoModelForTextToWaveform",
  ],
  "Vision-Language": [
    "AutoModelForVision2Seq",
    "Qwen3_5ForConditionalGeneration",
    "Florence2ForConditionalGeneration",
  ],
};
