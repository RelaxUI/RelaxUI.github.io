import type { ParamSchema } from "@/types.ts";

/* ────────────────────────────────────────────────────────────────────────────
 * Generation Parameter Defaults
 *
 * Canonical definitions of every generation-time parameter that RelaxUI
 * exposes.  Each entry carries the type, default, validation bounds, and
 * a human-readable label for the UI.
 * ──────────────────────────────────────────────────────────────────────── */

export const GENERATION_PARAMS: Record<string, ParamSchema> = {
  max_new_tokens: {
    type: "number",
    default: 128,
    label: "Max New Tokens",
    min: 1,
    max: 4096,
    step: 1,
  },

  do_sample: {
    type: "boolean",
    default: false,
    label: "Do Sample",
  },

  temperature: {
    type: "number",
    default: 1.0,
    label: "Temperature",
    min: 0.0,
    max: 2.0,
    step: 0.05,
  },

  top_p: {
    type: "number",
    default: 1.0,
    label: "Top-p (Nucleus)",
    min: 0.0,
    max: 1.0,
    step: 0.05,
  },

  top_k: {
    type: "number",
    default: 50,
    label: "Top-k",
    min: 0,
    max: 500,
    step: 1,
  },

  min_p: {
    type: "number",
    default: 0.0,
    label: "Min-p",
    min: 0.0,
    max: 1.0,
    step: 0.01,
  },

  repetition_penalty: {
    type: "number",
    default: 1.0,
    label: "Repetition Penalty",
    min: 1.0,
    max: 5.0,
    step: 0.05,
  },

  presence_penalty: {
    type: "number",
    default: 0.0,
    label: "Presence Penalty",
    min: 0.0,
    max: 2.0,
    step: 0.05,
  },

  no_repeat_ngram_size: {
    type: "number",
    default: 0,
    label: "No-Repeat N-gram Size",
    min: 0,
    max: 10,
    step: 1,
  },
};

/* ────────────────────────────────────────────────────────────────────────────
 * Runtime option enums
 * ──────────────────────────────────────────────────────────────────────── */

export const DEVICE_OPTIONS = ["wasm", "webgpu", "cpu"] as const;

export const DTYPE_OPTIONS = ["fp32", "fp16", "q8", "q4", "q4f16"] as const;
