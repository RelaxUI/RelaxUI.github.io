/**
 * Prefer merged model variants over non-merged when both exist.
 * E.g. decoder_model_merged_quantized.onnx subsumes decoder_model_quantized.onnx
 */
function deduplicateMerged(
  files: { path: string; size: number }[],
): { path: string; size: number }[] {
  const merged = files.filter((f) => f.path.includes("_merged"));
  const nonMerged = files.filter((f) => !f.path.includes("_merged"));
  if (merged.length > 0 && nonMerged.length > 0) {
    return merged;
  }
  return files;
}

export class ModelRegistry {
  /**
   * Fetches the estimated size of a model from the Hugging Face API.
   * Scans the file tree and applies basic dtype heuristics.
   */
  static async get_model_size(
    modelId: string,
    dtype?: any,
  ): Promise<number | null> {
    if (!modelId) return null;
    try {
      const res = await fetch(
        `https://huggingface.co/api/models/${modelId}/tree/main?recursive=true`,
      );
      if (!res.ok) return null;
      const files = await res.json();

      const dtypeStr = typeof dtype === "string" ? dtype : "";

      // Collect all ONNX weight files grouped by variant
      const configSize = files
        .filter(
          (f: any) =>
            f.type === "file" &&
            f.size &&
            (f.path.endsWith(".json") || f.path.endsWith(".txt")),
        )
        .reduce((a: number, b: any) => a + b.size, 0);

      const onnxFiles: { path: string; size: number }[] = files.filter(
        (f: any) =>
          f.type === "file" &&
          f.size &&
          (f.path.endsWith(".onnx") || f.path.endsWith(".onnx_data")),
      );

      if (onnxFiles.length === 0) return configSize > 0 ? configSize : null;

      // Dtype matching priority:
      // 1. Exact dtype in filename (e.g. "q4", "fp16", "q8")
      // 2. "quantized" variant for q4/q8 dtypes
      // 3. Plain "model.onnx" (no qualifier) for fp32/auto
      // 4. Smallest ONNX file as final fallback
      const dtypeAliases: Record<string, string[]> = {
        q4: ["q4", "quantized", "int8"],
        q8: ["q8", "quantized", "int8"],
        fp16: ["fp16"],
        fp32: ["fp32", "model.onnx"],
        "": [],
      };
      const aliases = dtypeAliases[dtypeStr] ?? [dtypeStr];

      // Try each alias in order
      for (const alias of aliases) {
        let matched = onnxFiles.filter((f) => {
          if (alias === "model.onnx") return f.path.endsWith("/model.onnx");
          return f.path.includes(alias);
        });
        if (matched.length > 0) {
          matched = deduplicateMerged(matched);
          return configSize + matched.reduce((a, b) => a + b.size, 0);
        }
      }

      // No alias matched — pick the best default:
      // prefer "quantized" variant, then plain model.onnx, then smallest
      let quantized = onnxFiles.filter((f) =>
        f.path.includes("quantized"),
      );
      if (quantized.length > 0) {
        quantized = deduplicateMerged(quantized);
        return configSize + quantized.reduce((a, b) => a + b.size, 0);
      }

      const plain = onnxFiles.filter((f) =>
        f.path.endsWith("/model.onnx"),
      );
      if (plain.length > 0)
        return (
          configSize + plain.reduce((a, b) => a + b.size, 0)
        );

      // Absolute fallback: smallest ONNX file
      const smallest = onnxFiles.reduce((a, b) =>
        a.size < b.size ? a : b,
      );
      return configSize + smallest.size;
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
   */
  static async clear_cache_all() {
    try {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        if (key.includes("transformers-cache")) {
          await caches.delete(key);
        }
      }
      alert("Browser cache cleared successfully!");
    } catch (e) {
      console.error(e);
      alert(
        "Failed to clear cache. Your browser might not support this operation.",
      );
    }
  }
}
