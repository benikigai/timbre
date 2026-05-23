// Defensive error boundary — catches any throw in a child subtree and renders
// a contained fallback instead of unmounting the whole page. Wraps each
// dashboard panel individually so one component's crash (e.g. EditableDraft's
// fetch erroring) can't blank the rest of the demo.

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string; // Short identifier shown in the fallback ("EditableDraft", etc.)
}

interface State {
  err: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack?: string | null }): void {
    // Surface to console for debugging, but DON'T re-throw — that's the whole
    // point of the boundary.
    console.error(`[ErrorBoundary ${this.props.label ?? ""}]`, err, info);
  }

  render(): ReactNode {
    if (!this.state.err) return this.props.children;
    return (
      <div className="rounded-2xl border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/5 p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-danger)]">
            {this.props.label ?? "component"} crashed
          </span>
          <button
            type="button"
            onClick={() => this.setState({ err: null })}
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)] transition ml-auto"
          >
            retry
          </button>
        </div>
        <pre className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)] whitespace-pre-wrap break-words leading-snug">
          {this.state.err.message}
        </pre>
        <p className="text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
          Other panels keep working. Click retry to re-render this one.
        </p>
      </div>
    );
  }
}
