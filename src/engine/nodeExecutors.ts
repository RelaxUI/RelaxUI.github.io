import { DEFAULTS } from "@/config/defaults.ts";
import type { GraphRunner } from "@/engine/GraphRunner.ts";
import {
  audioInputExecutor,
  audioOutputExecutor,
  chatTemplateExecutor,
  envConfigExecutor,
  generateExecutor,
  generationConfigExecutor,
  modelCallExecutor,
  modelLoaderExecutor,
  pipelineExecutor,
  postProcessCallExecutor,
  processorExecutor,
  processorLoaderExecutor,
  tokenizerDecodeExecutor,
  tokenizerEncodeExecutor,
  tokenizerLoaderExecutor,
} from "@/engine/transformersExecutor.ts";
import type { FlowNode } from "@/types.ts";

type Executor = (
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
  isStream: boolean,
) => Promise<void> | void;

/** Resolve a dot-notation path against an object (shared by jsonPath & pollUntil). */
function resolveJsonPath(obj: any, path: string): any {
  return path
    .replace(/\["?'?([^"']+)"?'?\]/g, ".$1")
    .split(".")
    .reduce((a: any, c: string) => a && a[c], obj);
}

const executors: Record<string, Executor> = {
  inputText: (node, _inputs, ctx) => {
    ctx.pushValue(node.id, "out", node.data.value);
  },

  inputImage: async (node, _inputs, ctx) => {
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
          `Failed to fetch image from URL: ${err.message}. (Check CORS policies)`,
        );
      }
    }
    ctx.pushValue(node.id, "out", val);
  },

  macroConnections: (node, _inputs, ctx) => {
    const validOutNodes = ctx.nodes.filter(
      (n) => n.macroId === node.macroId && n.type === "macroOutput",
    );
    const validPorts = new Set(validOutNodes.map((n) => n.data.param));
    const externalEdges = ctx.edges.filter((e) => e.source === node.macroId);
    const activePorts = [
      ...new Set(externalEdges.map((e) => e.sourceHandle)),
    ].filter((port) => validPorts.has(port as string));
    ctx.pushValue(node.id, "out", activePorts, false);
  },

  macroInParam: (node, _inputs, ctx) => {
    const parent = ctx.nodes.find((n) => n.id === node.macroId);
    ctx.pushValue(node.id, "out", parent?.data?.[node.data.param], false);
  },

  macroInEdge: (node, inputs, ctx, isStream) => {
    ctx.pushValue(node.id, "out", inputs["in"], isStream);
  },

  macroOutput: (node, inputs, ctx, isStream) => {
    ctx.pushValue(node.id, "in", inputs["in"], isStream);
  },

  customScript: async (node, inputs, ctx, isStream) => {
    if (!isStream) {
      const inputKeys = node.data.inputs || ["in1", "in2", "in3", "in4"];
      const funcArgs = inputKeys.map((k: string) => inputs[k]);
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const func = new AsyncFunction(...inputKeys, node.data.script);
      const res = await func(...funcArgs);
      ctx.pushValue(node.id, "out", res);
    }
  },

  httpRequest: async (node, inputs, ctx, isStream) => {
    if (isStream) return;
    let { method, url, headers, body } = inputs;
    if (!url) return;

    let res: Response;
    try {
      res = await fetch(url, {
        method: method || "GET",
        headers: headers ? JSON.parse(headers) : {},
        body: method !== "GET" && body ? body : undefined,
      });
    } catch (err: any) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        throw new Error(`Request to ${url} blocked (CORS or network error). The API may not allow direct browser requests.`);
      }
      throw new Error(`Fetch failed: ${err.message}`);
    }

    if (!res.ok) {
      let text = await res.text();
      try {
        text = JSON.parse(text).error?.message || JSON.parse(text).detail || text;
      } catch {
        // Response body is not JSON; use raw text
      }
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    if (
      res.headers.get("content-type")?.includes("event-stream") ||
      (body && JSON.parse(body).stream)
    ) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (ctx.isRunning) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop()!;

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const d = line.slice(6).trim();
            if (d === "[DONE]") {
              ctx.setRunStatus("COMPLETED");
              continue;
            }
            try {
              const parsed = JSON.parse(d);
              ctx.pushValue(node.id, "out", parsed, true);
            } catch {
              // Malformed SSE chunk; skip
            }
          }
        }
      }
    } else {
      const json = await res.json();
      ctx.pushValue(node.id, "out", json, false);
      ctx.setRunStatus("COMPLETED");
    }
  },

  jsonPath: (node, inputs, ctx, isStream) => {
    if (!inputs.json) return;
    let val = resolveJsonPath(inputs.json, node.data.path);
    if (val === undefined)
      val = resolveJsonPath(
        inputs.json,
        node.data.path.replace(".delta.", ".message."),
      );
    if (val !== undefined) ctx.pushValue(node.id, "out", val, isStream);
  },

  outputText: (node, inputs, ctx) => {
    ctx.setDisplayData(node.id, inputs.in, false);
  },

  outputImage: (node, inputs, ctx) => {
    ctx.setDisplayData(
      node.id,
      { in1: inputs.in1, in2: inputs.in2 },
      false,
    );
  },

  universalOutput: (node, inputs, ctx) => {
    // Unwrap pipeline envelopes for image handles only
    const unwrap = (v: any) =>
      v && typeof v === "object" && v._visualization ? v.data : v;
    const img1 = unwrap(inputs.img1);
    const img2 = unwrap(inputs.img2);
    ctx.setDisplayData(
      node.id,
      { data: inputs.data, img1, img2 },
      false,
    );
  },

  folderInput: (node, _inputs, ctx) => {
    const files = node.data.value || [];
    ctx.pushValue(node.id, "out", files);

    // Category-filtered outputs
    const meta: any[] = node.data.fileMeta || [];
    const images = meta.filter((f: any) => f.category === "image").map((f: any) => f.url);
    const audio = meta.filter((f: any) => f.category === "audio").map((f: any) => f.url);
    const text = meta.filter((f: any) => f.category === "text").map((f: any) => f.url);
    const video = meta.filter((f: any) => f.category === "video").map((f: any) => f.url);
    if (images.length > 0) ctx.pushValue(node.id, "images", images);
    if (audio.length > 0) ctx.pushValue(node.id, "audio", audio);
    if (text.length > 0) ctx.pushValue(node.id, "text", text);
    if (video.length > 0) ctx.pushValue(node.id, "video", video);
  },

  batchIterator: async (node, inputs, ctx, isStream) => {
    let list = inputs.list;
    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch {
        // Input is a plain string, not a JSON array
      }
    }
    if (!Array.isArray(list)) return;
    const batchSize = node.data.batchSize || 1;
    const delayMs = node.data.delayMs ?? DEFAULTS.batchDelayMs;

    // Clear any previous stop signal so re-runs work
    ctx.stoppedNodes.delete(node.id);
    ctx.pausedNodes.delete(node.id);

    for (let i = 0; i < list.length; i += batchSize) {
      if (!ctx.isRunning || ctx.stoppedNodes.has(node.id)) break;

      // Wait if paused
      const shouldContinue = await ctx.waitIfPaused(node.id);
      if (!shouldContinue || !ctx.isRunning) break;

      const chunk = list.slice(i, i + batchSize);
      const outVal = batchSize === 1 ? chunk[0] : chunk;

      ctx.setDisplayData(
        node.id,
        {
          current: Math.min(i + batchSize, list.length),
          total: list.length,
          item: outVal,
          paused: ctx.pausedNodes.has(node.id),
          stopped: ctx.stoppedNodes.has(node.id),
        },
        false,
      );

      const downstream = ctx.pushValue(node.id, "item", outVal, false);
      await Promise.all(downstream);

      if (node.data.manualStep && ctx.isRunning && !ctx.stoppedNodes.has(node.id)) {
        const progressData = {
          current: Math.min(i + batchSize, list.length),
          total: list.length,
          item: outVal,
          paused: false,
          stopped: false,
        };
        ctx.setDisplayData(node.id, { ...progressData, waitingForStep: true }, false);
        const stepResult = await new Promise<any>((resolve, reject) => {
          ctx.pendingApprovals.set(node.id, { resolve, reject });
        });
        ctx.pendingApprovals.delete(node.id);
        if (stepResult.action === "rework") { i -= batchSize; continue; }
      }

      if (i + batchSize < list.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // Final display data update
    const wasStopped = ctx.stoppedNodes.has(node.id);
    ctx.stoppedNodes.delete(node.id);
    ctx.pausedNodes.delete(node.id);

    if (wasStopped) {
      ctx.setDisplayData(node.id, { current: 0, total: list.length }, false);
    }
  },

  delay: async (node, inputs, ctx, isStream) => {
    const delayMs = node.data.delayMs ?? DEFAULTS.batchDelayMs;
    await new Promise((r) => setTimeout(r, delayMs));
    ctx.pushValue(node.id, "out", inputs.in, isStream);
  },

  converter: async (node, inputs, ctx) => {
    const val = inputs.in;
    if (val === undefined || val === null) return;
    const src = typeof val === "string" ? val : JSON.stringify(val);
    const target = node.data.outputFormat || "dataURI";

    // Detect source type
    const isBlob = src.startsWith("blob:");
    const isDataURI = src.startsWith("data:");
    const isURL = src.startsWith("http://") || src.startsWith("https://");

    let result: any = src;

    if (target === "auto") {
      // Pass-through
      result = val;
    } else if (target === "dataURI") {
      if (isDataURI) {
        result = src;
      } else if (isBlob || isURL) {
        const res = await fetch(src);
        const blob = await res.blob();
        result = await new Promise<string>((resolve, reject) => {
          const rd = new FileReader();
          rd.onloadend = () => resolve(rd.result as string);
          rd.onerror = reject;
          rd.readAsDataURL(blob);
        });
      } else {
        // Text → data URI
        result = "data:text/plain;base64," + btoa(unescape(encodeURIComponent(src)));
      }
    } else if (target === "blob") {
      if (isBlob) {
        result = src;
      } else if (isDataURI) {
        const res = await fetch(src);
        const blob = await res.blob();
        result = URL.createObjectURL(blob);
      } else if (isURL) {
        const res = await fetch(src);
        const blob = await res.blob();
        result = URL.createObjectURL(blob);
      } else {
        const blob = new Blob([src], { type: "text/plain" });
        result = URL.createObjectURL(blob);
      }
    } else if (target === "url") {
      // Pass URL through; for blob/dataURI warn that it can't produce a public URL
      if (isURL) {
        result = src;
      } else {
        result = src;
      }
    } else if (target === "text") {
      if (isBlob || isURL) {
        const res = await fetch(src);
        result = await res.text();
      } else if (isDataURI) {
        const m = src.match(/^data:[^;]*;base64,(.*)$/);
        if (m) {
          result = decodeURIComponent(escape(atob(m[1]!)));
        } else {
          result = src;
        }
      } else {
        result = src;
      }
    } else if (target === "json") {
      if (isBlob || isURL) {
        const res = await fetch(src);
        result = await res.json();
      } else {
        try {
          result = JSON.parse(src);
        } catch {
          result = src;
        }
      }
    }

    ctx.pushValue(node.id, "out", result);
  },

  pollUntil: async (node, inputs, ctx) => {
    const url = inputs.url;
    if (!url) return;
    const headers = inputs.headers ? JSON.parse(inputs.headers) : {};
    // Content-Type is meaningless for GET requests and can trigger CORS preflight failures
    delete headers["Content-Type"];
    delete headers["content-type"];
    const resultUrl = inputs.resultUrl;
    const interval = Math.max(500, node.data.interval ?? 2000);
    const statusPath = node.data.statusPath || "status";
    const doneValue = node.data.doneValue || "COMPLETED";
    const failValue = node.data.failValue || "";

    let count = 0;
    while (ctx.isRunning) {
      count++;
      let res: Response;
      try {
        res = await fetch(url, { headers });
      } catch (err: any) {
        if (err instanceof TypeError && err.message === "Failed to fetch") {
          throw new Error(`Poll request to ${url} blocked (CORS or network error). The API may not allow status polling from the browser.`);
        }
        throw new Error(`Poll request failed: ${err.message}`);
      }
      if (!res.ok) {
        let text = "";
        try { text = await res.text(); } catch { /* empty */ }
        throw new Error(`Poll request failed: HTTP ${res.status}${text ? ` — ${text}` : ""}`);
      }
      const json = await res.json();
      const currentStatus = String(resolveJsonPath(json, statusPath) ?? "");

      ctx.setDisplayData(node.id, { status: currentStatus, count, polling: true }, false);

      if (currentStatus === doneValue) {
        let result = json;
        if (resultUrl) {
          let resultRes: Response;
          try {
            resultRes = await fetch(resultUrl, { headers });
          } catch (err: any) {
            if (err instanceof TypeError && err.message === "Failed to fetch") {
              throw new Error(`Result fetch from ${resultUrl} blocked (CORS or network error).`);
            }
            throw new Error(`Result fetch failed: ${err.message}`);
          }
          if (!resultRes.ok) throw new Error(`Result fetch failed: HTTP ${resultRes.status}`);
          result = await resultRes.json();
        }
        ctx.setDisplayData(node.id, { status: "done", count, polling: false }, false);
        ctx.pushValue(node.id, "out", result);
        return;
      }
      if (failValue && currentStatus === failValue) {
        ctx.setDisplayData(node.id, { status: currentStatus, count, polling: false }, false);
        throw new Error(`Queue job failed with status: ${currentStatus}`);
      }

      await new Promise((r) => setTimeout(r, interval));
    }
  },

  listAggregator: (node, inputs, ctx, isStream) => {
    // Store list inside the node's volatile execution data so we can append to it
    if (!node.data._internalList) node.data._internalList = [];
    // Handle the manual user UI reset
    if (node.data.resetTrigger !== node.data._lastReset) {
      node.data._internalList = [];
      node.data._lastReset = node.data.resetTrigger;
    }
    if (inputs.item !== undefined) {
      node.data._internalList.push(inputs.item);
      ctx.setDisplayData(node.id, [...node.data._internalList], false);
      ctx.pushValue(node.id, "list", [...node.data._internalList], isStream);
    }
  },

  downloadData: (node, inputs, ctx, isStream) => {
    ctx.setDisplayData(node.id, { data: inputs.in, name: inputs.name }, false);
  },

  imageProcess: async (node, inputs, ctx) => {
    const dataUrl = inputs.image;
    if (!dataUrl) return;

    const DIMENSIONS: Record<string, [number, number]> = {
      "1:1": [1024, 1024], "2:3": [832, 1248], "3:2": [1248, 832],
      "3:4": [864, 1184], "4:3": [1184, 864], "4:5": [896, 1152],
      "5:4": [1152, 896], "9:16": [768, 1344], "16:9": [1344, 768],
      "21:9": [1536, 672],
    };

    const aspectRatio = node.data.aspectRatio || "original";
    const resolution = node.data.resolution || "1K";
    const cropAnchor = node.data.cropAnchor || "MC";
    const outputFormat = node.data.outputFormat || "original";
    const quality = (node.data.quality ?? 95) / 100;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    let dw = img.width;
    let dh = img.height;

    if (aspectRatio !== "original" && DIMENSIONS[aspectRatio]) {
      const mult = resolution === "4K" ? 4 : resolution === "2K" ? 2 : 1;
      [dw, dh] = DIMENSIONS[aspectRatio]!;
      dw *= mult;
      dh *= mult;
    }

    // Crop source region based on anchor
    const srcAspect = img.width / img.height;
    const dstAspect = dw / dh;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (srcAspect > dstAspect) {
      sw = img.height * dstAspect;
      const anchorCol = cropAnchor[1] === "L" ? 0 : cropAnchor[1] === "R" ? 1 : 0.5;
      sx = (img.width - sw) * anchorCol;
    } else {
      sh = img.width / dstAspect;
      const anchorRow = cropAnchor[0] === "T" ? 0 : cropAnchor[0] === "B" ? 1 : 0.5;
      sy = (img.height - sh) * anchorRow;
    }

    const canvas = new OffscreenCanvas(dw, dh);
    const ctx2d = canvas.getContext("2d")!;
    ctx2d.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

    let mime = "image/png";
    if (outputFormat === "jpg") mime = "image/jpeg";
    else if (outputFormat === "webp") mime = "image/webp";
    else if (outputFormat === "png") mime = "image/png";
    else if (dataUrl.startsWith("data:")) {
      const m = dataUrl.match(/^data:(image\/[^;]+)/);
      if (m) mime = m[1]!;
    }

    const blob = await canvas.convertToBlob({ type: mime, quality });
    const result = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    ctx.pushValue(node.id, "out", result);
    ctx.setRunStatus("COMPLETED");
  },

  reviewNode: async (node, inputs, ctx) => {
    const data = inputs.in;
    ctx.setDisplayData(node.id, { data, status: "pending" }, false);

    const result = await new Promise<any>((resolve, reject) => {
      ctx.pendingApprovals.set(node.id, { resolve, reject });
    });
    ctx.pendingApprovals.delete(node.id);

    if (result.action === "approve") {
      ctx.setDisplayData(node.id, { data: result.value, status: "approved" }, false);
      ctx.pushValue(node.id, "out", result.value);
    } else if (result.action === "rework") {
      ctx.setDisplayData(node.id, { data, status: "reworking" }, false);
      const incomingEdge = ctx.edges.find(
        (e) => e.target === node.id && e.targetHandle === "in",
      );
      if (incomingEdge) {
        await ctx.executeNode(incomingEdge.source);
      }
    } else {
      ctx.setDisplayData(node.id, { data, status: "cancelled" }, false);
    }
  },

  // Transformers.js executors
  transformersPipeline: pipelineExecutor,
  transformersModelLoader: modelLoaderExecutor,
  transformersTokenizerLoader: tokenizerLoaderExecutor,
  transformersProcessorLoader: processorLoaderExecutor,
  transformersGenerate: generateExecutor,
  transformersTokenizerEncode: tokenizerEncodeExecutor,
  transformersTokenizerDecode: tokenizerDecodeExecutor,
  transformersProcessor: processorExecutor,
  transformersChatTemplate: chatTemplateExecutor,
  transformersEnvConfig: envConfigExecutor,
  transformersGenerationConfig: generationConfigExecutor,
  audioInput: audioInputExecutor,
  audioOutput: audioOutputExecutor,
  videoInput: (node: FlowNode, _inputs: Record<string, any>, ctx: GraphRunner) => {
    ctx.pushValue(node.id, "video", node.data.value);
  },
  transformersModelCall: modelCallExecutor,
  transformersPostProcessCall: postProcessCallExecutor,
};

export async function executeNode(
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
  isStream: boolean,
): Promise<void> {
  const executor = executors[node.type!];
  if (executor) {
    await executor(node, inputs, ctx, isStream);
  }
}
