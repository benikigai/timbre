// Human-in-loop final-edit surface. Appears after run.completed.
// Fetches final.md from /api/cache/<fixture>/final.md, renders as editable
// textarea, "Copy" + "Publish" actions.

import { useEffect, useState } from "react";
import type { RunState } from "../state/runStateTypes";

interface EditableDraftProps {
  state: RunState;
}

export function EditableDraft({ state }: EditableDraftProps) {
  const [original, setOriginal] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!state.finalMdUrl) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch(state.finalMdUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        setOriginal(text);
        setDraft(text);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.finalMdUrl]);

  const wordCount = draft.trim().split(/\s+/).filter(Boolean).length;
  const edited = draft !== original;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; no-op */
    }
  };

  const handlePublish = () => {
    // Mock publish — opens a clean preview in a new tab.
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${
      state.topic || "Timbre draft"
    }</title><style>body{max-width:680px;margin:4rem auto;padding:0 1.5rem;font:16px/1.6 ui-serif,Georgia,serif;color:#1a1a1a;white-space:pre-wrap}</style></head><body>${draft.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c)}</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setPublished(true);
    setTimeout(() => setPublished(false), 2400);
  };

  return (
    <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] backdrop-blur-md flex flex-col">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-[color:var(--color-hairline)]">
        <div className="flex items-baseline gap-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            Final draft
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-sage)]">
            human in the loop · edit before publish
          </span>
        </div>
        <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)]">
          {wordCount.toLocaleString()} words {edited && "· edited"}
        </span>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {loading && (
          <div className="text-[color:var(--color-ink-mute)] text-sm italic">
            Loading final draft…
          </div>
        )}
        {error && (
          <div className="text-[color:var(--color-danger)] text-sm font-mono">
            Failed to load: {error}
          </div>
        )}
        {!loading && !error && (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[24rem] max-h-[60vh] resize-y bg-[color:var(--color-bg)] border border-[color:var(--color-hairline)] rounded-xl p-4 text-[color:var(--color-ink)] text-sm leading-relaxed font-[family-name:var(--font-sans)] outline-none focus:border-[color:var(--color-sage)]/50"
              spellCheck={true}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-[color:var(--color-ink-mute)] font-mono">
                You own the last word. Edit anywhere — the model proposes, you ship.
              </p>
              <div className="flex items-center gap-2">
                {edited && (
                  <button
                    type="button"
                    onClick={() => setDraft(original)}
                    className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)] transition"
                  >
                    Revert
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/10 transition"
                >
                  {copied ? "copied ✓" : "copy markdown"}
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  className="font-[family-name:var(--font-display)] font-medium text-sm px-5 py-1.5 rounded-full bg-[color:var(--color-amber)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-amber-hot)] transition"
                >
                  {published ? "opened ↗" : "Publish →"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
