import type React from "react";

const ENTITY_COLORS: Record<string, string> = {
  PER: "#ff6b6b",
  PERSON: "#ff6b6b",
  ORG: "var(--relax-accent)",
  ORGANIZATION: "var(--relax-accent)",
  LOC: "var(--relax-success)",
  LOCATION: "var(--relax-success)",
  MISC: "#ffd93d",
  DATE: "#a29bfe",
  TIME: "#fd79a8",
  MONEY: "#00b894",
  PERCENT: "#e17055",
  GPE: "#0984e3",
};

function getEntityColor(entity: string): string {
  const key = entity.replace(/^B-|^I-/, "").toUpperCase();
  return ENTITY_COLORS[key] || "#6c5ce7";
}

interface Entity {
  entity: string;
  entity_group?: string;
  word: string;
  start: number;
  end: number;
  score: number;
}

export function HighlightedText({
  data,
  sourceText,
}: {
  data: any;
  sourceText?: string;
}) {
  if (!Array.isArray(data) || data.length === 0) return null;

  const entities: Entity[] = data
    .filter((d: any) => d && (d.entity || d.entity_group) && d.word)
    .sort((a: Entity, b: Entity) => (a.start ?? 0) - (b.start ?? 0));

  if (entities.length === 0) return null;

  // If we have start/end and sourceText, reconstruct with highlights
  if (sourceText && entities[0]?.start !== undefined) {
    const segments: React.ReactNode[] = [];
    let lastEnd = 0;

    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i]!;
      if (ent.start > lastEnd) {
        segments.push(
          <span key={`t-${i}`}>{sourceText.slice(lastEnd, ent.start)}</span>,
        );
      }
      const entityType = ent.entity_group || ent.entity;
      const color = getEntityColor(entityType);
      segments.push(
        <span
          key={`e-${i}`}
          className="px-0.5 rounded-sm text-white font-bold"
          style={{ backgroundColor: `${color}40`, borderBottom: `2px solid ${color}` }}
          title={`${entityType} (${(ent.score * 100).toFixed(1)}%)`}
        >
          {sourceText.slice(ent.start, ent.end)}
        </span>,
      );
      lastEnd = ent.end;
    }
    if (lastEnd < sourceText.length) {
      segments.push(<span key="tail">{sourceText.slice(lastEnd)}</span>);
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="text-xs font-mono leading-relaxed text-[var(--relax-text-default)]">
          {segments}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {[...new Set(entities.map((e) => e.entity_group || e.entity))].map(
            (type) => (
              <span
                key={type}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${getEntityColor(type)}30`, color: getEntityColor(type) }}
              >
                {type.replace(/^B-|^I-/, "")}
              </span>
            ),
          )}
        </div>
      </div>
    );
  }

  // Fallback: just show entity tags
  return (
    <div className="flex flex-wrap gap-1">
      {entities.map((ent, i) => {
        const entityType = ent.entity_group || ent.entity;
        const color = getEntityColor(entityType);
        return (
          <span
            key={i}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ backgroundColor: `${color}30`, color }}
          >
            {ent.word}{" "}
            <span className="opacity-60">{entityType.replace(/^B-|^I-/, "")}</span>
          </span>
        );
      })}
    </div>
  );
}
