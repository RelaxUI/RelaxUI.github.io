// FILE: components/ContextMenu/ContextMenu.tsx
import { MODEL_CLASS_CATEGORIES } from "@/config/modelClassRegistry.ts";
import { NODE_DIMENSIONS } from "@/config/nodeDimensions.ts";
import { PIPELINE_CATEGORIES } from "@/config/pipelineRegistry.ts";
import { PREBUILT_MACROS } from "@/macros/macroFactory.ts";
import { useEffect, useMemo, useRef, useState } from "react";

interface MenuItem {
  type: string;
  label: string;
  category: string;
  subcategory?: string;
}

interface ContextMenuProps {
  x: number;
  y: number;
  currentView: string | null;
  onSelect: (type: string) => void;
}

export const ContextMenu = ({
  x,
  y,
  currentView,
  onSelect,
}: ContextMenuProps) => {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [adjustedTop, setAdjustedTop] = useState(y);
  const menuRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    // Core nodes
    items.push({
      type: "inputText",
      label: NODE_DIMENSIONS.inputText!.title,
      category: "Inputs",
    });
    items.push({
      type: "inputImage",
      label: NODE_DIMENSIONS.inputImage!.title,
      category: "Inputs",
    });
    items.push({
      type: "audioInput",
      label: NODE_DIMENSIONS.audioInput!.title,
      category: "Inputs",
    });

    items.push({
      type: "outputText",
      label: NODE_DIMENSIONS.outputText!.title,
      category: "Outputs",
    });
    items.push({
      type: "outputImage",
      label: NODE_DIMENSIONS.outputImage!.title,
      category: "Outputs",
    });
    items.push({
      type: "audioOutput",
      label: NODE_DIMENSIONS.audioOutput!.title,
      category: "Outputs",
    });

    items.push({
      type: "customScript",
      label: NODE_DIMENSIONS.customScript!.title,
      category: "Logic & Data",
    });
    items.push({
      type: "httpRequest",
      label: NODE_DIMENSIONS.httpRequest!.title,
      category: "Logic & Data",
    });
    items.push({
      type: "jsonPath",
      label: NODE_DIMENSIONS.jsonPath!.title,
      category: "Logic & Data",
    });

    // New Batch & Flow Nodes
    items.push({
      type: "folderInput",
      label: NODE_DIMENSIONS.folderInput!.title,
      category: "Batch & Flow",
    });
    items.push({
      type: "batchIterator",
      label: NODE_DIMENSIONS.batchIterator!.title,
      category: "Batch & Flow",
    });
    items.push({
      type: "delay",
      label: NODE_DIMENSIONS.delay!.title,
      category: "Batch & Flow",
    });
    items.push({
      type: "listAggregator",
      label: NODE_DIMENSIONS.listAggregator!.title,
      category: "Batch & Flow",
    });
    items.push({
      type: "downloadData",
      label: NODE_DIMENSIONS.downloadData!.title,
      category: "Batch & Flow",
    });

    items.push({
      type: "macroNode",
      label: NODE_DIMENSIONS.macroNode!.title,
      category: "Macros",
    });
    items.push({
      type: "openRouter",
      label: "OpenRouter API",
      category: "Macros",
    });

    for (const [cat, tasks] of Object.entries(PIPELINE_CATEGORIES)) {
      for (const task of tasks) {
        const key = `pipeline_${task}`;
        const macro = PREBUILT_MACROS[key];
        if (macro)
          items.push({
            type: key,
            label: macro.label,
            category: "Pipeline Macros",
            subcategory: cat,
          });
      }
    }

    for (const [cat, classes] of Object.entries(MODEL_CLASS_CATEGORIES)) {
      for (const cls of classes) {
        const key = `model_${cls}`;
        const macro = PREBUILT_MACROS[key];
        if (macro)
          items.push({
            type: key,
            label: macro.label,
            category: "Model Class Macros",
            subcategory: cat,
          });
      }
    }

    items.push({
      type: "transformersPipeline",
      label: "Pipeline Node",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersModelLoader",
      label: "Model Loader",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersTokenizerLoader",
      label: "Tokenizer Loader",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersProcessorLoader",
      label: "Processor Loader",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersGenerate",
      label: "Generate",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersTokenizerEncode",
      label: "Tokenizer Encode",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersTokenizerDecode",
      label: "Tokenizer Decode",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersProcessor",
      label: "Processor",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersChatTemplate",
      label: "Chat Template",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersEnvConfig",
      label: "Env Config",
      category: "Base Nodes",
    });
    items.push({
      type: "transformersGenerationConfig",
      label: "Gen Config",
      category: "Base Nodes",
    });

    if (currentView) {
      items.push({
        type: "macroInEdge",
        label: "MACRO IN (edge)",
        category: "Macro Internals",
      });
      items.push({
        type: "macroInParam",
        label: "MACRO IN (param)",
        category: "Macro Internals",
      });
      items.push({
        type: "macroOutput",
        label: "MACRO OUT",
        category: "Macro Internals",
      });
      items.push({
        type: "macroConnections",
        label: "MACRO CONNS",
        category: "Macro Internals",
      });
    }
    return items;
  }, [currentView]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
        item.type.toLowerCase().includes(q),
    );
  }, [search, allItems]);

  const categories = [
    "Inputs",
    "Outputs",
    "Logic & Data",
    "Batch & Flow",
    "Macros",
    "Pipeline Macros",
    "Model Class Macros",
    "Base Nodes",
    ...(currentView ? ["Macro Internals"] : []),
  ];

  const getSubcategories = (cat: string): string[] => {
    const subs = new Set<string>();
    allItems
      .filter((i) => i.category === cat && i.subcategory)
      .forEach((i) => subs.add(i.subcategory!));
    return [...subs];
  };

  const getItems = (cat: string, sub?: string): MenuItem[] =>
    allItems.filter(
      (i) =>
        i.category === cat && (sub ? i.subcategory === sub : !i.subcategory),
    );

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        setAdjustedTop(Math.max(10, window.innerHeight - rect.height - 10));
      } else if (y + rect.height <= window.innerHeight) {
        setAdjustedTop(y);
      }
    }
  }, [filteredItems, openCategory, openSub, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#131820] border border-[#2a323d] rounded-lg shadow-2xl w-56 font-mono text-xs text-white"
      style={{
        left: Math.min(x, window.innerWidth - 240),
        top: adjustedTop,
        maxHeight: "95vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="p-2 border-b border-[#1f2630] shrink-0">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0b0e14] border border-[#1f2630] rounded px-2 py-1.5 text-xs text-white focus:border-[#00e5ff] focus:outline-none placeholder:text-[#5a6b7c]"
          placeholder="Search nodes..."
        />
      </div>

      <div className="overflow-y-auto custom-scrollbar flex-1 py-1">
        {filteredItems ? (
          <div>
            {filteredItems.length === 0 && (
              <div className="px-4 py-3 text-[#5a6b7c] text-center">
                No results
              </div>
            )}
            {filteredItems.map((item) => (
              <div
                key={item.type}
                className="px-4 py-2 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer flex justify-between items-center gap-2"
                onClick={() => onSelect(item.type)}
              >
                <span className="truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="text-[8px] text-[#5a6b7c] shrink-0">
                  {item.subcategory || item.category}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {categories.map((cat) => {
              const subcats = getSubcategories(cat);
              const directItems = getItems(cat);
              const hasSubcats = subcats.length > 0;
              const isOpen = openCategory === cat;

              return (
                <div key={cat}>
                  <div
                    className="px-4 py-2 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer flex justify-between items-center"
                    onClick={() => setOpenCategory(isOpen ? null : cat)}
                  >
                    <span className="text-[10px] font-bold tracking-wider">
                      {cat}
                    </span>
                    <span className="text-[10px] opacity-50">
                      {isOpen ? "▼" : "▶"}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="bg-[#0b0e14]/40">
                      {directItems.map((item) => (
                        <div
                          key={item.type}
                          className="px-6 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer truncate"
                          onClick={() => onSelect(item.type)}
                          title={item.label}
                        >
                          {item.label}
                        </div>
                      ))}
                      {hasSubcats &&
                        subcats.map((sub) => {
                          const subItems = getItems(cat, sub);
                          const isSubOpen = openSub === `${cat}:${sub}`;
                          return (
                            <div key={sub}>
                              <div
                                className="px-6 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer flex justify-between items-center text-[#a0aec0]"
                                onClick={() =>
                                  setOpenSub(isSubOpen ? null : `${cat}:${sub}`)
                                }
                              >
                                <span className="text-[10px]">
                                  {sub}{" "}
                                  <span className="text-[#5a6b7c]">
                                    ({subItems.length})
                                  </span>
                                </span>
                                <span className="text-[9px] opacity-50">
                                  {isSubOpen ? "▼" : "▶"}
                                </span>
                              </div>
                              {isSubOpen && (
                                <div className="bg-[#0b0e14]/60">
                                  {subItems.map((item) => (
                                    <div
                                      key={item.type}
                                      className="px-8 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer truncate text-[11px]"
                                      onClick={() => onSelect(item.type)}
                                      title={item.label}
                                    >
                                      {item.label}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
