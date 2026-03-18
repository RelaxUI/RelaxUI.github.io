import { MODEL_CLASS_CATEGORIES } from "@/config/modelClassRegistry.ts";
import { PIPELINE_CATEGORIES } from "@/config/pipelineRegistry.ts";
import { PREBUILT_MACROS } from "@/macros/macroFactory.ts";

export interface MenuItem {
  type: string;
  label: string;
  category: string;
  subcategory?: string;
}

/** Title-case a node label: "INPUT TEXT" → "Input Text" */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function getNodeMenuItems(currentView: string | null): MenuItem[] {
  const items: MenuItem[] = [];

  // ── Inputs ──
  items.push({ type: "inputText", label: "Text Input", category: "Inputs" });
  items.push({ type: "inputImage", label: "Image Input", category: "Inputs" });
  items.push({ type: "audioInput", label: "Audio Input", category: "Inputs" });
  items.push({ type: "folderInput", label: "Folder Input", category: "Inputs" });

  // ── Outputs ──
  items.push({ type: "universalOutput", label: "Universal Output", category: "Outputs" });
  items.push({ type: "outputText", label: "Text Output", category: "Outputs" });
  items.push({ type: "outputImage", label: "Image Output", category: "Outputs" });
  items.push({ type: "audioOutput", label: "Audio Output", category: "Outputs" });
  items.push({ type: "downloadData", label: "Download Data", category: "Outputs" });

  // ── Processing ──
  items.push({ type: "imageProcess", label: "Image Process", category: "Processing" });
  items.push({ type: "customScript", label: "Custom Script", category: "Processing" });
  items.push({ type: "httpRequest", label: "HTTP Request", category: "Processing" });
  items.push({ type: "jsonPath", label: "JSON Path", category: "Processing" });
  items.push({ type: "macroNode", label: "Macro (Sub-Graph)", category: "Processing" });

  // ── Flow Control — ordered by typical workflow sequence ──
  items.push({ type: "batchIterator", label: "Batch Iterator", category: "Flow Control" });
  items.push({ type: "delay", label: "Delay", category: "Flow Control" });
  items.push({ type: "reviewNode", label: "Review / Approve", category: "Flow Control" });
  items.push({ type: "listAggregator", label: "List Aggregator", category: "Flow Control" });

  // ── Pipelines — ready-to-use high-level macros ──
  items.push({ type: "openRouter", label: "OpenRouter API", category: "Pipelines", subcategory: "LLM" });
  for (const [cat, tasks] of Object.entries(PIPELINE_CATEGORIES)) {
    for (const task of tasks) {
      const key = `pipeline_${task}`;
      const macro = PREBUILT_MACROS[key];
      if (macro)
        items.push({
          type: key,
          label: titleCase(macro.label),
          category: "Pipelines",
          subcategory: cat,
        });
    }
  }

  // ── Model Classes ──
  for (const [cat, classes] of Object.entries(MODEL_CLASS_CATEGORIES)) {
    for (const cls of classes) {
      const key = `model_${cls}`;
      const macro = PREBUILT_MACROS[key];
      if (macro)
        items.push({
          type: key,
          label: titleCase(macro.label),
          category: "Model Classes",
          subcategory: cat,
        });
    }
  }

  // ── Advanced — low-level Transformers.js building blocks ──
  items.push({ type: "transformersPipeline", label: "Pipeline Node", category: "Advanced" });
  items.push({ type: "transformersModelLoader", label: "Model Loader", category: "Advanced" });
  items.push({ type: "transformersTokenizerLoader", label: "Tokenizer Loader", category: "Advanced" });
  items.push({ type: "transformersProcessorLoader", label: "Processor Loader", category: "Advanced" });
  items.push({ type: "transformersGenerate", label: "Generate", category: "Advanced" });
  items.push({ type: "transformersTokenizerEncode", label: "Tokenizer Encode", category: "Advanced" });
  items.push({ type: "transformersTokenizerDecode", label: "Tokenizer Decode", category: "Advanced" });
  items.push({ type: "transformersProcessor", label: "Processor", category: "Advanced" });
  items.push({ type: "transformersChatTemplate", label: "Chat Template", category: "Advanced" });
  items.push({ type: "transformersEnvConfig", label: "Env Config", category: "Advanced" });
  items.push({ type: "transformersGenerationConfig", label: "Generation Config", category: "Advanced" });

  // ── Macro Internals — only visible inside a macro ──
  if (currentView) {
    items.push({ type: "macroInEdge", label: "Macro In (Edge)", category: "Macro Internals" });
    items.push({ type: "macroInParam", label: "Macro In (Param)", category: "Macro Internals" });
    items.push({ type: "macroOutput", label: "Macro Out", category: "Macro Internals" });
    items.push({ type: "macroConnections", label: "Macro Connections", category: "Macro Internals" });
  }

  return items;
}

export const CATEGORIES = [
  "Inputs",
  "Outputs",
  "Processing",
  "Flow Control",
  "Pipelines",
  "Model Classes",
  "Advanced",
];

export const MACRO_INTERNAL_CATEGORY = "Macro Internals";
