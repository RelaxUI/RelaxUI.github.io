import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  nodeId: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: string;
}

export class NodeErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Node ${this.props.nodeId}] Render error:`, error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-2 text-[10px] text-red-400 font-mono">
          <p className="font-bold mb-1">Render Error</p>
          <p className="text-red-300/70 break-all">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: "" })}
            className="mt-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30 transition-colors"
          >
            RETRY
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
