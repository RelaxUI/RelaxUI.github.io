import { useCallback, useSyncExternalStore } from "react";

export interface MemoryItem {
  id: string;
  name: string;
  type: "text" | "image" | "audio" | "video" | "file";
  value: string;
  createdAt: number;
}

const STORAGE_KEY = "relaxui_memory";

let listeners: (() => void)[] = [];
let cachedRaw: string | null = null;
let cachedSnapshot: MemoryItem[] = [];

function getSnapshot(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedSnapshot = raw ? JSON.parse(raw) : [];
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
  cachedRaw = null;
  listeners.forEach((l) => l());
}

function save(items: MemoryItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  notify();
}

export function useMemory() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const addItem = useCallback(
    (item: Omit<MemoryItem, "id" | "createdAt">) => {
      const newItem: MemoryItem = {
        ...item,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      save([...getSnapshot(), newItem]);
      return newItem;
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    save(getSnapshot().filter((i) => i.id !== id));
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<Omit<MemoryItem, "id" | "createdAt">>) => {
      save(
        getSnapshot().map((i) => (i.id === id ? { ...i, ...updates } : i)),
      );
    },
    [],
  );

  return { items, addItem, removeItem, updateItem };
}

/** Read memory items outside of React */
export function readMemoryItems(
  type?: MemoryItem["type"],
): MemoryItem[] {
  const items = getSnapshot();
  return type ? items.filter((i) => i.type === type) : items;
}
