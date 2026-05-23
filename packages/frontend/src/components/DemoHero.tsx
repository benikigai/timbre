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
    <div className="flex flex-col gap-16 max-w-[64rem] mx-auto w-full py-8 md:py-14">
      {mode === "watch" ? (
        // ─── Watch mode: editorial hero, no card chrome ───────────────────
        <div className="flex flex-col gap-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-10">
            <button
              type="button"
              onClick={startCachedDemo}
              disabled={starting}
              className="group shrink-0 inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full border border-[color:var(--color-amber)]/30 text-[color:var(--color-amber)]/75 hover:border-[color:var(--color-amber)]/65 hover:text-[color:var(--color-amber)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Start the demo"
            >
              {starting ? (
                <PulsingDot variant="active" size={10} />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-0.5 transition-transform group-hover:scale-105"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex flex-col gap-3 min-w-0">
              <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
                Live demo · ~3 min · seven stages
              </p>
              <h2 className="font-[family-name:var(--font-display)] font-light text-[2.5rem] md:text-[3.25rem] leading-[1.02] tracking-[-0.015em] text-balance">
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

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs font-[family-name:var(--font-mono)]">
            <span className="text-[color:var(--color-ink-mute)]">
              Topic:{" "}
              <span className="text-[color:var(--color-ink-dim)]">{DEFAULT_TOPIC}</span>
              {"  ·  "}
              cached replay for guaranteed clean playback
            </span>
            <button
              type="button"
              onClick={() => setMode("advanced")}
              className="text-[color:var(--color-sage)] hover:text-[color:var(--color-amber)] transition-colors uppercase tracking-wider"
            >
              or run a live topic →
            </button>
          </div>

          {error && (
            <div className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-danger)]">
              {error}
            </div>
          )}
        </div>
      ) : (
        // ─── Advanced mode: editorial layout, no card chrome ────────────
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-sage)]">
              Live API · real Gemini calls
            </p>
            <h2 className="font-[family-name:var(--font-display)] font-light text-3xl md:text-[2.5rem] leading-[1.05] tracking-[-0.01em]">
              Run <em className="italic text-[color:var(--color-amber)]">your own</em> topic.
            </h2>
            <p className="text-[color:var(--color-ink-dim)] leading-relaxed max-w-[52ch]">
              Type a topic below, <em className="not-italic text-[color:var(--color-amber)]">or click any of Scout's top-5 candidates on the left</em> to write about it. Hits real Antigravity (Curate ~6s) and Deep Research (~14s), then a plan-approval gate, then cached replay for Write / Voice / Verify. Tokens accrue.
            </p>
          </div>
          <RunControls onRunStarted={onRunStarted} />
          <button
            type="button"
            onClick={() => setMode("watch")}
            className="self-start font-[family-name:var(--font-mono)] text-xs text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-sage)] transition-colors uppercase tracking-wider"
          >
            ← back to the cached demo
          </button>
        </div>
      )}
    </div>
  );
}
