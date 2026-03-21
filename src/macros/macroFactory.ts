import { falai } from "@/macros/falai.ts";
import { MODEL_CLASS_MACROS } from "@/macros/modelClassMacroFactory.ts";
import { namedAggregator } from "@/macros/namedAggregator.ts";
import { openRouter } from "@/macros/openRouter.ts";
import { PIPELINE_MACROS } from "@/macros/pipelineMacroFactory.ts";
import { replicate } from "@/macros/replicate.ts";
import { wavespeed, wavespeedImageEdit } from "@/macros/wavespeed.ts";
import type { MacroDefinition } from "@/types.ts";

export const PREBUILT_MACROS: Record<string, MacroDefinition> = {
  openRouter,
  falai,
  replicate,
  wavespeed,
  wavespeedImageEdit,
  namedAggregator,
  ...PIPELINE_MACROS,
  ...MODEL_CLASS_MACROS,
};
