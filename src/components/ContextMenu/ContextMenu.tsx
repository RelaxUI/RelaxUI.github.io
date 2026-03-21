import {
  CATEGORIES,
  MACRO_INTERNAL_CATEGORY,
  getNodeMenuItems,
} from "@/utils/nodeMenuItems.ts";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  currentView: string | null;
  onSelect: (type: string) => void;
}

const EDGE = 8;
const GAP = 2;
const MAIN_W = 210;
const SUB_W = 220;

/* ─── Flyout sub-panel ───────────────────────────────────────────── */

function Flyout({
  anchorRect,
  side,
  z,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  anchorRect: DOMRect;
  side: "right" | "left";
  z: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();

    // horizontal: try preferred side, flip if overflow
    let left =
      side === "right"
        ? anchorRect.right + GAP
        : anchorRect.left - width - GAP;
    if (left + width > window.innerWidth - EDGE)
      left = anchorRect.left - width - GAP;
    if (left < EDGE) left = anchorRect.right + GAP;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE));

    // vertical: align top with trigger, clamp to screen
    let top = anchorRect.top;
    if (top + height > window.innerHeight - EDGE)
      top = window.innerHeight - height - EDGE;
    top = Math.max(EDGE, top);

    setPos({ left, top });
  }, [anchorRect, side]);

  return (
    <div
      ref={ref}
      className="fixed bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg shadow-2xl py-1 font-mono text-xs custom-scrollbar"
      style={{
        left: pos.left,
        top: pos.top,
        zIndex: z,
        width: SUB_W,
        maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        overflowY: "auto",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ─── Main context menu ──────────────────────────────────────────── */

export const ContextMenu = ({
  x,
  y,
  currentView,
  onSelect,
}: ContextMenuProps) => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<{
    name: string;
    rect: DOMRect;
  } | null>(null);
  const [activeSub, setActiveSub] = useState<{
    cat: string;
    sub: string;
    rect: DOMRect;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ left: x, top: y });
  const [side, setSide] = useState<"right" | "left">("right");

  const catTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const subTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const allItems = useMemo(
    () => getNodeMenuItems(currentView),
    [currentView],
  );
  const categories = useMemo(
    () => [...CATEGORIES, ...(currentView ? [MACRO_INTERNAL_CATEGORY] : [])],
    [currentView],
  );

  // ── Search ──
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return allItems.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.type.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.subcategory?.toLowerCase().includes(q),
    );
  }, [search, allItems]);

  // ── Data helpers ──
  const directOf = (cat: string) =>
    allItems.filter((i) => i.category === cat && !i.subcategory);

  const subsOf = (cat: string) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const i of allItems)
      if (i.category === cat && i.subcategory && !seen.has(i.subcategory)) {
        seen.add(i.subcategory);
        out.push(i.subcategory);
      }
    return out;
  };

  const itemsOf = (cat: string, sub: string) =>
    allItems.filter((i) => i.category === cat && i.subcategory === sub);

  const countOf = (cat: string) =>
    allItems.filter((i) => i.category === cat).length;

  // ── Main menu positioning ──
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + width > window.innerWidth - EDGE)
      left = window.innerWidth - width - EDGE;
    if (top + height > window.innerHeight - EDGE)
      top = window.innerHeight - height - EDGE;
    left = Math.max(EDGE, left);
    top = Math.max(EDGE, top);
    setMenuPos({ left, top });
    setSide(
      window.innerWidth - (left + width) >= SUB_W + GAP ? "right" : "left",
    );
  }, [x, y]);

  // ── Hover timers ──
  const clr = () => {
    if (catTimer.current) clearTimeout(catTimer.current);
    if (subTimer.current) clearTimeout(subTimer.current);
  };

  const closeCat = () => {
    catTimer.current = setTimeout(() => {
      setActiveCat(null);
      setActiveSub(null);
    }, 180);
  };

  const closeSub = () => {
    subTimer.current = setTimeout(() => setActiveSub(null), 180);
  };

  const click = (type: string) => {
    clr();
    onSelect(type);
  };

  // ── Shared classes ──
  const itemCls =
    "px-3 py-1.5 hover:bg-(--relax-accent)/10 hover:text-(--relax-accent) cursor-pointer truncate text-[11px] text-(--relax-text-default) transition-colors";

  return (
    <>
      {/* ── Main panel ── */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-(--relax-bg-elevated) border border-(--relax-border-hover) rounded-lg shadow-2xl font-mono text-xs flex flex-col"
        style={{
          left: menuPos.left,
          top: menuPos.top,
          width: MAIN_W,
          maxHeight: `calc(100vh - ${EDGE * 2}px)`,
        }}
      >
        {/* search */}
        <div className="p-2 border-b border-(--relax-border) shrink-0">
          <input
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCat(null);
              setActiveSub(null);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                filteredItems &&
                filteredItems.length > 0
              )
                click(filteredItems[0]!.type);
            }}
            className="w-full bg-(--relax-bg-primary) border border-(--relax-border) rounded px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-(--relax-accent) focus:outline-none placeholder:text-(--relax-text-muted)"
            placeholder="Search nodes..."
          />
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 py-1">
          {filteredItems ? (
            /* search results */
            filteredItems.length === 0 ? (
              <div className="px-4 py-4 text-(--relax-text-muted) text-center text-[11px]">
                No results
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.type}
                  className={itemCls}
                  onClick={() => click(item.type)}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="truncate">{item.label}</span>
                    <span className="text-[8px] text-(--relax-text-muted) shrink-0">
                      {item.subcategory || item.category}
                    </span>
                  </div>
                </div>
              ))
            )
          ) : (
            /* category rows */
            categories.map((cat) => {
              const count = countOf(cat);
              if (!count) return null;
              const active = activeCat?.name === cat;
              return (
                <div
                  key={cat}
                  className={`px-3 py-1.5 cursor-pointer flex justify-between items-center transition-colors ${
                    active
                      ? "bg-(--relax-accent)/10 text-(--relax-accent)"
                      : "hover:bg-(--relax-border) text-(--relax-text-bright)"
                  }`}
                  onMouseEnter={(e) => {
                    clr();
                    setActiveSub(null);
                    setActiveCat({
                      name: cat,
                      rect: e.currentTarget.getBoundingClientRect(),
                    });
                  }}
                  onMouseLeave={closeCat}
                >
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {cat}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] text-(--relax-text-muted) font-mono">
                      {count}
                    </span>
                    <span className="text-[9px] text-(--relax-text-muted)">
                      ▸
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── First-level flyout (items + subcategory headers) ── */}
      {activeCat && !filteredItems && (
        <Flyout
          key={activeCat.name}
          anchorRect={activeCat.rect}
          side={side}
          z={51}
          onMouseEnter={clr}
          onMouseLeave={closeCat}
        >
          {(() => {
            const direct = directOf(activeCat.name);
            const subs = subsOf(activeCat.name);
            return (
              <>
                {direct.map((item) => (
                  <div
                    key={item.type}
                    className={itemCls}
                    onClick={() => click(item.type)}
                    title={item.label}
                  >
                    {item.label}
                  </div>
                ))}
                {direct.length > 0 && subs.length > 0 && (
                  <div className="border-t border-(--relax-border) my-1" />
                )}
                {subs.map((sub) => {
                  const n = itemsOf(activeCat.name, sub).length;
                  const active =
                    activeSub?.cat === activeCat.name &&
                    activeSub?.sub === sub;
                  return (
                    <div
                      key={sub}
                      className={`px-3 py-1.5 cursor-pointer flex justify-between items-center text-[10px] transition-colors ${
                        active
                          ? "bg-(--relax-accent)/10 text-(--relax-accent)"
                          : "hover:bg-(--relax-border) text-(--relax-text-muted)"
                      }`}
                      onMouseEnter={(e) => {
                        clr();
                        setActiveSub({
                          cat: activeCat.name,
                          sub,
                          rect: e.currentTarget.getBoundingClientRect(),
                        });
                      }}
                      onMouseLeave={closeSub}
                    >
                      <span className="font-semibold">{sub}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-mono">{n}</span>
                        <span className="text-[9px]">▸</span>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </Flyout>
      )}

      {/* ── Second-level flyout (subcategory items) ── */}
      {activeSub && activeCat && !filteredItems && (
        <Flyout
          key={`${activeSub.cat}:${activeSub.sub}`}
          anchorRect={activeSub.rect}
          side={side}
          z={52}
          onMouseEnter={clr}
          onMouseLeave={() => {
            closeSub();
            closeCat();
          }}
        >
          {itemsOf(activeSub.cat, activeSub.sub).map((item) => (
            <div
              key={item.type}
              className={itemCls}
              onClick={() => click(item.type)}
              title={item.label}
            >
              {item.label}
            </div>
          ))}
        </Flyout>
      )}
    </>
  );
};
