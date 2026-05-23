import { useEffect, useState } from "react";
import type { RunState } from "../state/runStateTypes";

interface VerifyOverlayProps {
  state: RunState;
}

const COLLAPSE_AFTER_MS = 4000;

export function VerifyOverlay({ state }: VerifyOverlayProps) {
  const latest = state.discrepancies[state.discrepancies.length - 1];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!latest) return;
    if (latest.id === activeId) return;
    setActiveId(latest.id);
    setCollapsed(false);
    const t = setTimeout(() => setCollapsed(true), COLLAPSE_AFTER_MS);
    return () => clearTimeout(t);
  }, [latest, activeId]);

  if (!latest || !activeId) return null;
  if (collapsed) return null;

  const sourceUrl = latest.sources[0]?.url;
  const resolution = latest.resolution;

  return (
    <div
      role="alert"
      className="fixed right-6 top-20 z-30 w-[min(24rem,calc(100vw-3rem))] rounded-2xl border bg-[color:var(--color-bg)]/95 backdrop-blur-md shadow-2xl animate-[slide-in_320ms_ease-out]"
      style={{
        borderColor: resolution === "auto-corrected" ? "rgba(127,169,139,0.4)" : "rgba(232,165,116,0.45)",
        animation: "slide-in 320ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div className="px-4 pt-3 pb-2 border-b border-[color:var(--color-hairline)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider"
            style={{ color: resolution === "auto-corrected" ? "var(--color-sage)" : "var(--color-amber)" }}
          >
            {resolution === "auto-corrected" ? "drift corrected" : "drift detected"}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <div>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-1">
            Original
          </div>
          <div className="text-xs text-[color:var(--color-ink-dim)] font-[family-name:var(--font-sans)] leading-snug">
            {latest.original_claim}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[color:var(--color-amber)] mb-1">
            Voice drift
          </div>
          <div className="text-xs text-[color:var(--color-ink)] font-[family-name:var(--font-sans)] leading-snug">
            <s className="text-[color:var(--color-danger)]/80 decoration-[color:var(--color-danger)]/40">{latest.drift_text}</s>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[color:var(--color-sage)] mb-1">
            Resolution
          </div>
          <div className="text-xs text-[color:var(--color-ink)] font-[family-name:var(--font-sans)] leading-snug">
            {latest.final_text}
          </div>
        </div>
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener"
            className="block mt-2 pt-2 border-t border-[color:var(--color-hairline)] text-[10px] font-[family-name:var(--font-mono)] text-[color:var(--color-sage)] hover:text-[color:var(--color-ink)] truncate"
          >
            source: {sourceUrl}
          </a>
        )}
      </div>
    </div>
  );
}
