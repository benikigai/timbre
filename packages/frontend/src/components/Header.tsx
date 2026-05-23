import { PulsingDot } from "../primitives/PulsingDot";
import type { RunState } from "../state/runStateTypes";

interface HeaderProps {
  state: RunState;
  scoutConnected: boolean;
  runConnected: boolean;
}

const STAGE_ORDER = ["curate", "research", "write", "voice", "verify", "multiplex"] as const;

export function Header({ state, scoutConnected, runConnected }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[color:var(--color-bg)]/70 border-b border-[color:var(--color-hairline)]">
      <div className="flex items-center justify-between px-6 py-3 gap-6">
        {/* Brand */}
        <div className="flex items-center gap-2 font-[family-name:var(--font-display)] font-medium text-base">
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
        </div>

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

        {/* Stage dots (collapsed Council per spec) */}
        <div className="flex items-center gap-3">
          {STAGE_ORDER.map((stage) => {
            const s = state.stages[stage];
            return (
              <div key={stage} className="flex items-center gap-1.5" title={`${stage}: ${s.status}`}>
                <PulsingDot variant={s.status === "idle" ? "idle" : s.status} size={7} />
                <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--color-ink-mute)] uppercase tracking-wider hidden lg:inline">
                  {stage.slice(0, 4)}
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
      </div>
    </header>
  );
}
