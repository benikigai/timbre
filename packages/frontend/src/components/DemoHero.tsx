// Pre-run hero on /demo. Two modes:
// - watch (default): one big play button → cached run; guaranteed clean
// - advanced: existing RunControls (topic + live/cached toggle)

import { useState } from "react";
import { startRun } from "../api/runs";
import { PulsingDot } from "../primitives/PulsingDot";
import { RunControls } from "./RunControls";

interface DemoHeroProps {
  onRunStarted: (runId: string) => void;
}

const DEFAULT_TOPIC = "The Shift to Agentic Web Infrastructure";

const BEATS = [
  { n: "01", label: "Scout", note: "monitors your industry" },
  { n: "02", label: "Curate", note: "picks 3 candidates" },
  { n: "03", label: "Research", note: "proposes a plan, you approve" },
  { n: "04", label: "Write", note: "drafts the article" },
  { n: "05", label: "Voice", note: "rewrites in your voice" },
  { n: "06", label: "Verify", note: "catches drift" },
  { n: "07", label: "Multiplex", note: "fans out to audio + carousel" },
];

export function DemoHero({ onRunStarted }: DemoHeroProps) {
  const [mode, setMode] = useState<"watch" | "advanced">("watch");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCachedDemo = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const resp = await startRun({
        topic: DEFAULT_TOPIC,
        mode: "cached",
        cache_fixture: "agentic-web-infra",
      });
      onRunStarted(resp.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start demo");
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-2 self-start font-mono text-[10px] uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setMode("watch")}
          className={`px-3 py-1.5 rounded-full border transition ${
            mode === "watch"
              ? "border-[color:var(--color-amber)]/60 text-[color:var(--color-amber)] bg-[color:var(--color-amber)]/10"
              : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)]"
          }`}
        >
          Watch the demo
        </button>
        <button
          type="button"
          onClick={() => setMode("advanced")}
          className={`px-3 py-1.5 rounded-full border transition ${
            mode === "advanced"
              ? "border-[color:var(--color-sage)]/60 text-[color:var(--color-sage)] bg-[color:var(--color-sage)]/10"
              : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)]"
          }`}
        >
          Try with live API
        </button>
      </div>

      {mode === "watch" ? (
        // ─── Watch mode: one big CTA + 7-beat preview ───────────────────
        <div className="rounded-3xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] backdrop-blur-md p-8 md:p-12 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <button
              type="button"
              onClick={startCachedDemo}
              disabled={starting}
              className="group shrink-0 inline-flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-full bg-[color:var(--color-amber)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-amber-hot)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_-12px_rgba(232,165,116,0.6)]"
              aria-label="Start the demo"
            >
              {starting ? (
                <PulsingDot variant="active" size={12} />
              ) : (
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-1 transition-transform group-hover:scale-110"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex flex-col gap-2 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
                Live demo · ~3 min · seven stages
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl leading-tight tracking-tight">
                {starting
                  ? "Starting the pipeline…"
                  : "Watch Timbre write a post"}
              </h2>
              <p className="text-[color:var(--color-ink-dim)] leading-relaxed">
                The agent picks a topic, proposes a research plan (you can
                modify it), and produces a verified article in your voice.
                Voice rewrite + drift catch is the centerpiece.
              </p>
            </div>
          </div>

          {/* 7-beat preview rail */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {BEATS.map((b) => (
              <div
                key={b.n}
                className="px-3 py-3 rounded-xl border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)]/40 flex flex-col gap-1"
              >
                <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)]">
                  {b.n}
                </span>
                <span className="font-[family-name:var(--font-display)] text-sm leading-tight">
                  {b.label}
                </span>
                <span className="text-[11px] text-[color:var(--color-ink-dim)] leading-tight">
                  {b.note}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[color:var(--color-ink-mute)] font-mono">
            Topic:{" "}
            <span className="text-[color:var(--color-ink-dim)]">
              {DEFAULT_TOPIC}
            </span>
            {"  ·  "}
            Cached replay for guaranteed clean playback.
          </p>

          {error && (
            <div className="font-mono text-[11px] text-[color:var(--color-danger)]">
              {error}
            </div>
          )}
        </div>
      ) : (
        // ─── Advanced mode: existing RunControls ────────────────────────
        <div className="rounded-3xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] backdrop-blur-md p-6 md:p-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
              Advanced · live API
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl leading-tight tracking-tight">
              Run your own topic
            </h2>
            <p className="text-[color:var(--color-ink-dim)] text-sm leading-relaxed">
              Hits the real Gemini Antigravity + Deep Research APIs. Live
              Curate (~6s) + Research plan (~14s) + plan-approval gate, then
              hands off to cached replay for the rest. Tokens accrue.
            </p>
          </div>
          <RunControls onRunStarted={onRunStarted} />
        </div>
      )}
    </div>
  );
}
