import { GENERATION_PARAMS } from "@/config/generationDefaults.ts";
import { PIPELINE_TASKS } from "@/config/pipelineRegistry.ts";
import type { GraphRunner } from "@/engine/GraphRunner.ts";
import type { FlowNode } from "@/types.ts";

// Caches to avoid reloading models/pipelines
const pipelineCache = new Map<string, Promise<any>>();
const modelCache = new Map<string, Promise<any>>();
const tokenizerCache = new Map<string, Promise<any>>();
const processorCache = new Map<string, Promise<any>>();

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

function parseDtype(dtype: any): any {
  if (!dtype) return undefined;
  if (typeof dtype === "string") return dtype;
  // Support JSON string for per-module quantization
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
  const { pipeline } = await import("@huggingface/transformers");

  const task = node.data.task;
  const modelId = inputs.model_id || node.data.model_id || "";
  const device = inputs.device || node.data.device || "wasm";
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
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const transformers = await import("@huggingface/transformers");

  const modelClass = node.data.modelClass || "AutoModel";
  const modelId = node.data.model_id || "";
  const device = node.data.device || "wasm";
  const dtype = node.data.dtype || undefined;

  const ModelClass = (transformers as any)[modelClass];
  if (!ModelClass?.from_pretrained) {
    throw new Error(`Unknown model class: ${modelClass}`);
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
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const { AutoTokenizer } = await import("@huggingface/transformers");

  const modelId = node.data.model_id || "";
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
  _inputs: Record<string, any>,
  ctx: GraphRunner,
): Promise<void> {
  const { AutoProcessor } = await import("@huggingface/transformers");

  const modelId = node.data.model_id || "";
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
      )({ sampleRate: 16000 });
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
