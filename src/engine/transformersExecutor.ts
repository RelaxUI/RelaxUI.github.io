import { DEFAULTS, getDefaultDevice } from "@/config/defaults.ts";
import { GENERATION_PARAMS } from "@/config/generationDefaults.ts";
import { PIPELINE_TASKS } from "@/config/pipelineRegistry.ts";
import type { GraphRunner } from "@/engine/GraphRunner.ts";
import type { FlowNode } from "@/types.ts";

// Caches to avoid reloading models/pipelines
const pipelineCache = new Map<string, Promise<any>>();
const modelCache = new Map<string, Promise<any>>();
const tokenizerCache = new Map<string, Promise<any>>();
const processorCache = new Map<string, Promise<any>>();

/** Apply HF access token from settings before any model load */
async function applyHfToken() {
  try {
    const raw = localStorage.getItem("relaxui_settings");
    if (raw) {
      const token = JSON.parse(raw).hfToken;
      if (token) {
        const { env } = await import("@huggingface/transformers");
        (env as any).accessToken = token;
      }
    }
  } catch {}
}

function writeWavString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++)
    view.setUint8(offset + i, str.charCodeAt(i));
}

function float32ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  writeWavString(v, 0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  writeWavString(v, 8, "WAVE");
  writeWavString(v, 12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeWavString(v, 36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Normalise ONNX filename suffixes to the dtype strings transformers.js expects.
 * e.g. "_quantized.onnx" is what transformers.js loads for dtype "q8".
 */
const DTYPE_NORMALIZE: Record<string, string> = {
  quantized: "q8",
};

function parseDtype(dtype: any): any {
  if (!dtype) return undefined;
  if (typeof dtype === "string") return DTYPE_NORMALIZE[dtype] ?? dtype;
  // Support JSON object for per-module quantization
  if (typeof dtype === "object") return dtype;
  try {
    return JSON.parse(dtype);
  } catch {
    return dtype;
  }
}

export async function pipelineExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  await applyHfToken();
  const { pipeline } = await import("@huggingface/transformers");

  const task = node.data.task;
  const modelId = inputs.model_id || node.data.model_id || "";
  const device = inputs.device || node.data.device || getDefaultDevice();
  const dtype = inputs.dtype || node.data.dtype || undefined;

  const cacheKey = `${task}:${modelId}:${device}:${JSON.stringify(dtype)}`;

  if (!pipelineCache.has(cacheKey)) {
    ctx.hooks.onModelLoadStart?.(node.id);
    pipelineCache.set(
      cacheKey,
      pipeline(task, modelId || undefined, {
        device: device as any,
        dtype: parseDtype(dtype),
        progress_callback: (info: any) =>
          ctx.hooks.onModelProgress?.(node.id, info),
      }),
    );
  }

  try {
    const pipe = await pipelineCache.get(cacheKey)!;
    ctx.hooks.onModelLoadEnd?.(node.id);

    // Determine primary input based on what's connected
    const primaryInput = inputs.text || inputs.image || inputs.audio;

    // Build kwargs from optional inputs
    const kwargs: Record<string, any> = {};
    if (inputs.labels) {
      kwargs.candidate_labels =
        typeof inputs.labels === "string"
          ? inputs.labels.split(",").map((s: string) => s.trim())
          : inputs.labels;
    }
    if (inputs.context) kwargs.context = inputs.context;
    if (inputs.question) kwargs.question = inputs.question;
    if (inputs.src_lang) kwargs.src_lang = inputs.src_lang;
    if (inputs.tgt_lang) kwargs.tgt_lang = inputs.tgt_lang;
    if (inputs.threshold) kwargs.threshold = parseFloat(inputs.threshold);

    // For question-answering, the API expects (question, context)
    let result;
    if (task === "question-answering") {
      result = await pipe(inputs.question, inputs.context);
    } else if (
      task === "zero-shot-classification" ||
      task === "zero-shot-image-classification" ||
      task === "zero-shot-audio-classification"
    ) {
      result = await pipe(primaryInput, kwargs.candidate_labels, kwargs);
    } else {
      result = await pipe(primaryInput, kwargs);
    }

    // Post-process results for proper display
    let processedResult = result;

    // Convert RawImage objects to data URLs for image output tasks
    if (result && typeof result === "object") {
      if (typeof result.toDataURL === "function") {
        processedResult = await result.toDataURL();
      }
      // Handle array of RawImage objects (e.g. background-removal)
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        typeof result[0]?.toDataURL === "function"
      ) {
        processedResult = await result[0].toDataURL();
      }
      // Depth estimation: convert depth map image and main result
      if (result.depth && typeof result.depth.toDataURL === "function") {
        const depthDataUrl = await result.depth.toDataURL();
        ctx.pushValue(node.id, "depth_map", depthDataUrl);
        if (task === "depth-estimation") {
          processedResult = depthDataUrl;
        }
      }
    }

    // TTS: convert Float32Array audio to playable WAV Blob
    if (
      result &&
      typeof result === "object" &&
      result.audio instanceof Float32Array &&
      result.sampling_rate
    ) {
      processedResult = float32ToWavBlob(result.audio, result.sampling_rate);
    }

    // Extract convenience text outputs from array results
    if (Array.isArray(result) && result.length > 0) {
      const first = result[0];
      if (first?.summary_text !== undefined)
        ctx.pushValue(node.id, "summary_text", first.summary_text);
      if (first?.generated_text !== undefined)
        ctx.pushValue(node.id, "generated_text", first.generated_text);
      if (first?.translation_text !== undefined)
        ctx.pushValue(node.id, "translation_text", first.translation_text);
    }

    const envelope = {
      _pipelineTask: task,
      _visualization: PIPELINE_TASKS[task]?.visualization || "raw-json",
      _sourceImage: inputs.image || undefined,
      _sourceText: inputs.text || inputs.question || undefined,
      _contextText: inputs.context || undefined,
      data: processedResult,
    };
    ctx.pushValue(node.id, "result", envelope);
    ctx.setRunStatus("COMPLETED");
  } catch (err) {
    pipelineCache.delete(cacheKey);
    throw err;
  }
}

export async function modelLoaderExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  await applyHfToken();
  const transformers = await import("@huggingface/transformers");

  const modelClass = node.data.modelClass || "AutoModel";
  const modelId = inputs.model_id || node.data.model_id || "";
  const device = node.data.device || getDefaultDevice();
  const dtype = node.data.dtype || undefined;

  const ModelClass = (transformers as any)[modelClass];
  if (!ModelClass?.from_pretrained) {
    const available = [
      "AutoModel",
      "AutoModelForCausalLM",
      "AutoModelForSeq2SeqLM",
      "AutoModelForMaskedLM",
      "AutoModelForSequenceClassification",
      "AutoModelForTokenClassification",
      "AutoModelForQuestionAnswering",
      "AutoModelForImageClassification",
      "AutoModelForObjectDetection",
      "AutoModelForImageSegmentation",
      "AutoModelForSemanticSegmentation",
      "AutoModelForUniversalSegmentation",
      "AutoModelForMaskGeneration",
      "AutoModelForSpeechSeq2Seq",
      "AutoModelForTextToSpectrogram",
      "AutoModelForTextToWaveform",
      "AutoModelForVision2Seq",
    ];
    throw new Error(
      `Unknown model class: "${modelClass}". Available: ${available.join(", ")}`,
    );
  }

  const cacheKey = `model:${modelClass}:${modelId}:${device}:${JSON.stringify(dtype)}`;

  if (!modelCache.has(cacheKey)) {
    ctx.hooks.onModelLoadStart?.(node.id);
    modelCache.set(
      cacheKey,
      ModelClass.from_pretrained(modelId, {
        device: device as any,
        dtype: parseDtype(dtype),
        progress_callback: (info: any) =>
          ctx.hooks.onModelProgress?.(node.id, info),
      }),
    );
  }

  try {
    const model = await modelCache.get(cacheKey)!;
    ctx.hooks.onModelLoadEnd?.(node.id);
    ctx.pushValue(node.id, "model", model);
  } catch (err) {
    modelCache.delete(cacheKey);
    throw err;
  }
}

export async function tokenizerLoaderExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  await applyHfToken();
  const { AutoTokenizer } = await import("@huggingface/transformers");

  const modelId = inputs.model_id || node.data.model_id || "";
  const cacheKey = `tokenizer:${modelId}`;

  if (!tokenizerCache.has(cacheKey)) {
    ctx.hooks.onModelLoadStart?.(node.id);
    tokenizerCache.set(
      cacheKey,
      AutoTokenizer.from_pretrained(modelId, {
        progress_callback: (info: any) =>
          ctx.hooks.onModelProgress?.(node.id, info),
      }),
    );
  }

  try {
    const tokenizer = await tokenizerCache.get(cacheKey)!;
    ctx.hooks.onModelLoadEnd?.(node.id);
    ctx.pushValue(node.id, "tokenizer", tokenizer);
  } catch (err) {
    tokenizerCache.delete(cacheKey);
    throw err;
  }
}

export async function processorLoaderExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  await applyHfToken();
  const { AutoProcessor } = await import("@huggingface/transformers");

  const modelId = inputs.model_id || node.data.model_id || "";
  const cacheKey = `processor:${modelId}`;

  if (!processorCache.has(cacheKey)) {
    ctx.hooks.onModelLoadStart?.(node.id);
    processorCache.set(
      cacheKey,
      AutoProcessor.from_pretrained(modelId, {
        progress_callback: (info: any) =>
          ctx.hooks.onModelProgress?.(node.id, info),
      }),
    );
  }

  try {
    const processor = await processorCache.get(cacheKey)!;
    ctx.hooks.onModelLoadEnd?.(node.id);
    ctx.pushValue(node.id, "processor", processor);
  } catch (err) {
    processorCache.delete(cacheKey);
    throw err;
  }
}

export async function generateExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const model = inputs.model;
  if (!model) throw new Error("No model connected to Generate node");

  const tensorInputs = inputs.tensors || {};
  const genConfig = inputs.generation_config || {};

  // Build generation params from node data
  const nodeGenParams: Record<string, any> = {};
  for (const key of Object.keys(GENERATION_PARAMS)) {
    if (
      node.data[key] !== undefined &&
      node.data[key] !== GENERATION_PARAMS[key]!.default
    ) {
      nodeGenParams[key] = node.data[key];
    }
  }

  let streamerConfig: Record<string, any> = {};
  if (node.data.useStreamer && inputs.tokenizer) {
    const { TextStreamer } = await import("@huggingface/transformers");
    streamerConfig.streamer = new TextStreamer(inputs.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (token: string) => {
        ctx.pushValue(node.id, "stream", token, true);
      },
    });
  }

  if (!model.generate || typeof model.generate !== "function") {
    throw new Error(
      `Model does not support .generate(). Use a "Model Call" node instead.`,
    );
  }

  const outputs = await model.generate({
    ...tensorInputs,
    ...nodeGenParams,
    ...genConfig,
    ...streamerConfig,
  });

  ctx.pushValue(node.id, "generated_ids", outputs);
  ctx.setRunStatus("COMPLETED");
}

export async function tokenizerEncodeExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const tokenizer = inputs.tokenizer;
  if (!tokenizer) throw new Error("No tokenizer connected");

  const text = inputs.text || "";
  const options: Record<string, any> = {};
  if (node.data.padding) options.padding = node.data.padding;
  if (node.data.truncation) options.truncation = node.data.truncation;
  if (node.data.max_length) options.max_length = parseInt(node.data.max_length);

  const encoded = await tokenizer(text, options);
  ctx.pushValue(node.id, "tensors", encoded);
}

export async function tokenizerDecodeExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const tokenizer = inputs.tokenizer;
  if (!tokenizer) throw new Error("No tokenizer connected");

  const tokenIds = inputs.token_ids;
  const skipSpecial = node.data.skip_special_tokens !== false;

  const decoded = tokenizer.decode(tokenIds, {
    skip_special_tokens: skipSpecial,
  });
  ctx.pushValue(node.id, "text", decoded);
}

export async function processorExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const processor = inputs.processor;
  if (!processor) throw new Error("No processor connected");

  // HF multimodal convention: processor(text, images) or processor(audio)
  const args: any[] = [];
  if (inputs.text) args.push(inputs.text);
  if (inputs.image) {
    const { RawImage } = await import("@huggingface/transformers");
    const img = await RawImage.fromURL(inputs.image);
    args.push(img);
  }
  if (inputs.audio && !inputs.text && !inputs.image) {
    let audioData = inputs.audio;
    // Decode data URL / URL strings to Float32Array for feature extractors (e.g. Whisper)
    if (typeof audioData === "string") {
      const response = await fetch(audioData);
      const arrayBuffer = await response.arrayBuffer();
      const audioCtx = new (
        globalThis.AudioContext ||
        (globalThis as any).webkitAudioContext
      )({ sampleRate: node.data.sampleRate || DEFAULTS.audioSampleRate });
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioData = audioBuffer.getChannelData(0);
      await audioCtx.close();
    }
    args.push(audioData);
  }

  const processed = await processor(...args);
  ctx.pushValue(node.id, "tensors", processed);
}

export async function chatTemplateExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const handler = inputs.tokenizer || inputs.processor;
  if (!handler) throw new Error("No tokenizer/processor connected");

  let messages = inputs.messages;
  if (typeof messages === "string") {
    messages = JSON.parse(messages);
  }

  const options: Record<string, any> = {
    add_generation_prompt: node.data.add_generation_prompt !== false,
  };
  if (node.data.tokenize !== undefined) options.tokenize = node.data.tokenize;

  const result = handler.apply_chat_template(messages, options);
  ctx.pushValue(node.id, "output", result);
}

export async function envConfigExecutor(
  node: FlowNode,
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const { env } = await import("@huggingface/transformers");

  if (node.data.allowRemoteModels !== undefined)
    env.allowRemoteModels = node.data.allowRemoteModels;
  if (node.data.useBrowserCache !== undefined)
    env.useBrowserCache = node.data.useBrowserCache;
  if (node.data.cacheKey !== undefined)
    (env as any).cacheKey = node.data.cacheKey;
  if (node.data.logLevel !== undefined)
    (env as any).logLevel = parseInt(node.data.logLevel);

  ctx.pushValue(node.id, "config", "applied");
}

export function generationConfigExecutor(
  node: FlowNode,
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): void {
  const config: Record<string, any> = {};
  for (const key of Object.keys(GENERATION_PARAMS)) {
    if (node.data[key] !== undefined) {
      config[key] = node.data[key];
    }
  }
  ctx.pushValue(node.id, "config", config);
}

export async function audioInputExecutor(
  node: FlowNode,
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  let val = node.data.value;
  if (val && (val.startsWith("http://") || val.startsWith("https://"))) {
    try {
      const res = await fetch(val);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const blob = await res.blob();
      val = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err: any) {
      throw new Error(
        `Failed to fetch audio from URL: ${err.message}. (Check CORS policies)`,
      );
    }
  }
  ctx.pushValue(node.id, "audio", val);
}

export function audioOutputExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): void {
  ctx.setDisplayData(node.id, inputs.audio, false);
}

/* ── Model Call Executor (forward pass, no .generate()) ──────────────── */

export async function modelCallExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const model = inputs.model;
  if (!model) throw new Error("No model connected to Model Call node");

  const tensorInputs = inputs.tensors || {};
  const outputs = await model(tensorInputs);
  ctx.pushValue(node.id, "outputs", outputs);
  ctx.setRunStatus("COMPLETED");
}

/* ── Post-Process Call Executor ──────────────────────────────────────── */

export async function postProcessCallExecutor(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const category: string = node.data.postProcessCategory || "base";
  const rawOutputs = inputs.outputs;
  if (!rawOutputs) throw new Error("No outputs connected to Post-Process node");

  const tokenizer = inputs.tokenizer;
  const processor = inputs.processor;
  const encodedInputs = inputs.encoded_inputs;

  let result: any;

  switch (category) {
    case "masked-lm": {
      if (!tokenizer) throw new Error("Masked LM post-processing requires a tokenizer");
      const logits = rawOutputs.logits;
      if (!logits) {
        result = { predictions: [], raw: rawOutputs };
        break;
      }
      const inputIds = encodedInputs?.input_ids;
      const topK = node.data.topK || DEFAULTS.maskedLmTopK;
      const predictions: any[] = [];

      if (inputIds) {
        const ids = inputIds.tolist ? inputIds.tolist()[0] : Array.from(inputIds.data || []);
        const maskTokenId = tokenizer.model?.tokens_to_ids?.get("[MASK]") ?? tokenizer.convert_tokens_to_ids?.("[MASK]") ?? 103;

        for (let i = 0; i < ids.length; i++) {
          if (ids[i] === maskTokenId) {
            const tokenLogits: number[] = logits.data
              ? Array.from(logits.data.slice(i * logits.dims[2], (i + 1) * logits.dims[2]) as ArrayLike<number>)
              : [];
            const indexed = tokenLogits.map((v, idx) => ({ v, idx }));
            indexed.sort((a, b) => b.v - a.v);
            const topTokens = indexed.slice(0, topK);

            // Softmax over top-k
            const maxVal = topTokens[0]?.v ?? 0;
            const exps = topTokens.map((t) => Math.exp(t.v - maxVal));
            const sumExp = exps.reduce((a, b) => a + b, 0);

            for (let j = 0; j < topTokens.length; j++) {
              const decoded = tokenizer.decode([topTokens[j]!.idx], { skip_special_tokens: true });
              predictions.push({
                position: i,
                token: decoded.trim(),
                score: exps[j]! / sumExp,
              });
            }
          }
        }
      }
      result = { predictions };
      break;
    }

    case "sequence-classification": {
      const logits = rawOutputs.logits;
      if (!logits) { result = { labels: [] }; break; }
      const data: number[] = logits.data ? Array.from(logits.data as ArrayLike<number>) : [];
      // Softmax
      const maxVal = Math.max(...data);
      const exps = data.map((v) => Math.exp(v - maxVal));
      const sumExp = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((v) => v / sumExp);
      result = {
        labels: probs.map((score: number, i: number) => ({
          label: `LABEL_${i}`,
          score,
        })).sort((a: any, b: any) => b.score - a.score),
      };
      break;
    }

    case "token-classification": {
      const logits = rawOutputs.logits;
      if (!logits || !tokenizer || !encodedInputs) {
        result = { entities: [] };
        break;
      }
      const seqLen = logits.dims[1];
      const numLabels = logits.dims[2];
      const entities: any[] = [];
      const inputIds = encodedInputs.input_ids;
      const ids = inputIds?.tolist ? inputIds.tolist()[0] : Array.from(inputIds?.data || []);

      for (let i = 0; i < seqLen; i++) {
        const tokenLogits: number[] = Array.from(
          logits.data.slice(i * numLabels, (i + 1) * numLabels) as ArrayLike<number>,
        );
        const argmax = tokenLogits.indexOf(Math.max(...tokenLogits));
        if (argmax > 0) {
          const token = tokenizer.decode([ids[i]], { skip_special_tokens: false });
          entities.push({ index: i, token: token.trim(), label: `LABEL_${argmax}` });
        }
      }
      result = { entities };
      break;
    }

    case "question-answering": {
      const startLogits = rawOutputs.start_logits;
      const endLogits = rawOutputs.end_logits;
      if (!startLogits || !endLogits || !tokenizer || !encodedInputs) {
        result = { answer: "", score: 0 };
        break;
      }
      const sData: number[] = Array.from(startLogits.data as ArrayLike<number>);
      const eData: number[] = Array.from(endLogits.data as ArrayLike<number>);
      const startIdx = sData.indexOf(Math.max(...sData));
      const endIdx = eData.indexOf(Math.max(...eData));
      const inputIds = encodedInputs.input_ids;
      const ids = inputIds?.tolist ? inputIds.tolist()[0] : Array.from(inputIds?.data || []);
      const answerIds = ids.slice(startIdx, endIdx + 1);
      const answer = tokenizer.decode(answerIds, { skip_special_tokens: true });
      result = {
        answer: answer.trim(),
        score: (sData[startIdx] as number) + (eData[endIdx] as number),
        start: startIdx,
        end: endIdx,
      };
      break;
    }

    case "image-classification": {
      const logits = rawOutputs.logits;
      if (!logits) { result = { labels: [] }; break; }
      const data: number[] = logits.data ? Array.from(logits.data as ArrayLike<number>) : [];
      const maxVal = Math.max(...data);
      const exps = data.map((v) => Math.exp(v - maxVal));
      const sumExp = exps.reduce((a, b) => a + b, 0);
      const probs = exps.map((v) => v / sumExp);
      result = {
        labels: probs.map((score: number, i: number) => ({
          label: `CLASS_${i}`,
          score,
        })).sort((a: any, b: any) => b.score - a.score).slice(0, 10),
      };
      break;
    }

    case "object-detection": {
      if (processor?.post_process_object_detection) {
        try {
          result = processor.post_process_object_detection(rawOutputs);
          break;
        } catch { /* fallthrough */ }
      }
      result = {
        logits: rawOutputs.logits ? "tensor" : undefined,
        pred_boxes: rawOutputs.pred_boxes ? "tensor" : undefined,
        raw: rawOutputs,
      };
      break;
    }

    case "image-segmentation":
    case "semantic-segmentation":
    case "universal-segmentation": {
      result = {
        masks: rawOutputs.pred_masks || rawOutputs.masks_queries_logits || rawOutputs.logits,
        raw: rawOutputs,
      };
      break;
    }

    case "mask-generation": {
      result = {
        iou_scores: rawOutputs.iou_scores,
        pred_masks: rawOutputs.pred_masks,
      };
      break;
    }

    case "spectrogram": {
      // SpeechT5 raw call output - spectrogram frames
      // Note: Full TTS requires generate_speech() with speaker embeddings + vocoder
      // The call-only workflow outputs raw logits/spectrogram data
      result = {
        spectrogram: rawOutputs.spectrogram || rawOutputs.logits,
        raw: rawOutputs,
      };
      break;
    }

    case "text-to-waveform": {
      const waveform = rawOutputs.waveform;
      if (waveform) {
        const samples =
          waveform instanceof Float32Array
            ? waveform
            : waveform.data
              ? new Float32Array(waveform.data)
              : null;
        if (samples) {
          result = float32ToWavBlob(samples, node.data.sampleRate || DEFAULTS.audioSampleRate);
          break;
        }
      }
      result = rawOutputs;
      break;
    }

    case "base":
    default: {
      result = rawOutputs;
      break;
    }
  }

  ctx.pushValue(node.id, "result", result);
  ctx.setRunStatus("COMPLETED");
}
