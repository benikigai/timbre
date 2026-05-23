import { useState } from "react";
import { startRun } from "../api/runs";
import { PulsingDot } from "../primitives/PulsingDot";

interface RunControlsProps {
  onRunStarted: (runId: string) => void;
  runId?: string | null;
}

const DEFAULT_TOPIC = "The Shift to Agentic Web Infrastructure";

export function RunControls({ onRunStarted, runId }: RunControlsProps) {
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [mode, setMode] = useState<"live" | "cached">("live");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await startRun({
        topic: topic.trim(),
        mode,
        ...(mode === "cached" ? { cache_fixture: "agentic-web-infra" } : {}),
      });
      onRunStarted(resp.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleStart}
      className="flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] backdrop-blur-md"
    >
      <label className="flex-1 flex items-center gap-3 min-w-0">
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] shrink-0">
          topic
        </span>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What should Timbre write about?"
          className="flex-1 bg-transparent border-0 outline-none text-[color:var(--color-ink)] font-[family-name:var(--font-sans)] text-sm placeholder:text-[color:var(--color-ink-mute)] focus:ring-0 min-w-0"
          disabled={submitting || !!runId}
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "live" ? "cached" : "live")}
          disabled={submitting || !!runId}
          className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:border-[color:var(--color-sage)]/40 hover:text-[color:var(--color-ink)] transition disabled:opacity-50"
          title="Toggle live / cached mode"
        >
          {mode}
        </button>

        <button
          type="submit"
          disabled={submitting || !!runId || !topic.trim()}
          className="font-[family-name:var(--font-display)] font-medium text-sm px-4 py-1.5 rounded-md bg-[color:var(--color-amber)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-amber-hot)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {submitting ? (
            <>
              <PulsingDot variant="active" size={6} />
              <span>starting…</span>
            </>
          ) : runId ? (
            <span>running</span>
          ) : (
            <span>Start</span>
          )}
        </button>
      </div>

      {error && (
        <div className="font-[family-name:var(--font-mono)] text-[11px] text-[color:var(--color-danger)] md:absolute md:bottom-[-1.5rem]">
          {error}
        </div>
      )}
    </form>
  );
}
