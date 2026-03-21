import { FlowEditor } from "@/components/FlowEditor.tsx";
import { DEFAULT_THEME, useSettings } from "@/hooks/useSettings.ts";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";
import "./index.css";

function useThemeColors() {
  const { settings } = useSettings();
  const t = settings.themeColors ?? DEFAULT_THEME;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--relax-bg-primary", t.bgPrimary);
    root.style.setProperty("--relax-bg-elevated", t.bgElevated);
    root.style.setProperty("--relax-border", t.border);
    root.style.setProperty("--relax-border-hover", t.borderHover);
    root.style.setProperty("--relax-accent", t.accent);
    root.style.setProperty(
      "--relax-accent-gradient",
      `linear-gradient(to top right, ${t.accent}, ${t.accentGradientEnd})`,
    );
  }, [t.bgPrimary, t.bgElevated, t.border, t.borderHover, t.accent, t.accentGradientEnd]);
}

export default function App() {
  useThemeColors();
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
