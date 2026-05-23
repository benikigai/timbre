import type { ScoutStateResponse } from "@timbre/shared/contracts";
import { PulsingDot } from "../primitives/PulsingDot";

interface ScoutPanelProps {
  scoutState: ScoutStateResponse | null;
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ScoutPanel({ scoutState }: ScoutPanelProps) {
  const tick = scoutState?.latest_tick;
  const candidates = scoutState?.candidates ?? [];
  const alerts = scoutState?.alerts ?? [];
  const tickHistory = scoutState?.tick_history ?? [];
  const topAlert = alerts[0];

  return (
    <div className="p-4 flex flex-col gap-4 font-[family-name:var(--font-sans)]">
      {/* Tick header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulsingDot variant={tick ? "active" : "idle"} size={8} />
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
            Scout
          </span>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--color-ink-mute)]">
          {tickHistory.length} ticks
        </span>
      </div>

      {tick ? (
        <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)]">
          last tick {relativeTime(tick.completed_at)} · {tick.candidates_count} candidates · +{tick.new_candidates_count} new
        </div>
      ) : (
        <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
          No ticks yet. Cron kicks off hourly.
        </div>
      )}

      {/* Top alert */}
      {topAlert && (
        <div className="rounded-lg border border-[color:var(--color-amber)]/35 bg-[color:var(--color-amber)]/8 p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-amber)]">
              Alert · {topAlert.candidate.combined_score.toFixed(2)}
            </span>
            <span className="text-[10px] text-[color:var(--color-ink-mute)]">
              {relativeTime(topAlert.triggered_at)}
            </span>
          </div>
          <a
            href={topAlert.candidate.url}
            target="_blank"
            rel="noopener"
            className="text-sm text-[color:var(--color-ink)] hover:text-[color:var(--color-amber)] line-clamp-2 font-medium"
          >
            {topAlert.candidate.title}
          </a>
          <p className="text-[11px] text-[color:var(--color-ink-dim)] mt-1.5 line-clamp-2">{topAlert.reason}</p>
        </div>
      )}

      {/* Candidates list */}
      <div>
        <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-2">
          Candidates ({candidates.length})
        </div>
        <ul className="flex flex-col gap-2">
          {candidates.slice(0, 10).map((c) => (
            <li key={c.id} className="border-b border-[color:var(--color-hairline)] pb-2 last:border-b-0">
              <a
                href={c.url}
                target="_blank"
                rel="noopener"
                className="block text-[12px] leading-snug text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)] line-clamp-2"
              >
                {c.title}
              </a>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[color:var(--color-ink-mute)]">
                  {c.source}
                </span>
                <span
                  className="text-[9px] font-[family-name:var(--font-mono)] tabular-nums"
                  style={{
                    color: c.combined_score > 0.7 ? "var(--color-amber)" : "var(--color-ink-mute)",
                  }}
                >
                  {c.combined_score.toFixed(2)}
                </span>
              </div>
            </li>
          ))}
          {candidates.length === 0 && (
            <li className="text-[11px] text-[color:var(--color-ink-mute)] italic">
              Awaiting first scout tick…
            </li>
          )}
        </ul>
      </div>

      {/* Collapsible ls block — the cold-open prop */}
      {tick?.ls_output_text && (
        <details className="mt-2">
          <summary className="cursor-pointer font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-ink-dim)]">
            ls -la /workspace
          </summary>
          <pre className="mt-2 p-2 bg-[color:var(--color-bg)] border border-[color:var(--color-hairline)] rounded text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)] whitespace-pre overflow-x-auto leading-snug">
            {tick.ls_output_text}
          </pre>
        </details>
      )}
    </div>
  );
}
