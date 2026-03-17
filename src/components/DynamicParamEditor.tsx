import type { ParamSchema } from "@/types.ts";

interface DynamicParamEditorProps {
  schema: Record<string, ParamSchema>;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export const DynamicParamEditor = ({
  schema,
  values,
  onChange,
}: DynamicParamEditorProps) => {
  return (
    <div className="space-y-2 w-full">
      {Object.entries(schema).map(([key, def]) => (
        <div key={key} className="flex flex-col gap-0.5">
          <label className="text-[9px] text-[var(--relax-text-muted)] font-bold tracking-widest uppercase">
            {def.label}
          </label>
          {def.type === "number" && (
            <input
              type="number"
              min={def.min}
              max={def.max}
              step={def.step ?? 1}
              value={values[key] ?? def.default}
              onChange={(e) => onChange(key, parseFloat(e.target.value))}
              className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)] nowheel nodrag"
            />
          )}
          {def.type === "boolean" && (
            <button
              type="button"
              onClick={() => onChange(key, !(values[key] ?? def.default))}
              className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${(values[key] ?? def.default) ? "bg-[var(--relax-accent)]" : "bg-[var(--relax-border)]"}`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${(values[key] ?? def.default) ? "translate-x-4" : "translate-x-0.5"}`}
              />
            </button>
          )}
          {def.type === "dropdown" && def.options && (
            <select
              value={values[key] ?? def.default}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)] nodrag"
            >
              {def.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {def.type === "string" && (
            <input
              type="text"
              value={values[key] ?? def.default ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="w-full bg-[var(--relax-bg-primary)]/60 border border-[var(--relax-border)] rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-[var(--relax-accent)] nodrag"
            />
          )}
        </div>
      ))}
    </div>
  );
};
