import { PulsingDot } from "../primitives/PulsingDot";
import type { RunState } from "../state/runStateTypes";

interface HeaderProps {
  state: RunState;
  scoutConnected: boolean;
  runConnected: boolean;
  onReset?: () => void;
}

const STAGE_ORDER = ["curate", "research", "write", "voice", "verify", "multiplex"] as const;

export function Header({ state, scoutConnected, runConnected, onReset }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[color:var(--color-bg)]/70 border-b border-[color:var(--color-hairline)]">
      <div className="flex items-center justify-between px-6 py-3 gap-6">
        {/* Brand — links back to landing (hard nav out of /app/) */}
        <a
          href="/"
          className="flex items-center gap-2 font-[family-name:var(--font-display)] font-medium text-base text-[color:var(--color-ink)] hover:opacity-80 transition-opacity no-underline"
          aria-label="Back to Timbre home"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7FA98B" />
                <stop offset="55%" stopColor="#E8A574" />
                <stop offset="100%" stopColor="#F4D8A0" />
              </linearGradient>
            </defs>
            <path d="M12 2 L13.5 9 L21 10.5 L13.5 12 L12 19 L10.5 12 L3 10.5 L10.5 9 Z" fill="url(#sg)" />
          </svg>
          <span>Timbre</span>
        </a>

        {/* Topic mid */}
        <div className="hidden md:flex flex-1 items-center min-w-0">
          {state.topic ? (
            <div className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-dim)] truncate">
              <span className="text-[color:var(--color-ink-mute)] mr-1.5">topic:</span>
              <span className="text-[color:var(--color-ink)]">{state.topic}</span>
              {state.mode === "cached" && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-[color:var(--color-amber)]/10 text-[color:var(--color-amber)] border border-[color:var(--color-amber)]/25">
                  cached
                </span>
              )}
            </div>
          ) : (
            <div className="font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-mute)]">
              awaiting run…
            </div>
          )}
        </div>

        {/* Stage rail — full names, bigger, with status-driven color */}
        <div className="flex items-center gap-2">
          {STAGE_ORDER.map((stage) => {
            const s = state.stages[stage];
            const accentClass =
              s.status === "active"
                ? "text-[color:var(--color-amber)] bg-[color:var(--color-amber)]/10 border-[color:var(--color-amber)]/35"
                : s.status === "done"
                ? "text-[color:var(--color-sage)] bg-[color:var(--color-sage)]/8 border-[color:var(--color-sage)]/30"
                : s.status === "error"
                ? "text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 border-[color:var(--color-danger)]/35"
                : "text-[color:var(--color-ink-mute)] border-[color:var(--color-hairline)]";
            return (
              <div
                key={stage}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${accentClass} transition-colors`}
                title={`${stage}: ${s.status}`}
              >
                <PulsingDot variant={s.status === "idle" ? "idle" : s.status} size={6} />
                <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider hidden md:inline capitalize">
                  {stage}
                </span>
              </div>
            );
          })}
        </div>

        {/* Connection */}
        <div className="flex items-center gap-2 pl-3 border-l border-[color:var(--color-hairline)]">
          <PulsingDot variant={runConnected || scoutConnected ? "active" : "error"} size={6} />
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--color-ink-mute)] uppercase tracking-wider hidden md:inline">
            {runConnected ? "live" : scoutConnected ? "scout" : "offline"}
          </span>
        </div>

        {/* Reset — shown only when a run is active */}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-[color:var(--color-hairline)] text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-ink)] hover:border-[color:var(--color-amber)]/40 hover:bg-[color:var(--color-amber)]/8 transition-colors"
            aria-label="Reset run and return to topic picker"
            title="Clear this run and start over"
          >
            Reset
          </button>
        )}
      </div>
    </header>
  );
}
