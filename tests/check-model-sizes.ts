/**
 * check-model-sizes.ts
 *
 * Queries the Hugging Face API for all default models used in RelaxUI
 * and reports their sizes. Flags models over 1 GB.
 *
 * Usage: bun run tests/check-model-sizes.ts
 */

const MAX_SIZE_BYTES = 1_000_000_000; // 1 GB

interface ModelEntry {
  id: string;
  source: string;
  defaultModel: string;
  dtype?: string;
}

// All default models from workflowRegistry + modelClassRegistry
const MODELS: ModelEntry[] = [
  // Pipeline workflows (from pipelineRegistry defaults)
  { id: "text-classification", source: "pipeline", defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english" },
  { id: "token-classification", source: "pipeline", defaultModel: "Xenova/bert-base-NER" },
  { id: "question-answering", source: "pipeline", defaultModel: "Xenova/distilbert-base-cased-distilled-squad" },
  { id: "fill-mask", source: "pipeline", defaultModel: "Xenova/bert-base-uncased" },
  { id: "summarization", source: "pipeline", defaultModel: "Xenova/distilbart-cnn-6-6" },
  { id: "translation", source: "pipeline", defaultModel: "Xenova/nllb-200-distilled-600M" },
  { id: "text-generation", source: "pipeline", defaultModel: "Xenova/gpt2" },
  { id: "text2text-generation", source: "pipeline", defaultModel: "Xenova/flan-t5-small" },
  { id: "zero-shot-classification", source: "pipeline", defaultModel: "Xenova/mobilebert-uncased-mnli" },
  { id: "feature-extraction", source: "pipeline", defaultModel: "Xenova/all-MiniLM-L6-v2" },
  { id: "image-classification", source: "pipeline", defaultModel: "Xenova/vit-base-patch16-224" },
  { id: "object-detection", source: "pipeline", defaultModel: "Xenova/detr-resnet-50" },
  { id: "image-segmentation", source: "pipeline", defaultModel: "Xenova/detr-resnet-50-panoptic" },
  { id: "depth-estimation", source: "pipeline", defaultModel: "Xenova/depth-anything-small-hf" },
  { id: "image-to-text", source: "pipeline", defaultModel: "Xenova/vit-gpt2-image-captioning" },
  { id: "background-removal", source: "pipeline", defaultModel: "Xenova/modnet" },
  { id: "automatic-speech-recognition", source: "pipeline", defaultModel: "Xenova/whisper-tiny.en", dtype: "q8" },
  { id: "text-to-speech", source: "pipeline", defaultModel: "Xenova/mms-tts-eng" },
  // Class workflows
  { id: "class-causal-lm", source: "class", defaultModel: "Xenova/gpt2" },
  { id: "class-seq2seq-lm", source: "class", defaultModel: "Xenova/flan-t5-small" },
  { id: "class-masked-lm", source: "class", defaultModel: "Xenova/bert-base-uncased" },
  { id: "class-speech-seq2seq", source: "class", defaultModel: "Xenova/whisper-tiny.en", dtype: "q8" },
  { id: "class-vision2seq", source: "class", defaultModel: "Xenova/vit-gpt2-image-captioning" },
  { id: "class-florence2", source: "class", defaultModel: "onnx-community/Florence-2-base-ft", dtype: "fp32" },
  { id: "class-qwen3-5-vl", source: "class", defaultModel: "onnx-community/Qwen3.5-0.8B-ONNX", dtype: "q4" },
  { id: "class-base-model", source: "class", defaultModel: "Xenova/bert-base-uncased" },
  { id: "class-seq-classification", source: "class", defaultModel: "Xenova/distilbert-base-uncased-finetuned-sst-2-english" },
  { id: "class-token-classification", source: "class", defaultModel: "Xenova/bert-base-NER" },
  { id: "class-question-answering", source: "class", defaultModel: "Xenova/distilbert-base-cased-distilled-squad" },
  { id: "class-image-classification", source: "class", defaultModel: "Xenova/vit-base-patch16-224" },
  { id: "class-object-detection", source: "class", defaultModel: "Xenova/detr-resnet-50" },
  { id: "class-image-segmentation", source: "class", defaultModel: "Xenova/detr-resnet-50-panoptic" },
  { id: "class-semantic-segmentation", source: "class", defaultModel: "Xenova/segformer-b0-finetuned-ade-512-512" },
  { id: "class-universal-segmentation", source: "class", defaultModel: "Xenova/oneformer-ade20k-swin-tiny" },
  { id: "class-mask-generation", source: "class", defaultModel: "Xenova/slimsam-77-uniform" },
  { id: "class-text-to-spectrogram", source: "class", defaultModel: "Xenova/speecht5_tts" },
  { id: "class-text-to-waveform", source: "class", defaultModel: "Xenova/mms-tts-eng" },
];

// Deduplicate by model ID
const uniqueModels = new Map<string, ModelEntry>();
for (const m of MODELS) {
  const key = `${m.defaultModel}:${m.dtype || ""}`;
  if (!uniqueModels.has(key)) uniqueModels.set(key, m);
}

async function getModelSize(modelId: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
    );
    if (!res.ok) return null;
    const files = await res.json();
    const onnxFiles = files.filter(
      (f: any) =>
        f.type === "file" &&
        f.size &&
        (f.path.endsWith(".onnx") || f.path.endsWith(".onnx_data")),
    );
    if (onnxFiles.length === 0) return null;
    // Report total ONNX size as upper bound
    return onnxFiles.reduce((a: number, b: any) => a + b.size, 0);
  } catch {
    return null;
  }
}

async function main() {
  console.log("Checking model sizes for all RelaxUI default models...\n");

  const results: { id: string; model: string; sizeMB: number; status: string }[] = [];
  let failures = 0;

  for (const [key, entry] of uniqueModels) {
    const size = await getModelSize(entry.defaultModel);
    const sizeMB = size ? size / 1024 / 1024 : -1;
    const status =
      size === null
        ? "UNKNOWN"
        : size > MAX_SIZE_BYTES
          ? "OVER 1GB"
          : "OK";
    if (status !== "OK") failures++;
    results.push({ id: entry.id, model: entry.defaultModel, sizeMB, status });
  }

  // Print table
  console.log("%-35s %-45s %10s %s".replace(/%/g, ""));
  console.log("ID".padEnd(35) + "MODEL".padEnd(45) + "SIZE (MB)".padStart(10) + "  STATUS");
  console.log("-".repeat(100));
  for (const r of results) {
    const sizeStr = r.sizeMB >= 0 ? r.sizeMB.toFixed(1) : "?";
    console.log(
      r.id.padEnd(35) +
        r.model.padEnd(45) +
        sizeStr.padStart(10) +
        "  " +
        r.status,
    );
  }

  console.log(`\n${results.length} models checked, ${failures} issues found.`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
