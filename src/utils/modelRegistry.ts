/** Regex matching any known dtype suffix before .onnx in a filename. */
const DTYPE_SUFFIX_RE =
  /_(quantized|q4f16|q4|q8|fp16|fp32|int8|uint8|bnb4)\.onnx/;

/**
 * Map ONNX filename suffixes to the dtype values transformers.js expects.
 * Only entries that differ are listed — all others map 1:1.
 * (transformers.js internally maps "q8" → "_quantized" file suffix)
 */
const SUFFIX_TO_DTYPE: Record<string, string> = {
  quantized: "q8",
};

/** HuggingFace file-tree cache: in-memory backed by sessionStorage, 1-hour TTL. */
const _TREE_TTL = 60 * 60_000; // 1 hour
const _STORAGE_PREFIX = "relaxui_hf_tree_";
const _treeCache = new Map<string, { data: any[]; ts: number }>();

// Hydrate in-memory cache from sessionStorage on load
try {
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(_STORAGE_PREFIX)) {
      const entry = JSON.parse(sessionStorage.getItem(key)!);
      if (entry && Date.now() - entry.ts < _TREE_TTL) {
        _treeCache.set(key.slice(_STORAGE_PREFIX.length), entry);
      } else {
        sessionStorage.removeItem(key);
      }
    }
  }
} catch { /* sessionStorage unavailable */ }

/**
 * Prefer merged model variants over non-merged when both exist,
 * but only within the same component prefix (e.g. decoder_model, encoder_model).
 */
function deduplicateMerged(
  files: { path: string; size: number }[],
): { path: string; size: number }[] {
  // Group files by component prefix
  const groups = new Map<string, { path: string; size: number }[]>();
  for (const f of files) {
    const basename = f.path.split("/").pop() || "";
    // Extract component prefix: e.g. "decoder_model" from "decoder_model_merged_quantized.onnx"
    const match = basename.match(
      /^([a-z_]+?)(?:_merged)?(?:_quantized|_q4f16|_q4|_q8|_fp16|_fp32|_int8|_uint8|_bnb4)?\.onnx/,
    );
    const prefix = match?.[1] || basename;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(f);
  }

  const result: { path: string; size: number }[] = [];
  for (const group of groups.values()) {
    const merged = group.filter((f) => f.path.includes("_merged"));
    const nonMerged = group.filter((f) => !f.path.includes("_merged"));
    // Only deduplicate if both merged and non-merged exist for this component
    if (merged.length > 0 && nonMerged.length > 0) {
      result.push(...merged);
    } else {
      result.push(...group);
    }
  }
  return result;
}

export class ModelRegistry {
  /** Cached fetch of the HuggingFace file tree for a model. */
  private static async _fetchTree(modelId: string): Promise<any[] | null> {
    const cached = _treeCache.get(modelId);
    if (cached && Date.now() - cached.ts < _TREE_TTL) return cached.data;
    const res = await fetch(
      `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const entry = { data, ts: Date.now() };
    _treeCache.set(modelId, entry);
    try { sessionStorage.setItem(_STORAGE_PREFIX + modelId, JSON.stringify(entry)); } catch { /* quota */ }
    return data;
  }

  /**
   * Returns the transformers.js dtype values available for a model,
   * derived from its actual ONNX filenames.
   * E.g. ["fp16", "q4", "q4f16", "q8", "int8", "uint8", "bnb4"]
   */
  static async get_available_dtypes(modelId: string): Promise<string[]> {
    if (!modelId) return [];
    try {
      const files = await ModelRegistry._fetchTree(modelId);
      if (!files) return [];
      const dtypes = new Set<string>();
      for (const f of files) {
        if (f.type !== "file" || !f.path.endsWith(".onnx")) continue;
        const basename = f.path.split("/").pop() || "";
        const match = basename.match(DTYPE_SUFFIX_RE);
        if (match) dtypes.add(SUFFIX_TO_DTYPE[match[1]] ?? match[1]);
      }
      return Array.from(dtypes);
    } catch {
      return [];
    }
  }

  /**
   * Fetches the estimated size of a model from the Hugging Face API.
   * Scans the file tree and applies dtype-based file selection.
   */
  static async get_model_size(
    modelId: string,
    dtype?: any,
  ): Promise<number | null> {
    if (!modelId) return null;
    try {
      const files = await ModelRegistry._fetchTree(modelId);
      if (!files) return null;

      const dtypeStr = typeof dtype === "string" ? dtype : "";

      // Only count root-level config files (not deep subdirectory configs)
      const configSize = files
        .filter(
          (f: any) =>
            f.type === "file" &&
            f.size &&
            (f.path.endsWith(".json") || f.path.endsWith(".txt")) &&
            (!f.path.includes("/") || f.path.split("/").length <= 2),
        )
        .reduce((a: number, b: any) => a + (b.size || 0), 0);

      // Include tokenizer/processor binary files in size
      const tokenizerSize = files
        .filter(
          (f: any) =>
            f.type === "file" &&
            f.size &&
            (f.path.endsWith(".model") ||
              f.path === "tokenizer.json" ||
              f.path === "vocab.txt"),
        )
        .reduce((a: number, b: any) => a + (b.size || 0), 0);

      // Collect all ONNX weight files, including onnx/ subdirectory
      const onnxFiles: { path: string; size: number }[] = files.filter(
        (f: any) =>
          f.type === "file" &&
          f.size &&
          (f.path.endsWith(".onnx") || f.path.endsWith(".onnx_data")),
      );

      const baseSize = configSize + tokenizerSize;

      if (onnxFiles.length === 0) return baseSize > 0 ? baseSize : null;

      // Dtype matching: try exact suffix, then aliases, then plain fallback.
      // "__plain__" is a sentinel that matches files WITHOUT any dtype suffix.
      const dtypeAliases: Record<string, string[]> = {
        q4: ["q4", "quantized"],
        q8: ["q8", "quantized"],
        fp16: ["fp16"],
        fp32: ["fp32", "__plain__"],
        "": ["__plain__"],
      };
      const aliases = dtypeAliases[dtypeStr] ?? [dtypeStr];

      // Try each alias in order
      for (const alias of aliases) {
        let matched = onnxFiles.filter((f) => {
          const basename = f.path.split("/").pop() || "";
          if (alias === "__plain__") return !DTYPE_SUFFIX_RE.test(basename);
          return basename.includes(`_${alias}.onnx`);
        });
        if (matched.length > 0) {
          matched = deduplicateMerged(matched);
          return baseSize + matched.reduce((a, b) => a + b.size, 0);
        }
      }

      // No alias matched — pick the best default:
      // Only use "quantized" fallback when all components have quantized variants
      const quantized = onnxFiles.filter((f) =>
        f.path.includes("_quantized.onnx"),
      );
      const nonQuantized = onnxFiles.filter((f) => {
        const basename = f.path.split("/").pop() || "";
        return !DTYPE_SUFFIX_RE.test(basename);
      });

      // Check if quantized covers all components
      if (quantized.length > 0) {
        const dedupedQuantized = deduplicateMerged(quantized);
        const quantizedPrefixes = new Set(
          dedupedQuantized.map((f) => {
            const basename = f.path.split("/").pop() || "";
            return basename
              .replace(/_quantized|_merged/g, "")
              .replace(/\.onnx.*/, "");
          }),
        );
        const missingNonQuantized = nonQuantized.filter((f) => {
          const basename = f.path.split("/").pop() || "";
          const prefix = basename
            .replace(
              /_(?:merged|quantized|q4f16|q4|q8|fp16|fp32|int8|uint8|bnb4)/g,
              "",
            )
            .replace(/\.onnx.*/, "");
          return !quantizedPrefixes.has(prefix);
        });
        return (
          baseSize +
          dedupedQuantized.reduce((a, b) => a + b.size, 0) +
          missingNonQuantized.reduce((a, b) => a + b.size, 0)
        );
      }

      const plain = nonQuantized.length > 0 ? nonQuantized : onnxFiles;
      if (plain.length > 0) {
        const deduped = deduplicateMerged(plain);
        return baseSize + deduped.reduce((a, b) => a + b.size, 0);
      }

      // Absolute fallback: smallest ONNX file
      const smallest = onnxFiles.reduce((a, b) =>
        a.size < b.size ? a : b,
      );
      return baseSize + smallest.size;
    } catch {
      return null;
    }
  }

  static get_hardware_estimate(
    sizeBytes: number | null,
  ): {
    downloadSizeMB: number;
    ramEstimateMB: number;
    webgpuAvailable: boolean;
  } | null {
    if (sizeBytes == null) return null;
    const downloadSizeMB = sizeBytes / 1024 / 1024;
    return {
      downloadSizeMB,
      ramEstimateMB: downloadSizeMB * 2,
      webgpuAvailable:
        typeof navigator !== "undefined" && !!(navigator as any).gpu,
    };
  }

  /**
   * Clears all Transformers.js cached models from the browser's Cache API.
   * Returns `true` on success, `false` on failure.
   */
  static async clear_cache_all(): Promise<boolean> {
    try {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        if (key.includes("transformers-cache")) {
          await caches.delete(key);
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
