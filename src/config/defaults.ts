/* ────────────────────────────────────────────────────────────────────────────
 * Centralized Configuration Constants
 *
 * Single source of truth for all runtime defaults.
 * Import from here instead of scattering magic numbers across the codebase.
 * ──────────────────────────────────────────────────────────────────────── */

export const DEFAULTS = {
  devicePreferred: "webgpu",
  deviceFallback: "wasm",
  nodeExecutionDelayMs: 50,
  batchDelayMs: 500,
  edgeAnimationMs: 600,
  audioSampleRate: 16000,
  maskedLmTopK: 5,
} as const;

/** Auto-detect best available device with fallback, respecting user settings */
export function getDefaultDevice(): string {
  try {
    const raw = localStorage.getItem("relaxui_settings");
    if (raw) {
      const pref = JSON.parse(raw).devicePreference;
      if (pref && pref !== "auto") return pref;
    }
  } catch {}
  if (typeof navigator !== "undefined" && (navigator as any).gpu) {
    return DEFAULTS.devicePreferred;
  }
  return DEFAULTS.deviceFallback;
}
