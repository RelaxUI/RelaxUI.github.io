import { DEFAULTS } from "@/config/defaults.ts";
import type { GraphRunner } from "@/engine/GraphRunner.ts";
import { blobToDataUrl, fetchAsDataUrl } from "@/utils/dataUrl.ts";
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
import { readSetting } from "@/hooks/useSettings.ts";
import type { FlowNode } from "@/types.ts";

type Executor = (
  node: FlowNode,
  inputs: Record<string, any>,
  ctx: GraphRunner,
  isStream: boolean,
) => Promise<void> | void;

/**
 * Find all root ancestor nodes (no incoming edges) reachable from `startNodeId`,
 * excluding paths through `excludeNodeId`.
 */
function findRootAncestors(
  edges: import("@xyflow/react").Edge[],
  startNodeId: string,
  excludeNodeId: string | null,
): string[] {
  const visited = new Set<string>();
  const roots: string[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    if (excludeNodeId && nodeId === excludeNodeId) return;
    visited.add(nodeId);

    const incoming = edges.filter(
      (e) => e.target === nodeId && e.source !== excludeNodeId,
    );
    if (incoming.length === 0) {
      roots.push(nodeId);
    } else {
      for (const e of incoming) dfs(e.source);
    }
  }

  dfs(startNodeId);
  return roots;
}

/**
 * Find all node IDs reachable downstream from a set of start node IDs,
 * traversing edges forward.
 */
function findAllDownstream(
  edges: import("@xyflow/react").Edge[],
  startIds: string[],
  excludeNodeId: string,
): string[] {
  const visited = new Set<string>();
  const queue = [...startIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id) || id === excludeNodeId) continue;
    visited.add(id);
    const outgoing = edges.filter((e) => e.source === id);
    for (const e of outgoing) {
      if (!visited.has(e.target)) queue.push(e.target);
    }
  }
  return Array.from(visited);
}

/**
 * Delete a target's receivedInputs entry for a handle, accounting for macro
 * redirect (macroInEdge nodes that replace the target handle at start time).
 */
function resolveAndDelete(
  ctx: GraphRunner,
  targetId: string,
  handle: string,
) {
  const targetNode = ctx.getNode(targetId);
  if (targetNode?.type === "macroNode") {
    const mIn = ctx.nodes.find(
      (n) =>
        n.macroId === targetId &&
        n.type === "macroInEdge" &&
        n.data.param === handle,
    );
    if (mIn) {
      delete ctx.receivedInputs[mIn.id];
      return;
    }
  }
  delete ctx.receivedInputs[targetId];
}

/**
 * Find the nearest ancestor node of a given type by traversing edges upward.
 */
function findAncestorOfType(
  edges: import("@xyflow/react").Edge[],
  ctx: GraphRunner,
  startNodeId: string,
  targetType: string,
): FlowNode | null {
  const visited = new Set<string>();
  const queue = [startNodeId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const incoming = edges.filter((e) => e.target === id);
    for (const e of incoming) {
      const srcNode = ctx.getNode(e.source);
      if (srcNode?.type === targetType) return srcNode;
      queue.push(e.source);
    }
  }
  return null;
}

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
        val = await fetchAsDataUrl(val);
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
    const parent = ctx.getLiveNode(node.macroId!);
    ctx.pushValue(node.id, "out", parent?.data?.[node.data.param], false);
  },

  macroInSettings: (node, _inputs, ctx) => {
    const macroSettings = readSetting("macroSettings");
    ctx.pushValue(node.id, "out", macroSettings[node.data.param] || "", false);
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
      let parsedHeaders: Record<string, string> = {};
      if (headers) {
        try { parsedHeaders = JSON.parse(headers); } catch {
          throw new Error("HTTP Request: headers input is not valid JSON");
        }
      }
      res = await fetch(url, {
        method: method || "GET",
        headers: parsedHeaders,
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
        const parsed = JSON.parse(text);
        text = parsed.error?.message || parsed.detail || text;
      } catch {
        // Response body is not JSON; use raw text
      }
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    let isSSE = res.headers.get("content-type")?.includes("event-stream") || false;
    if (!isSSE && body) {
      try { isSSE = !!JSON.parse(body).stream; } catch { /* body is not JSON */ }
    }
    if (isSSE) {
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
            if (d === "[DONE]") continue;
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
        ctx._log("batch", `step action="${stepResult.action}" index=${i} total=${list.length}`);
        if (stepResult.action === "rework") {
          ctx._log("rework", `batchIterator[${node.id}] rework requested at index ${i}`);
          ctx.beginRework();
          const itemEdges = ctx.edges.filter(
            (e) => e.source === node.id && e.sourceHandle === "item",
          );

          const allRoots = new Set<string>();

          // 1. Find ALL nodes in the downstream subgraph. For each,
          //    clear receivedInputs and collect internal root nodes.
          const downstreamIds = findAllDownstream(
            ctx.edges,
            itemEdges.map((e) => e.target),
            node.id,
          );
          for (const dsId of downstreamIds) {
            const dsNode = ctx.getNode(dsId);
            if (dsNode?.type === "macroNode") {
              const internalNodes = ctx.nodes.filter(
                (n) => n.macroId === dsId,
              );
              for (const n of internalNodes)
                delete ctx.receivedInputs[n.id];
              for (const n of internalNodes) {
                if (
                  !ctx.expectedInputs[n.id] ||
                  ctx.expectedInputs[n.id]!.size === 0
                )
                  allRoots.add(n.id);
              }
            } else {
              delete ctx.receivedInputs[dsId];
            }
            ctx.cancelPendingExec(dsId);
          }

          for (const ie of itemEdges) {
            resolveAndDelete(ctx, ie.target, ie.targetHandle!);
          }

          // 2. Collect external root ancestors for ALL downstream nodes
          //    (not just direct item edge targets — covers macro external inputs)
          ctx._log("rework", "downstream nodes:", downstreamIds);
          const downstreamSet = new Set(downstreamIds);
          for (const dsId of downstreamIds) {
            const externalEdges = ctx.edges.filter(
              (e) =>
                e.target === dsId &&
                !downstreamSet.has(e.source) &&
                e.source !== node.id,
            );
            for (const ee of externalEdges) {
              for (const r of findRootAncestors(ctx.edges, ee.source, node.id))
                allRoots.add(r);
            }
          }

          // 3. Re-execute each root once
          ctx._log("rework", "re-executing roots:", [...allRoots]);
          for (const rootId of allRoots) await ctx.executeNode(rootId);

          // 4. Wait for the full cascade (including async HTTP/polling)
          await ctx.waitForCascade();
          ctx.endRework();
          ctx._log("rework", "batchIterator rework complete, retrying same item");

          // 5. Decrement counters so rework uses same file names
          for (const ie of itemEdges) {
            const target = ctx.getLiveNode(ie.target);
            if (target?.type === "counterNode") {
              const counters = ctx._counterValues;
              const step = target.data?.step ?? 1;
              if (counters?.has(ie.target))
                counters.set(ie.target, counters.get(ie.target)! - step);
            }
          }

          i -= batchSize;
          continue;
        }
        if (stepResult.action === "finish") break;
      }

      if (i + batchSize < list.length) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // Final cleanup
    ctx.stoppedNodes.delete(node.id);
    ctx.pausedNodes.delete(node.id);
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
        result = await fetchAsDataUrl(src);
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
      result = src;
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

    // Revoke previous blob URL created by this node to prevent memory leaks
    if (typeof result === "string" && result.startsWith("blob:")) {
      if (!(ctx as any)._blobUrls) (ctx as any)._blobUrls = new Map<string, string>();
      const blobMap = (ctx as any)._blobUrls as Map<string, string>;
      const prev = blobMap.get(node.id);
      if (prev && prev !== result) URL.revokeObjectURL(prev);
      blobMap.set(node.id, result);
    }

    ctx.pushValue(node.id, "out", result);
  },

  pollUntil: async (node, inputs, ctx) => {
    const url = inputs.url;
    if (!url) return;
    let headers: Record<string, string> = {};
    if (inputs.headers) {
      try { headers = JSON.parse(inputs.headers); } catch {
        throw new Error("Poll Until: headers input is not valid JSON");
      }
    }
    // Content-Type is meaningless for GET requests and can trigger CORS preflight failures
    delete headers["Content-Type"];
    delete headers["content-type"];
    const resultUrl = inputs.resultUrl;
    const interval = Math.max(500, node.data.interval ?? 2000);
    const statusPath = node.data.statusPath || "status";
    const doneValue = node.data.doneValue || "COMPLETED";
    const failValue = node.data.failValue || "";
    const maxAttempts = node.data.maxAttempts ?? 300;

    let count = 0;
    while (ctx.isRunning) {
      count++;
      if (maxAttempts > 0 && count > maxAttempts) {
        ctx.setDisplayData(node.id, { status: "timeout", count: count - 1, polling: false }, false);
        throw new Error(`Poll Until: exceeded ${maxAttempts} attempts without reaching "${doneValue}" status`);
      }
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
      const rawStatus = resolveJsonPath(json, statusPath);
      if (rawStatus === undefined || rawStatus === null) {
        throw new Error(`Poll Until: status path "${statusPath}" not found in response`);
      }
      const currentStatus = String(rawStatus);

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
    // Use a map on the runner to avoid direct node.data mutation races
    const lists = ctx._aggregatorLists;
    if (!lists.has(node.id)) lists.set(node.id, []);
    const list = lists.get(node.id)!;
    // Handle the manual user UI reset
    if (node.data.resetTrigger !== node.data._lastReset) {
      list.length = 0;
      node.data._lastReset = node.data.resetTrigger;
    }
    if (inputs.item !== undefined) {
      if (inputs.name !== undefined) {
        const nameStr = String(inputs.name);
        const entry = { name: nameStr, data: inputs.item };
        // Use name as unique key — update existing entry instead of duplicating
        const existingIdx = list.findIndex(
          (e: any) => e && typeof e === "object" && "name" in e && e.name === nameStr,
        );
        if (existingIdx >= 0) {
          list[existingIdx] = entry;
        } else {
          list.push(entry);
        }
      } else {
        list.push(inputs.item);
      }
      ctx.setDisplayData(node.id, [...list], false);
      ctx.pushValue(node.id, "list", [...list], isStream);
    }
  },

  downloadData: (node, inputs, ctx, isStream) => {
    ctx.setDisplayData(node.id, { data: inputs.in, name: inputs.name }, false);
  },

  textTemplate: (node, inputs, ctx) => {
    let template: string = node.data.template ?? "";
    // Replace {{varN}} with connected inputs
    for (const [key, value] of Object.entries(inputs)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      template = template.replace(placeholder, String(value ?? ""));
    }
    // Also support {{1}}, {{2}} etc. mapped to var1, var2
    template = template.replace(/\{\{(\w+)\}\}/g, "");
    ctx.pushValue(node.id, "out", template);
  },

  switchNode: (node, inputs, ctx) => {
    const val = inputs.in;
    const mode = node.data.mode || "value";
    const pattern = node.data.pattern ?? "";
    let matches = false;

    if (mode === "truthy") {
      matches = !!val;
    } else if (mode === "value") {
      matches = String(val) === pattern;
    } else if (mode === "contains") {
      matches = String(val).includes(pattern);
    } else if (mode === "regex") {
      try {
        matches = new RegExp(pattern).test(String(val));
      } catch {
        matches = false;
      }
    }

    if (matches) {
      ctx.pushValue(node.id, "true", val);
    } else {
      ctx.pushValue(node.id, "false", val);
    }
  },

  mergeNode: (node, inputs, ctx) => {
    const mode = node.data.mode || "object";
    const inputKeys: string[] = node.data.inputs || ["in1", "in2"];
    if (mode === "concat") {
      const arr: any[] = [];
      for (const key of inputKeys) {
        if (inputs[key] !== undefined) {
          if (Array.isArray(inputs[key])) arr.push(...inputs[key]);
          else arr.push(inputs[key]);
        }
      }
      ctx.pushValue(node.id, "out", arr);
    } else if (mode === "array") {
      const arr = [];
      for (const key of inputKeys) {
        if (inputs[key] !== undefined) arr.push(inputs[key]);
      }
      ctx.pushValue(node.id, "out", arr);
    } else {
      const obj: Record<string, any> = {};
      for (const key of inputKeys) {
        if (inputs[key] !== undefined) obj[key] = inputs[key];
      }
      ctx.pushValue(node.id, "out", obj);
    }
  },

  stringOps: (node, inputs, ctx) => {
    const val = inputs.in;
    if (val === undefined || val === null) return;
    const str = String(val);
    const op = node.data.operation || "split";
    const param = node.data.param ?? "";
    let result: any = str;

    switch (op) {
      case "split":
        result = str.split(param || ",");
        break;
      case "join":
        result = Array.isArray(val) ? val.join(param || ",") : str;
        break;
      case "replace": {
        const [find, rep] = param.split(",", 2);
        result = find ? str.replaceAll(find, rep ?? "") : str;
        break;
      }
      case "uppercase":
        result = str.toUpperCase();
        break;
      case "lowercase":
        result = str.toLowerCase();
        break;
      case "trim":
        result = str.trim();
        break;
      case "slice": {
        const parts = param.split(",").map((s: string) => parseInt(s.trim()));
        result = str.slice(parts[0] || 0, parts[1]);
        break;
      }
      case "regex_extract": {
        try {
          const match = str.match(new RegExp(param));
          result = match ? (match[1] ?? match[0]) : null;
        } catch {
          result = null;
        }
        break;
      }
      case "length":
        result = str.length;
        break;
    }
    ctx.pushValue(node.id, "out", result);
  },

  counterNode: (node, inputs, ctx) => {
    // Use runner-level storage to avoid mutation races
    const counters = ctx._counterValues;
    const startAt = node.data.startAt ?? 0;
    const step = node.data.step ?? 1;
    const prefix = node.data.prefix ?? "";
    const suffix = node.data.suffix ?? "";

    if (!counters.has(node.id)) counters.set(node.id, startAt);
    const current = counters.get(node.id)!;
    counters.set(node.id, current + step);

    ctx.setDisplayData(node.id, current, false);
    ctx.pushValue(node.id, "count", current);
    ctx.pushValue(node.id, "label", `${prefix}${current}${suffix}`);
  },

  commentNode: () => {
    // Comment nodes don't execute
  },

  chatNode: (node, inputs, ctx, isStream) => {
    if (!(ctx as any)._chatMessages) (ctx as any)._chatMessages = new Map<string, any[]>();
    const messages = (ctx as any)._chatMessages as Map<string, any[]>;
    if (!messages.has(node.id)) messages.set(node.id, []);
    const chat = messages.get(node.id)!;

    if (node.data.resetTrigger !== node.data._lastReset) {
      chat.length = 0;
      node.data._lastReset = node.data.resetTrigger;
    }

    if (isStream) {
      if (inputs.right !== undefined) {
        const last = chat.findLast((m: any) => m.side === "right" && m.streaming);
        if (last) { last.text += String(inputs.right); }
        else chat.push({ side: "right", text: String(inputs.right), ts: Date.now(), streaming: true });
      }
      if (inputs.left !== undefined) {
        const last = chat.findLast((m: any) => m.side === "left" && m.streaming);
        if (last) { last.text += String(inputs.left); }
        else chat.push({ side: "left", text: String(inputs.left), ts: Date.now(), streaming: true });
      }
    } else {
      // Finalize any streaming messages
      for (const m of chat) delete m.streaming;
      if (inputs.left !== undefined)
        chat.push({ side: "left", text: String(inputs.left), ts: Date.now() });
      if (inputs.right !== undefined)
        chat.push({ side: "right", text: String(inputs.right), ts: Date.now() });
    }

    ctx.setDisplayData(node.id, [...chat], false);
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
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    // Pixel budgets: 1K ≈ 1MP, 2K ≈ 4MP, 4K ≈ 16MP
    const PIXEL_BUDGET: Record<string, number> = {
      "1K": 1024 * 1024,
      "2K": 2048 * 2048,
      "4K": 4096 * 4096,
    };

    let dw = img.width;
    let dh = img.height;

    // If size input is connected (format: "WxH"), use those exact dimensions
    if (inputs.size) {
      const match = String(inputs.size).match(/^(\d+)x(\d+)$/);
      if (match) {
        dw = parseInt(match[1]!, 10);
        dh = parseInt(match[2]!, 10);
      }
    } else if (aspectRatio !== "original" && DIMENSIONS[aspectRatio]) {
      const mult = resolution === "4K" ? 4 : resolution === "2K" ? 2 : 1;
      [dw, dh] = DIMENSIONS[aspectRatio]!;
      dw *= mult;
      dh *= mult;
    } else {
      // "original" aspect ratio: scale down to fit within pixel budget
      const budget = PIXEL_BUDGET[resolution] ?? PIXEL_BUDGET["1K"]!;
      const currentPixels = img.width * img.height;
      if (currentPixels > budget) {
        const scale = Math.sqrt(budget / currentPixels);
        dw = Math.floor(img.width * scale);
        dh = Math.floor(img.height * scale);
      }
    }

    // Round to nearest multiple of 8 for AI compatibility
    if (node.data.roundTo8 !== false) {
      dw = Math.max(8, Math.round(dw / 8) * 8);
      dh = Math.max(8, Math.round(dh / 8) * 8);
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

    const blobOpts: { type: string; quality?: number } = { type: mime };
    if (mime !== "image/png") blobOpts.quality = quality;
    const blob = await canvas.convertToBlob(blobOpts);
    const result = await blobToDataUrl(blob);

    ctx.pushValue(node.id, "out", result);
    ctx.pushValue(node.id, "size", `${dw}x${dh}`);
  },

  reviewNode: async (node, inputs, ctx) => {
    let currentData = inputs.in;

    // Loop to support rework: after re-triggering upstream, wait for new data
    while (ctx.isRunning) {
      ctx.setDisplayData(node.id, { data: currentData, status: "pending" }, false);

      const result = await new Promise<any>((resolve, reject) => {
        ctx.pendingApprovals.set(node.id, { resolve, reject });
      });
      ctx.pendingApprovals.delete(node.id);

      if (!ctx.isRunning || result.action === "stop") {
        ctx.setDisplayData(node.id, { data: currentData, status: "cancelled" }, false);
        break;
      }

      if (result.action === "approve") {
        ctx.setDisplayData(node.id, { data: result.value, status: "approved" }, false);
        ctx.pushValue(node.id, "out", result.value);
        break;
      }

      if (result.action === "rework") {
        ctx._log("rework", `reviewNode[${node.id}] rework requested`);
        ctx.setDisplayData(node.id, { data: currentData, status: "reworking" }, false);
        ctx._reworkingNodes.add(node.id);
        delete ctx.receivedInputs[node.id];

        // Check if we're downstream of a BatchIterator — signal it to rework
        const batchIterator = findAncestorOfType(
          ctx.edges,
          ctx,
          node.id,
          "batchIterator",
        );
        if (batchIterator && ctx.pendingApprovals.has(batchIterator.id)) {
          ctx._log("rework", `delegating to batchIterator[${batchIterator.id}]`);
          ctx._reworkingNodes.delete(node.id);
          ctx.pendingApprovals.get(batchIterator.id)!.resolve({ action: "rework" });
          break; // BatchIterator handles the re-execution loop
        }

        // No batch iterator — refresh upstream directly, then loop to await new data
        ctx.beginRework();
        const inEdges = ctx.edges.filter((e) => e.target === node.id);
        const allRoots = new Set<string>();
        for (const ie of inEdges) {
          for (const r of findRootAncestors(ctx.edges, ie.source, null))
            allRoots.add(r);
        }

        // Clear upstream macro internals and cancel stale pending executions
        const upstreamIds = findAllDownstream(ctx.edges, [...allRoots], node.id);
        for (const usId of upstreamIds) {
          const usNode = ctx.getNode(usId);
          if (usNode?.type === "macroNode") {
            const internalNodes = ctx.nodes.filter((n) => n.macroId === usId);
            for (const n of internalNodes) delete ctx.receivedInputs[n.id];
            for (const n of internalNodes) {
              if (!ctx.expectedInputs[n.id] || ctx.expectedInputs[n.id]!.size === 0)
                allRoots.add(n.id);
            }
          }
          ctx.cancelPendingExec(usId);
        }

        // Re-execute upstream roots and wait for the full cascade
        ctx._log("rework", "reviewNode re-executing roots:", [...allRoots]);
        for (const rootId of allRoots) await ctx.executeNode(rootId);
        await ctx.waitForCascade();
        ctx.endRework();
        ctx._reworkingNodes.delete(node.id);
        ctx._log("rework", "reviewNode rework complete");

        // Pick up the new data that arrived from upstream
        const newInputs = ctx.receivedInputs[node.id];
        if (newInputs?.in !== undefined) {
          currentData = newInputs.in;
        }
        // Loop continues — will show pending state with new data
        continue;
      }

      // Cancel or unknown action
      ctx.setDisplayData(node.id, { data: currentData, status: "cancelled" }, false);
      break;
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
