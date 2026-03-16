/**
 * integration-test.ts
 *
 * Comprehensive real-world integration test for ALL 20 RelaxUI model classes.
 * Downloads actual models from HuggingFace, runs inference, verifies outputs.
 *
 * IMPORTANT: In Node/Bun with device="cpu", Transformers.js defaults to fp32.
 * We explicitly set dtype="q8" to use quantized models and stay under 500MB.
 *
 * Usage: bun run tests/integration-test.ts
 */

const MAX_SIZE_BYTES = 500_000_000; // 500 MB

const SAMPLE_IMAGE_URL =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg";

// ── Size estimation ──────────────────────────────────────────────────────────
// Estimates the download size for a given dtype. On cpu with dtype="q8",
// Transformers.js loads files with "_quantized" suffix. For multi-component
// models (encoder + decoder), it prefers merged variants.

async function estimateDownloadSize(
  modelId: string,
  dtype?: string | Record<string, string>,
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
    );
    if (!res.ok) return null;
    const files: { path: string; size: number; type: string }[] =
      await res.json();

    const onnxFiles = files.filter(
      (f) =>
        f.type === "file" &&
        f.size &&
        (f.path.endsWith(".onnx") || f.path.endsWith(".onnx_data")),
    );
    if (onnxFiles.length === 0) return null;

    // Config + tokenizer files (not in onnx/ subdirectory)
    const auxSize = files
      .filter(
        (f) =>
          f.type === "file" &&
          f.size &&
          !f.path.startsWith("onnx/") &&
          (f.path.endsWith(".json") ||
            f.path.endsWith(".txt") ||
            f.path.endsWith(".model") ||
            f.path === "tokenizer.json"),
      )
      .reduce((a, b) => a + b.size, 0);

    // Map dtype to file suffix
    const dtypeSuffixMap: Record<string, string> = {
      fp32: "",
      fp16: "_fp16",
      q8: "_quantized",
      q4: "_q4",
      q4f16: "_q4f16",
      int8: "_int8",
      uint8: "_uint8",
      bnb4: "_bnb4",
    };

    let targetSuffix: string;
    if (typeof dtype === "string" && dtype in dtypeSuffixMap) {
      targetSuffix = dtypeSuffixMap[dtype]!;
    } else if (typeof dtype === "object" && dtype) {
      // Per-component dtype: sum each component individually
      let total = auxSize;
      for (const [component, dt] of Object.entries(dtype)) {
        const suffix = dtypeSuffixMap[dt] ?? "";
        const componentFiles = onnxFiles.filter((f) =>
          (f.path.split("/").pop() || "").startsWith(component),
        );
        if (componentFiles.length === 0) continue;
        const match = suffix
          ? componentFiles.find((f) => f.path.includes(`${suffix}.onnx`))
          : componentFiles.find(
              (f) =>
                f.path.endsWith(`/${component}.onnx`) ||
                f.path === `${component}.onnx`,
            );
        total += match ? match.size : componentFiles[0]!.size;
      }
      return total;
    } else {
      targetSuffix = "_quantized"; // default for q8
    }

    // Identify components and pick the right variant
    // Step 1: find all components
    const allComponents = new Set<string>();
    for (const f of onnxFiles) {
      const basename = (f.path.split("/").pop() || "").replace(
        /\.onnx(_data)?$/,
        "",
      );
      // Strip dtype suffix to get component name
      const component = basename.replace(
        /_(quantized|bnb4|fp16|int8|uint8|q4|q4f16|q8)$/,
        "",
      );
      allComponents.add(component);
    }

    // Step 2: if merged variant exists, skip non-merged + with_past + model
    // (model.onnx is often a duplicate of decoder_model_merged.onnx for causal LMs)
    const hasDecMerged = allComponents.has("decoder_model_merged");
    const skipComponents = new Set<string>();
    if (hasDecMerged) {
      skipComponents.add("decoder_model");
      skipComponents.add("decoder_with_past_model");
      skipComponents.add("model"); // model.onnx = decoder_model_merged.onnx for causal LMs
    }

    // Step 3: sum up sizes for selected components
    let totalOnnx = 0;
    for (const component of allComponents) {
      if (skipComponents.has(component)) continue;

      // Find files for this component with the target suffix
      const targetName = targetSuffix
        ? `${component}${targetSuffix}.onnx`
        : `${component}.onnx`;
      const match = onnxFiles.find(
        (f) =>
          f.path.endsWith(`/${targetName}`) || f.path === targetName,
      );
      if (match) {
        totalOnnx += match.size;
        continue;
      }

      // Fallback: plain component (no suffix)
      const plain = onnxFiles.find(
        (f) =>
          f.path.endsWith(`/${component}.onnx`) ||
          f.path === `${component}.onnx`,
      );
      if (plain) {
        totalOnnx += plain.size;
      }
    }

    return auxSize + totalOnnx;
  } catch {
    return null;
  }
}

// ── Test case definition ─────────────────────────────────────────────────────

interface TestCase {
  name: string;
  modelClass: string;
  modelId: string;
  dtype?: string | Record<string, string>;
  /** Override for model_file_name (e.g. "decoder_model_merged" for causal LMs) */
  modelFileName?: string;
  mode: "call" | "generate";
  companion: "tokenizer" | "processor" | "both";
  inputType: "text" | "image" | "image+text" | "image+points";
  text?: string;
  expectedOutputKeys?: string[];
  special?: string;
}

// ── All 20 model classes with default models from workflowRegistry ───────────
// NOTE: dtype="q8" is used everywhere (unless overridden) because on device="cpu"
// Transformers.js defaults to fp32, which would exceed size limits for many models.

const TEST_CASES: TestCase[] = [
  // ── 1. AutoModel (Base) ────────────────────────────────────────────────────
  {
    name: "1. AutoModel (Base)",
    modelClass: "AutoModel",
    modelId: "Xenova/bert-base-uncased",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "The quick brown fox jumps over the lazy dog.",
    // NOTE: bert-base-uncased exported via AutoModel returns "logits" (not "last_hidden_state")
    // because the ONNX export uses that output name. Either key is acceptable.
    expectedOutputKeys: ["logits"],
  },

  // ── 2. AutoModelForCausalLM (generate) ─────────────────────────────────────
  // NOTE: GPT-2's ONNX repo has decoder_model_merged_quantized.onnx but no
  // model_quantized.onnx. We must specify model_file_name to select the right file.
  {
    name: "2. AutoModelForCausalLM (generate)",
    modelClass: "AutoModelForCausalLM",
    modelId: "Xenova/gpt2",
    dtype: "q8",
    modelFileName: "decoder_model_merged",
    mode: "generate",
    companion: "tokenizer",
    inputType: "text",
    text: "The future of AI is",
  },

  // ── 3. AutoModelForCausalLM (call) ─────────────────────────────────────────
  {
    name: "3. AutoModelForCausalLM (call)",
    modelClass: "AutoModelForCausalLM",
    modelId: "Xenova/gpt2",
    dtype: "q8",
    modelFileName: "decoder_model_merged",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "Hello world",
    expectedOutputKeys: ["logits"],
  },

  // ── 4. AutoModelForSeq2SeqLM (generate) ────────────────────────────────────
  {
    name: "4. AutoModelForSeq2SeqLM (generate)",
    modelClass: "AutoModelForSeq2SeqLM",
    modelId: "Xenova/flan-t5-small",
    dtype: "q8",
    mode: "generate",
    companion: "tokenizer",
    inputType: "text",
    text: "Translate to French: Hello, how are you?",
  },

  // ── 5. AutoModelForSeq2SeqLM (call) ────────────────────────────────────────
  {
    name: "5. AutoModelForSeq2SeqLM (call)",
    modelClass: "AutoModelForSeq2SeqLM",
    modelId: "Xenova/flan-t5-small",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "Translate to French: Hello",
    expectedOutputKeys: ["logits"],
    special: "seq2seq-call",
  },

  // ── 6. AutoModelForMaskedLM (call) ─────────────────────────────────────────
  {
    name: "6. AutoModelForMaskedLM (call)",
    modelClass: "AutoModelForMaskedLM",
    modelId: "Xenova/bert-base-uncased",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "The capital of France is [MASK].",
    expectedOutputKeys: ["logits"],
  },

  // ── 7. AutoModelForSequenceClassification (call) ───────────────────────────
  {
    name: "7. AutoModelForSequenceClassification (call)",
    modelClass: "AutoModelForSequenceClassification",
    modelId: "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "I love this product! It works perfectly.",
    expectedOutputKeys: ["logits"],
  },

  // ── 8. AutoModelForTokenClassification (call) ──────────────────────────────
  {
    name: "8. AutoModelForTokenClassification (call)",
    modelClass: "AutoModelForTokenClassification",
    modelId: "Xenova/bert-base-NER",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "John Smith works at Microsoft in Seattle.",
    expectedOutputKeys: ["logits"],
  },

  // ── 9. AutoModelForQuestionAnswering (call) ────────────────────────────────
  {
    name: "9. AutoModelForQuestionAnswering (call)",
    modelClass: "AutoModelForQuestionAnswering",
    modelId: "Xenova/distilbert-base-cased-distilled-squad",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "What is the capital of France? [SEP] France is a country in Western Europe. Its capital is Paris.",
    expectedOutputKeys: ["start_logits", "end_logits"],
  },

  // ── 10. AutoModelForImageClassification (call) ─────────────────────────────
  {
    name: "10. AutoModelForImageClassification (call)",
    modelClass: "AutoModelForImageClassification",
    modelId: "Xenova/vit-base-patch16-224",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image",
    expectedOutputKeys: ["logits"],
  },

  // ── 11. AutoModelForObjectDetection (call) ─────────────────────────────────
  {
    name: "11. AutoModelForObjectDetection (call)",
    modelClass: "AutoModelForObjectDetection",
    modelId: "Xenova/detr-resnet-50",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image",
    expectedOutputKeys: ["logits", "pred_boxes"],
  },

  // ── 12. AutoModelForImageSegmentation (call) ───────────────────────────────
  {
    name: "12. AutoModelForImageSegmentation (call)",
    modelClass: "AutoModelForImageSegmentation",
    modelId: "Xenova/detr-resnet-50-panoptic",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image",
    expectedOutputKeys: ["logits", "pred_masks"],
  },

  // ── 13. AutoModelForSemanticSegmentation (call) ────────────────────────────
  {
    name: "13. AutoModelForSemanticSegmentation (call)",
    modelClass: "AutoModelForSemanticSegmentation",
    modelId: "Xenova/segformer-b0-finetuned-ade-512-512",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image",
    expectedOutputKeys: ["logits"],
  },

  // ── 14. AutoModelForUniversalSegmentation (call) ───────────────────────────
  // NOTE: Xenova/oneformer-ade20k-swin-tiny returns 401 (gated/private).
  // Using onnx-community/maskformer-swin-small-ade (MaskFormer) which maps
  // to the same AutoModelForUniversalSegmentation class.
  {
    name: "14. AutoModelForUniversalSegmentation (call)",
    modelClass: "AutoModelForUniversalSegmentation",
    modelId: "onnx-community/maskformer-swin-small-ade",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image",
    expectedOutputKeys: ["class_queries_logits", "masks_queries_logits"],
  },

  // ── 15. AutoModelForMaskGeneration (call) - SAM ────────────────────────────
  {
    name: "15. AutoModelForMaskGeneration (call)",
    modelClass: "AutoModelForMaskGeneration",
    modelId: "Xenova/slimsam-77-uniform",
    dtype: "q8",
    mode: "call",
    companion: "processor",
    inputType: "image+points",
    expectedOutputKeys: ["iou_scores", "pred_masks"],
    special: "sam",
  },

  // ── 16. AutoModelForSpeechSeq2Seq (generate) - Whisper ─────────────────────
  {
    name: "16. AutoModelForSpeechSeq2Seq (generate)",
    modelClass: "AutoModelForSpeechSeq2Seq",
    modelId: "Xenova/whisper-tiny.en",
    dtype: "q8",
    mode: "generate",
    companion: "both",
    inputType: "text",
    special: "whisper",
  },

  // ── 17. AutoModelForTextToSpectrogram (generate_speech) - SpeechT5 ─────────
  {
    name: "17. AutoModelForTextToSpectrogram (generate_speech)",
    modelClass: "AutoModelForTextToSpectrogram",
    modelId: "Xenova/speecht5_tts",
    dtype: "q8",
    mode: "generate",
    companion: "tokenizer",
    inputType: "text",
    text: "Hello",
    special: "speecht5",
  },

  // ── 18. AutoModelForTextToWaveform (call) - MMS-TTS ────────────────────────
  {
    name: "18. AutoModelForTextToWaveform (call)",
    modelClass: "AutoModelForTextToWaveform",
    modelId: "Xenova/mms-tts-eng",
    dtype: "q8",
    mode: "call",
    companion: "tokenizer",
    inputType: "text",
    text: "Hello world",
    expectedOutputKeys: ["waveform"],
  },

  // ── 19. AutoModelForVision2Seq (generate) - ViT-GPT2 ──────────────────────
  {
    name: "19. AutoModelForVision2Seq (generate)",
    modelClass: "AutoModelForVision2Seq",
    modelId: "Xenova/vit-gpt2-image-captioning",
    dtype: "q8",
    mode: "generate",
    companion: "both",
    inputType: "image",
    special: "vision2seq",
  },

  // ── 20. Florence2ForConditionalGeneration (generate) ───────────────────────
  {
    name: "20. Florence2ForConditionalGeneration (generate)",
    modelClass: "Florence2ForConditionalGeneration",
    modelId: "onnx-community/Florence-2-base-ft",
    dtype: "q8",
    mode: "generate",
    companion: "both",
    inputType: "image+text",
    text: "<CAPTION>",
    special: "florence2",
  },

  // ── 21. Qwen3_5ForConditionalGeneration (generate) ─────────────────────────
  // Likely skipped due to size even with q4 dtype, but included for completeness.
  {
    name: "21. Qwen3_5ForConditionalGeneration (generate)",
    modelClass: "Qwen3_5ForConditionalGeneration",
    modelId: "onnx-community/Qwen3.5-0.8B-ONNX",
    dtype: {
      embed_tokens: "q4",
      vision_encoder: "fp16",
      decoder_model_merged: "q4",
    },
    mode: "generate",
    companion: "both",
    inputType: "text",
    text: "Hello",
    special: "qwen",
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const transformers = await import("@huggingface/transformers");
  const { RawImage, Tensor } = transformers;

  console.log("=".repeat(80));
  console.log("RelaxUI Integration Test -- All 20 Model Classes");
  console.log("=".repeat(80));
  console.log(`Max model size: ${MAX_SIZE_BYTES / 1024 / 1024} MB`);
  console.log(`Total test cases: ${TEST_CASES.length}\n`);

  let passed = 0;
  let skipped = 0;
  let failed = 0;
  const results: { name: string; status: string; detail: string }[] = [];

  // Caches to avoid re-downloading same models
  const modelCache = new Map<string, any>();
  const tokenizerCache = new Map<string, any>();
  const processorCache = new Map<string, any>();
  let cachedImage: any = null;

  for (const tc of TEST_CASES) {
    const startTime = Date.now();
    process.stdout.write(`\n${"~".repeat(70)}\n`);
    process.stdout.write(`TEST: ${tc.name}\n`);
    process.stdout.write(`  Model: ${tc.modelId} | Class: ${tc.modelClass}\n`);
    process.stdout.write(
      `  Mode: ${tc.mode} | Companion: ${tc.companion} | dtype: ${JSON.stringify(tc.dtype || "q8")}\n`,
    );

    // ── Size check ──
    const size = await estimateDownloadSize(tc.modelId, tc.dtype);
    const sizeMB = size ? (size / 1024 / 1024).toFixed(0) : "?";
    process.stdout.write(`  Est. download: ~${sizeMB} MB\n`);

    if (size && size > MAX_SIZE_BYTES) {
      const msg = `SKIPPED (~${sizeMB} MB exceeds ${MAX_SIZE_BYTES / 1024 / 1024} MB limit)`;
      console.log(`  >> ${msg}`);
      results.push({ name: tc.name, status: "SKIP", detail: msg });
      skipped++;
      continue;
    }

    try {
      // ── Load model ──
      const modelCacheKey = `${tc.modelClass}:${tc.modelId}:${JSON.stringify(tc.dtype || "q8")}`;
      let model: any;
      if (modelCache.has(modelCacheKey)) {
        model = modelCache.get(modelCacheKey);
        process.stdout.write(`  Model: (cached)\n`);
      } else {
        process.stdout.write(`  Loading model...`);
        const ModelClass = (transformers as any)[tc.modelClass];
        if (!ModelClass)
          throw new Error(
            `Class "${tc.modelClass}" not exported from @huggingface/transformers`,
          );

        const modelOpts: any = { device: "cpu" };
        modelOpts.dtype = tc.dtype || "q8";
        if (tc.modelFileName) modelOpts.model_file_name = tc.modelFileName;

        model = await ModelClass.from_pretrained(tc.modelId, modelOpts);
        modelCache.set(modelCacheKey, model);
        process.stdout.write(` OK\n`);
      }

      // ── Load tokenizer ──
      let tokenizer: any = null;
      if (tc.companion === "tokenizer" || tc.companion === "both") {
        if (tokenizerCache.has(tc.modelId)) {
          tokenizer = tokenizerCache.get(tc.modelId);
        } else {
          process.stdout.write(`  Loading tokenizer...`);
          tokenizer = await transformers.AutoTokenizer.from_pretrained(
            tc.modelId,
          );
          tokenizerCache.set(tc.modelId, tokenizer);
          process.stdout.write(` OK\n`);
        }
      }

      // ── Load processor ──
      let processor: any = null;
      if (tc.companion === "processor" || tc.companion === "both") {
        if (processorCache.has(tc.modelId)) {
          processor = processorCache.get(tc.modelId);
        } else {
          process.stdout.write(`  Loading processor...`);
          processor = await transformers.AutoProcessor.from_pretrained(
            tc.modelId,
          );
          processorCache.set(tc.modelId, processor);
          process.stdout.write(` OK\n`);
        }
      }

      // ── Load image if needed ──
      let image: any = null;
      if (
        tc.inputType === "image" ||
        tc.inputType === "image+text" ||
        tc.inputType === "image+points"
      ) {
        if (cachedImage) {
          image = cachedImage;
        } else {
          process.stdout.write(`  Loading test image...`);
          image = await RawImage.fromURL(SAMPLE_IMAGE_URL);
          cachedImage = image;
          process.stdout.write(` OK (${image.width}x${image.height})\n`);
        }
      }

      // ── Run inference ──
      process.stdout.write(`  Running inference...`);

      if (tc.special === "whisper") {
        // Whisper: feed dummy audio through processor, then generate
        const dummyAudio = new Float32Array(16000);
        for (let i = 0; i < dummyAudio.length; i++) {
          dummyAudio[i] = Math.sin((2 * Math.PI * 440 * i) / 16000) * 0.1;
        }
        const processed = await processor(dummyAudio);
        const output = await model.generate({
          ...processed,
          max_new_tokens: 10,
        });
        if (!output || !output[0])
          throw new Error("generate() returned no output");
        const decoded = tokenizer.decode(output[0], {
          skip_special_tokens: true,
        });
        if (typeof decoded !== "string")
          throw new Error("decode() returned non-string");
        process.stdout.write(` OK\n`);
        const msg = `PASS (decoded: "${decoded.substring(0, 60)}")`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "speecht5") {
        // SpeechT5: uses generate_speech() with speaker embeddings + vocoder
        const encoded = await tokenizer(tc.text!);
        const speakerData = new Float32Array(
          await (
            await fetch(
              "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin",
            )
          ).arrayBuffer(),
        );
        const speakerEmbeddings = new Tensor(
          "float32",
          speakerData,
          [1, speakerData.length],
        );
        const vocoder = await (transformers as any).AutoModel.from_pretrained(
          "Xenova/speecht5_hifigan",
          { device: "cpu", dtype: "fp32" },
        );
        const result = await model.generate_speech(
          encoded.input_ids,
          speakerEmbeddings,
          { vocoder },
        );
        if (!result.spectrogram && !result.waveform)
          throw new Error("No spectrogram or waveform output");
        const info: string[] = [];
        if (result.spectrogram)
          info.push(`spectrogram:[${result.spectrogram.dims}]`);
        if (result.waveform) info.push(`waveform:[${result.waveform.dims}]`);
        process.stdout.write(` OK\n`);
        const msg = `PASS (${info.join(", ")})`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "sam") {
        // SAM: image + input_points
        const imageInputs = await processor(image);
        const input_points = [[[220, 300]]];
        const reshapedPoints = processor.reshape_input_points(
          input_points,
          imageInputs.original_sizes,
          imageInputs.reshaped_input_sizes,
        );
        const output = await model({
          ...imageInputs,
          input_points: reshapedPoints,
        });
        if (!output) throw new Error("model() returned null");
        const outputKeys = Object.keys(output);
        for (const k of tc.expectedOutputKeys!) {
          if (!(k in output))
            throw new Error(`Missing key "${k}". Got: [${outputKeys}]`);
        }
        process.stdout.write(` OK\n`);
        const msg = `PASS (iou_scores:[${output.iou_scores?.dims}], pred_masks:[${output.pred_masks?.dims}])`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "vision2seq") {
        // ViT-GPT2: process image, generate caption
        const imageInputs = await processor(image);
        const output = await model.generate({
          ...imageInputs,
          max_new_tokens: 20,
        });
        if (!output || !output[0])
          throw new Error("generate() returned no output");
        const decoded = tokenizer.decode(output[0], {
          skip_special_tokens: true,
        });
        if (typeof decoded !== "string")
          throw new Error("decode() returned non-string");
        process.stdout.write(` OK\n`);
        const msg = `PASS (caption: "${decoded.substring(0, 60)}")`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "florence2") {
        // Florence-2: processor(images, text), then generate
        const inputs = await processor(image, tc.text!);
        const output = await model.generate({
          ...inputs,
          max_new_tokens: 30,
        });
        if (!output || !output[0])
          throw new Error("generate() returned no output");
        const decoded = tokenizer.decode(output[0], {
          skip_special_tokens: true,
        });
        if (typeof decoded !== "string")
          throw new Error("decode() returned non-string");
        process.stdout.write(` OK\n`);
        const msg = `PASS (output: "${decoded.substring(0, 60)}")`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "qwen") {
        // Qwen VL: text-only test
        const textInputs = tokenizer(tc.text!);
        const output = await model.generate({
          ...textInputs,
          max_new_tokens: 10,
        });
        if (!output || !output[0])
          throw new Error("generate() returned no output");
        const decoded = tokenizer.decode(output[0], {
          skip_special_tokens: true,
        });
        if (typeof decoded !== "string")
          throw new Error("decode() returned non-string");
        process.stdout.write(` OK\n`);
        const msg = `PASS (output: "${decoded.substring(0, 60)}")`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.special === "seq2seq-call") {
        // Seq2Seq call needs decoder_input_ids
        const encoded = await tokenizer(tc.text!);
        const decoderStartId = model.config?.decoder_start_token_id ?? 0;
        const decoderInputIds = new Tensor(
          "int64",
          BigInt64Array.from([BigInt(decoderStartId)]),
          [1, 1],
        );
        const output = await model({
          ...encoded,
          decoder_input_ids: decoderInputIds,
        });
        if (!output) throw new Error("model() returned null");
        const outputKeys = Object.keys(output);
        if (!("logits" in output))
          throw new Error(`Missing "logits". Got: [${outputKeys}]`);
        process.stdout.write(` OK\n`);
        const msg = `PASS (logits:[${output.logits?.dims}])`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.mode === "generate") {
        // Standard generate (CausalLM, Seq2SeqLM)
        const encoded = await tokenizer!(tc.text!);
        const output = await model.generate({
          ...encoded,
          max_new_tokens: 10,
        });
        if (!output || !output[0])
          throw new Error("generate() returned no output");
        const decoded = tokenizer!.decode(output[0], {
          skip_special_tokens: true,
        });
        if (typeof decoded !== "string")
          throw new Error("decode() returned non-string");
        process.stdout.write(` OK\n`);
        const msg = `PASS (output: "${decoded.substring(0, 60)}")`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.mode === "call" && tc.inputType === "text") {
        // Standard text call
        const encoded = await tokenizer!(tc.text!);
        const output = await model(encoded);
        if (!output) throw new Error("model() returned null");
        const outputKeys = Object.keys(output);
        if (tc.expectedOutputKeys) {
          for (const k of tc.expectedOutputKeys) {
            if (!(k in output))
              throw new Error(`Missing key "${k}". Got: [${outputKeys}]`);
          }
        }
        const firstKey = tc.expectedOutputKeys?.[0] || outputKeys[0]!;
        const dims = output[firstKey]?.dims || "scalar";
        process.stdout.write(` OK\n`);
        const msg = `PASS (${firstKey}:[${dims}], keys:[${outputKeys.join(",")}])`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else if (tc.mode === "call" && tc.inputType === "image") {
        // Image call
        const imageInputs = await processor!(image);
        const output = await model(imageInputs);
        if (!output) throw new Error("model() returned null");
        const outputKeys = Object.keys(output);
        if (tc.expectedOutputKeys) {
          for (const k of tc.expectedOutputKeys) {
            if (!(k in output))
              throw new Error(`Missing key "${k}". Got: [${outputKeys}]`);
          }
        }
        const firstKey = tc.expectedOutputKeys?.[0] || outputKeys[0]!;
        const dims = output[firstKey]?.dims || "?";
        process.stdout.write(` OK\n`);
        const msg = `PASS (${firstKey}:[${dims}], keys:[${outputKeys.join(",")}])`;
        console.log(`  >> ${msg}`);
        results.push({ name: tc.name, status: "PASS", detail: msg });
        passed++;
      } else {
        throw new Error(
          `Unhandled test config: mode=${tc.mode}, inputType=${tc.inputType}`,
        );
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Time: ${elapsed}s`);
    } catch (err: any) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      process.stdout.write(`\n`);
      const errMsg = err.message?.substring(0, 200) || String(err);
      const msg = `FAIL: ${errMsg}`;
      console.log(`  >> ${msg}`);
      console.log(`  Time: ${elapsed}s`);
      if (err.stack) {
        const frames = err.stack.split("\n").slice(1, 4).join("\n");
        console.log(`  Stack:\n${frames}`);
      }
      results.push({ name: tc.name, status: "FAIL", detail: msg });
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(80)}`);
  console.log("SUMMARY");
  console.log("=".repeat(80));

  for (const r of results) {
    const tag =
      r.status === "PASS"
        ? "[PASS]"
        : r.status === "SKIP"
          ? "[SKIP]"
          : "[FAIL]";
    console.log(`  ${tag} ${r.name}`);
    if (r.status === "FAIL") console.log(`         ${r.detail}`);
  }

  console.log(`\n${"~".repeat(40)}`);
  console.log(`  PASSED:  ${passed}`);
  console.log(`  FAILED:  ${failed}`);
  console.log(`  SKIPPED: ${skipped}`);
  console.log(`  TOTAL:   ${TEST_CASES.length}`);
  console.log("~".repeat(40));

  if (failed > 0) {
    console.log("\nSome tests FAILED.");
    process.exit(1);
  } else {
    console.log("\nAll tests PASSED (or were skipped due to size).");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
