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
        <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-8 md:p-12 flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <button
              type="button"
              onClick={startCachedDemo}
              disabled={starting}
              className="group shrink-0 inline-flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full border border-[color:var(--color-amber)]/45 bg-[color:var(--color-amber)]/8 text-[color:var(--color-amber)] hover:bg-[color:var(--color-amber)]/14 hover:border-[color:var(--color-amber)]/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start the demo"
            >
              {starting ? (
                <PulsingDot variant="active" size={12} />
              ) : (
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-1 transition-transform group-hover:scale-110"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex flex-col gap-3 min-w-0">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
                Live demo · ~3 min · seven stages
              </p>
              <h2 className="font-[family-name:var(--font-display)] font-light text-[2.25rem] md:text-[2.75rem] leading-[1.05] tracking-[-0.01em]">
                {starting ? (
                  <>Starting the <em className="italic text-[color:var(--color-amber)]">pipeline…</em></>
                ) : (
                  <>Watch Timbre write <em className="italic text-[color:var(--color-amber)]">a post.</em></>
                )}
              </h2>
              <p className="text-[color:var(--color-ink-dim)] leading-relaxed max-w-[44ch]">
                The agent picks a topic, proposes a research plan you can modify, and produces a verified article in your voice. The voice rewrite plus drift catch is the centerpiece.
              </p>
            </div>
          </div>

          {/* 7-beat preview rail — ghost-numeral backgrounds, landing-page parity */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {BEATS.map((b) => (
              <div
                key={b.n}
                className="relative overflow-hidden px-3 py-3 rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)]/30 flex flex-col gap-1"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2 -right-1 font-[family-name:var(--font-display)] text-[3.2rem] leading-none font-light select-none"
                  style={{
                    background: "linear-gradient(135deg, var(--color-sage), var(--color-amber))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    opacity: 0.12,
                  }}
                >
                  {b.n}
                </span>
                <span className="relative font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
                  {b.n}
                </span>
                <span className="relative font-[family-name:var(--font-display)] text-base leading-tight">
                  {b.label}
                </span>
                <span className="relative text-[11px] text-[color:var(--color-ink-dim)] leading-tight">
                  {b.note}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[color:var(--color-ink-mute)] font-[family-name:var(--font-mono)]">
            Topic:{" "}
            <span className="text-[color:var(--color-ink-dim)]">{DEFAULT_TOPIC}</span>
            {"  ·  "}
            cached replay for guaranteed clean playback
          </p>

          {error && (
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-danger)]">
              {error}
            </div>
          )}
        </div>
      ) : (
        // ─── Advanced mode: existing RunControls ────────────────────────
        <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] p-6 md:p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
              Live API · real Gemini calls
            </p>
            <h2 className="font-[family-name:var(--font-display)] font-light text-3xl md:text-[2.25rem] leading-[1.05] tracking-[-0.01em]">
              Run <em className="italic text-[color:var(--color-amber)]">your own</em> topic.
            </h2>
            <p className="text-[color:var(--color-ink-dim)] text-sm leading-relaxed max-w-[52ch]">
              Type a topic below, <em className="not-italic text-[color:var(--color-amber)]">or click any of Scout's top-5 candidates on the left</em> to write about it. Hits real Antigravity (Curate ~6s) and Deep Research (~14s), then a plan-approval gate, then cached replay for Write / Voice / Verify. Tokens accrue.
            </p>
          </div>
          <RunControls onRunStarted={onRunStarted} />
        </div>
      )}
    </div>
  );
}
