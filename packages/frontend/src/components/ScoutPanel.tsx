import { useState } from "react";
import type { ScoutStateResponse, Candidate } from "@timbre/shared/contracts";
import { PulsingDot } from "../primitives/PulsingDot";
import { triggerScout } from "../api/scout";

interface ScoutPanelProps {
  scoutState: ScoutStateResponse | null;
  onCandidateClick?: (candidate: Candidate) => void;
  scanning?: { tick_id: string; at: string } | null;
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

function durationSeconds(startedAt: string, completedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  return Math.max(0, Math.round((end - start) / 1000));
}

function shortEnv(envId: string): string {
  // Antigravity env IDs are long UUIDs — keep the prefix and first 6 chars.
  const parts = envId.split(/[:_-]/);
  const head = parts[0] ?? envId;
  return head.length > 8 ? head.slice(0, 8) : head;
}

function formatUptime(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin ? `${hours}h ${remMin}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// The 10 sources Scout monitors per sources.yaml in timbre-scout-config.
// Order matters: groups by kind so the rail reads as a tidy grid.
const MONITORED_SOURCES: { id: string; label: string; kind: "hn" | "arxiv" | "rss" | "x" }[] = [
  { id: "hn_tag:hn-frontpage",   label: "hn-frontpage",   kind: "hn" },
  { id: "hn_tag:hn-newest",      label: "hn-newest",      kind: "hn" },
  { id: "arxiv:arxiv-cs-ai",     label: "arxiv cs.AI",    kind: "arxiv" },
  { id: "arxiv:arxiv-cs-lg",     label: "arxiv cs.LG",    kind: "arxiv" },
  { id: "rss:rss-openai",        label: "openai",         kind: "rss" },
  { id: "rss:rss-deepmind",      label: "deepmind",       kind: "rss" },
  { id: "rss:rss-anthropic",     label: "anthropic",      kind: "rss" },
  { id: "rss:rss-simonwillison", label: "simonwillison",  kind: "rss" },
  { id: "rss:rss-latent-space",  label: "latent.space",   kind: "rss" },
  { id: "x_user:x-karpathy",     label: "@karpathy",      kind: "x" },
];

// Antigravity's tool primitives Scout uses, per specs/00-master.md §3.
const ANTIGRAVITY_TOOLS = ["code_execution", "google_search", "url_context", "filesystem"] as const;

function bySourceCount(candidates: Candidate[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of candidates) m.set(c.source, (m.get(c.source) ?? 0) + 1);
  return m;
}

export function ScoutPanel({ scoutState, onCandidateClick, scanning }: ScoutPanelProps) {
  const tick = scoutState?.latest_tick;
  const candidates = scoutState?.candidates ?? [];
  const alerts = scoutState?.alerts ?? [];
  const tickHistory = scoutState?.tick_history ?? [];
  const topAlert = alerts[0];
  const [refreshing, setRefreshing] = useState(false);
  const isWorking = !!scanning || refreshing;

  const handleRefresh = async () => {
    if (isWorking) return;
    setRefreshing(true);
    try {
      await triggerScout({});
    } catch {
      /* surface elsewhere if needed */
    } finally {
      // Backend keeps running even if HTTP times out; reset after a generous window.
      setTimeout(() => setRefreshing(false), 300_000);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4 font-[family-name:var(--font-sans)]">
      {/* Tick header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PulsingDot variant={isWorking ? "active" : tick ? "active" : "idle"} size={8} />
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
            Scout
          </span>
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[10px] text-[color:var(--color-ink-mute)]">
          {tickHistory.length} tick{tickHistory.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] leading-relaxed">
        Managed agent on Google Antigravity (new at I/O 2026) ·
        always-on Linux sandbox · scores 10 feeds against your voice DNA hourly.
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[color:var(--color-sage)]/30 text-[color:var(--color-sage)] bg-[color:var(--color-sage)]/5">
          antigravity-preview-05-2026
        </span>
        {tick?.env_id && (
          <a
            href={`https://antigravity.google.com/envs/${tick.env_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[color:var(--color-hairline)] text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-amber)] hover:border-[color:var(--color-amber)]/40 transition-colors"
            title={`Sandbox env: ${tick.env_id} — open in Antigravity`}
          >
            env: {shortEnv(tick.env_id)} ↗
          </a>
        )}
      </div>

      {/* Capability rail — proof of what Antigravity actually exposes to the agent */}
      <div className="flex flex-col gap-1.5">
        <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
          Capabilities
        </div>
        <div className="flex flex-wrap gap-1">
          {ANTIGRAVITY_TOOLS.map((t) => (
            <span
              key={t}
              className="font-[family-name:var(--font-mono)] text-[9px] px-1.5 py-0.5 rounded border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)]"
              title={`Antigravity tool: ${t}`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Live activity ribbon — shows what Scout is doing RIGHT NOW */}
      {isWorking ? (
        <div className="rounded-lg border border-[color:var(--color-amber)]/40 bg-[color:var(--color-amber)]/8 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PulsingDot variant="active" size={6} />
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-amber)]">
              scanning live
            </span>
          </div>
          <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)] leading-snug">
            Cloning timbre-scout-config into sandbox at /workspace/scout · fetching 8 sources × 24h window · scoring against voice DNA.
          </div>
          <div className="text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
            Antigravity ticks take 60–180s. Streaming…
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleRefresh}
          className="self-start font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/10 transition"
        >
          ↻ Refresh now
        </button>
      )}
      {tick ? (
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)]">
            last tick {relativeTime(tick.completed_at)} · ran {durationSeconds(tick.started_at, tick.completed_at)}s · +{tick.new_candidates_count} new
          </div>
          <div className="text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] leading-snug">
            scanned {MONITORED_SOURCES.length} sources · scored {tick.candidates_count} · {alerts.length} alert{alerts.length === 1 ? "" : "s"} above 0.85 threshold
          </div>
          {tickHistory.length > 0 && (
            <div className="text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] leading-snug">
              sandbox up {formatUptime(tickHistory[tickHistory.length - 1].at)} · {tickHistory.length} tick{tickHistory.length === 1 ? "" : "s"} this session
            </div>
          )}
        </div>
      ) : candidates.length > 0 ? (
        <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
          Showing cached snapshot. Hit refresh to scan now.
        </div>
      ) : (
        <div className="text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
          No ticks yet. Hit refresh to fire one.
        </div>
      )}

      {/* Sources monitored — visual diversity proof (10 chips, hit counts from latest tick) */}
      <div>
        <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-2 flex items-baseline justify-between">
          <span>Sources monitored</span>
          <span className="normal-case tracking-normal text-[color:var(--color-ink-mute)]">
            {MONITORED_SOURCES.length} feeds
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {(() => {
            const counts = bySourceCount(candidates);
            return MONITORED_SOURCES.map((s) => {
              const hits = counts.get(s.id) ?? 0;
              const active = hits > 0;
              return (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-1.5 px-1.5 py-1 rounded border ${
                    active
                      ? "border-[color:var(--color-sage)]/30 bg-[color:var(--color-sage)]/5"
                      : "border-[color:var(--color-hairline)]"
                  }`}
                  title={`${s.id} — ${hits} candidate${hits === 1 ? "" : "s"} in latest tick`}
                >
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[color:var(--color-ink-dim)] truncate">
                    {s.label}
                  </span>
                  <span
                    className={`font-[family-name:var(--font-mono)] text-[9px] tabular-nums ${
                      active ? "text-[color:var(--color-sage)]" : "text-[color:var(--color-ink-mute)]"
                    }`}
                  >
                    {hits}
                  </span>
                </div>
              );
            });
          })()}
        </div>
      </div>

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
        <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-2 flex items-baseline justify-between">
          <span>Top {Math.min(5, candidates.length)} candidates</span>
          {onCandidateClick && candidates.length > 0 && (
            <span className="text-[color:var(--color-sage)] normal-case tracking-normal">click to write →</span>
          )}
        </div>
        <ul className="flex flex-col gap-2">
          {candidates.slice(0, 5).map((c: Candidate) => {
            const inner = (
              <>
                <div className="text-[12px] leading-snug text-[color:var(--color-ink-dim)] group-hover:text-[color:var(--color-ink)] line-clamp-2">
                  {c.title}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-[family-name:var(--font-mono)] text-[9px] text-[color:var(--color-ink-mute)]">
                    {c.source}
                  </span>
                  <span
                    className="text-[9px] font-[family-name:var(--font-mono)] tabular-nums"
                    style={{ color: c.combined_score > 0.7 ? "var(--color-amber)" : "var(--color-ink-mute)" }}
                  >
                    {c.combined_score.toFixed(2)}
                  </span>
                </div>
              </>
            );
            return (
              <li key={c.id} className="border-b border-[color:var(--color-hairline)] pb-2 last:border-b-0">
                {onCandidateClick ? (
                  <button
                    type="button"
                    onClick={() => onCandidateClick(c)}
                    className="group w-full text-left rounded px-2 py-1.5 -mx-2 hover:bg-[color:var(--color-amber)]/10 transition"
                  >
                    {inner}
                  </button>
                ) : (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener"
                    className="group block"
                  >
                    {inner}
                  </a>
                )}
              </li>
            );
          })}
          {candidates.length === 0 && (
            <li className="text-[11px] text-[color:var(--color-ink-mute)] italic">
              Awaiting first scout tick…
            </li>
          )}
        </ul>
      </div>

      {/* Tick cadence chart — visual rhythm of the always-on agent */}
      {tickHistory.length > 0 && (() => {
        const recent = tickHistory.slice(0, 18).reverse();
        const peak = Math.max(1, ...recent.map((t) => t.new_candidates_count));
        const totalNew = recent.reduce((sum, t) => sum + t.new_candidates_count, 0);
        return (
          <div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-2 flex items-baseline justify-between">
              <span>Cadence · last {recent.length} ticks</span>
              <span className="normal-case tracking-normal text-[color:var(--color-sage)] tabular-nums">
                +{totalNew} new
              </span>
            </div>
            <div className="flex items-end gap-0.5 h-10 px-0.5">
              {recent.map((t) => {
                const heightPct = (t.new_candidates_count / peak) * 100;
                const isEmpty = t.new_candidates_count === 0;
                return (
                  <div
                    key={t.tick_id}
                    className="flex-1 rounded-t-sm transition-colors"
                    style={{
                      height: isEmpty ? "6%" : `${Math.max(12, heightPct)}%`,
                      background: isEmpty
                        ? "var(--color-hairline)"
                        : "var(--color-sage)",
                      opacity: isEmpty ? 0.5 : 0.55 + (t.new_candidates_count / peak) * 0.45,
                    }}
                    title={`${relativeTime(t.at)} · +${t.new_candidates_count} new`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] mt-1">
              <span>{relativeTime(recent[0].at)}</span>
              <span>now</span>
            </div>
          </div>
        );
      })()}

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

      {/* Raw agent stdout — the strongest 'this is the real agent talking' signal */}
      {tick?.output_text_excerpt && (
        <details>
          <summary className="cursor-pointer font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-ink-dim)]">
            agent stdout · last tick
          </summary>
          <pre className="mt-2 p-2 bg-[color:var(--color-bg)] border border-[color:var(--color-hairline)] rounded text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-dim)] whitespace-pre-wrap break-words leading-snug max-h-64 overflow-y-auto">
            {tick.output_text_excerpt}
          </pre>
        </details>
      )}
    </div>
  );
}
