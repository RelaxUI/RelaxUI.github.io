import type { GraphRunner } from "@/engine/GraphRunner.ts";
import {
  audioInputExecutor,
  audioOutputExecutor,
  chatTemplateExecutor,
  envConfigExecutor,
  generateExecutor,
  generationConfigExecutor,
  modelLoaderExecutor,
  pipelineExecutor,
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

  customScript: (node, inputs, ctx, isStream) => {
    if (!isStream) {
      const inputKeys = node.data.inputs || ["in1", "in2", "in3", "in4"];
      const funcArgs = inputKeys.map((k: string) => inputs[k]);
      const func = new Function(...inputKeys, node.data.script);
      const res = func(...funcArgs);
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
      throw new Error(`Fetch failed: ${err.message}. Check Network.`);
    }

    if (!res.ok) {
      let text = await res.text();
      try {
        text = JSON.parse(text).error.message || text;
      } catch (_e) {
        /* ignore */
      }
      throw new Error(`${res.status}: ${text}`);
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
            } catch (_e) {
              console.error("JSON parse error on stream chunk", _e);
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
    const resolve = (obj: any, p: string) =>
      p
        .replace(/\["?'?([^"']+)"?'?\]/g, ".$1")
        .split(".")
        .reduce((a: any, c: string) => a && a[c], obj);
    let val = resolve(inputs.json, node.data.path);
    if (val === undefined)
      val = resolve(
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
      { in1: inputs.in1, in2: inputs.in2, annotations: inputs.annotations },
      false,
    );
  },

  olderInput: (node, inputs, ctx) => {
    ctx.pushValue(node.id, "out", node.data.value || []);
  },

  batchIterator: async (node, inputs, ctx, isStream) => {
    let list = inputs.list;
    if (typeof list === "string") {
      try {
        list = JSON.parse(list);
      } catch {
        /* not JSON */
      }
    }
    if (!Array.isArray(list)) return;
    const batchSize = node.data.batchSize || 1;
    const delayMs = node.data.delayMs ?? 1000;

    for (let i = 0; i < list.length; i += batchSize) {
      if (!ctx.isRunning) break;
      const chunk = list.slice(i, i + batchSize);
      const outVal = batchSize === 1 ? chunk[0] : chunk;

      ctx.setDisplayData(
        node.id,
        {
          current: Math.min(i + batchSize, list.length),
          total: list.length,
          item: outVal,
        },
        false,
      );

      ctx.pushValue(node.id, "item", outVal, true);

      if (i + batchSize < list.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    ctx.setRunStatus("COMPLETED");
  },

  delay: async (node, inputs, ctx, isStream) => {
    const delayMs = node.data.delayMs ?? 1000;
    await new Promise((r) => setTimeout(r, delayMs));
    ctx.pushValue(node.id, "out", inputs.in, isStream);
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
    ctx.setDisplayData(node.id, inputs.in, false);
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
