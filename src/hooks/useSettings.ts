import { useCallback, useSyncExternalStore } from "react";

export interface AppSettings {
  hfToken: string;
  devicePreference: "auto" | "webgpu" | "wasm";
  autoSave: boolean;
}

const STORAGE_KEY = "relaxui_settings";

const DEFAULT_SETTINGS: AppSettings = {
  hfToken: "",
  devicePreference: "auto",
  autoSave: false,
};

let listeners: (() => void)[] = [];
let cachedRaw: string | null = null;
let cachedSnapshot: AppSettings = DEFAULT_SETTINGS;

function getSnapshot(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    }
  } catch {}
  return cachedSnapshot;
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function notify() {
  // Invalidate cache so next getSnapshot() picks up the write
  cachedRaw = null;
  listeners.forEach((l) => l());
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SETTINGS);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const current = getSnapshot();
    const next = { ...current, [key]: value };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    notify();
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    notify();
  }, []);

  return { settings, updateSetting, resetSettings };
}

/** Read a setting outside of React (e.g. in executors) */
export function readSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return getSnapshot()[key];
}
