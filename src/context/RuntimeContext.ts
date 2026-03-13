import type { RuntimeContextValue } from "@/types.ts";
import { createContext } from "react";

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);
