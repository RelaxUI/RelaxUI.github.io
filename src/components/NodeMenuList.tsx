import { getNodeMenuItems, CATEGORIES, MACRO_INTERNAL_CATEGORY } from "@/utils/nodeMenuItems.ts";
import { useMemo, useState } from "react";

interface NodeMenuListProps {
  currentView: string | null;
  onSelect: (type: string) => void;
}

export const NodeMenuList = ({ currentView, onSelect }: NodeMenuListProps) => {
  const [search, setSearch] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  const allItems = useMemo(() => getNodeMenuItems(currentView), [currentView]);
  const categories = useMemo(
    () => [...CATEGORIES, ...(currentView ? [MACRO_INTERNAL_CATEGORY] : [])],
    [currentView],
  );

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

  const getDirectItems = (cat: string) =>
    allItems.filter((i) => i.category === cat && !i.subcategory);

  const getSubcategories = (cat: string): string[] => {
    const subs = new Set<string>();
    allItems
      .filter((i) => i.category === cat && i.subcategory)
      .forEach((i) => subs.add(i.subcategory!));
    return [...subs];
  };

  const getSubItems = (cat: string, sub: string) =>
    allItems.filter((i) => i.category === cat && i.subcategory === sub);

  const getCategoryCount = (cat: string) =>
    allItems.filter((i) => i.category === cat).length;

  return (
    <>
      {/* Search */}
      <div className="p-2 border-b border-[#1f2630] shrink-0">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#0b0e14] border border-[#1f2630] rounded px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-[#00e5ff] focus:outline-none placeholder:text-[#5a6b7c]"
          placeholder="Search nodes..."
        />
      </div>

      {/* List */}
      <div className="overflow-y-auto custom-scrollbar flex-1 py-1">
        {filteredItems ? (
          /* ── Search results ── */
          <div>
            {filteredItems.length === 0 && (
              <div className="px-4 py-4 text-[#5a6b7c] text-center text-[11px]">
                No results
              </div>
            )}
            {filteredItems.map((item) => (
              <div
                key={item.type}
                className="pl-5 pr-3 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer flex justify-between items-center gap-2 text-[11px] text-[#c8d1dc]"
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
          /* ── Category tree ── */
          <div>
            {categories.map((cat) => {
              const count = getCategoryCount(cat);
              if (count === 0) return null;

              const directItems = getDirectItems(cat);
              const subcats = getSubcategories(cat);
              const isOpen = openCategory === cat;

              return (
                <div key={cat}>
                  {/* Category header */}
                  <div
                    className="px-3 py-1.5 hover:bg-[#1f2630] cursor-pointer flex justify-between items-center"
                    onClick={() => setOpenCategory(isOpen ? null : cat)}
                  >
                    <span className="text-[10px] font-bold tracking-wider text-[#e2e8f0] uppercase">
                      {cat}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] text-[#5a6b7c] font-mono">{count}</span>
                      <span className="text-[9px] text-[#5a6b7c]">
                        {isOpen ? "▾" : "▸"}
                      </span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="bg-[#0b0e14]/30">
                      {/* Direct items (no subcategory) */}
                      {directItems.map((item) => (
                        <div
                          key={item.type}
                          className="pl-5 pr-3 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer truncate text-[11px] text-[#c8d1dc]"
                          onClick={() => onSelect(item.type)}
                          title={item.label}
                        >
                          {item.label}
                        </div>
                      ))}

                      {/* Subcategories */}
                      {subcats.map((sub) => {
                        const subItems = getSubItems(cat, sub);
                        const subKey = `${cat}:${sub}`;
                        const isSubOpen = openSub === subKey;
                        return (
                          <div key={sub}>
                            <div
                              className="pl-5 pr-3 py-1.5 hover:bg-[#1f2630] cursor-pointer flex justify-between items-center text-[10px] text-[#8895a7]"
                              onClick={() => setOpenSub(isSubOpen ? null : subKey)}
                            >
                              <span className="font-semibold">{sub}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[8px] text-[#5a6b7c] font-mono">
                                  {subItems.length}
                                </span>
                                <span className="text-[9px] text-[#5a6b7c]">
                                  {isSubOpen ? "▾" : "▸"}
                                </span>
                              </div>
                            </div>
                            {isSubOpen && (
                              <div>
                                {subItems.map((item) => (
                                  <div
                                    key={item.type}
                                    className="pl-8 pr-3 py-1.5 hover:bg-[#1f2630] hover:text-[#00e5ff] cursor-pointer truncate text-[11px] text-[#c8d1dc]"
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
    </>
  );
};
