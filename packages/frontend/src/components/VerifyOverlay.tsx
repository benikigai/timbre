import { useEffect, useState } from "react";
import type { RunState } from "../state/runStateTypes";

interface VerifyOverlayProps {
  state: RunState;
}

const COLLAPSE_AFTER_MS = 6000; // Keep open slightly longer to allow reading the visual pipeline

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


  return (
    <div
      role="alert"
      className="fixed right-6 top-24 z-50 w-[min(26rem,calc(100vw-3rem))] rounded-2xl border bg-[color:var(--color-bg)]/95 backdrop-blur-md shadow-2xl overflow-hidden"
      style={{
        borderColor: "rgba(244, 216, 160, 0.45)", // amber/gold border
        boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 15px -3px rgba(244, 216, 160, 0.15)",
        animation: "slide-in 380ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>{`
        @keyframes slide-in {
          from { transform: translateY(-10px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes pulse-flow {
          0% { left: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .flow-line {
          position: relative;
          height: 2px;
          background: rgba(255, 255, 255, 0.08);
          flex-1;
          margin: 0 8px;
          min-width: 24px;
        }
        .flow-dot {
          position: absolute;
          top: -2px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-amber);
          box-shadow: 0 0 8px var(--color-amber);
          animation: pulse-flow 2s infinite linear;
        }
      `}</style>

      {/* Top Banner indicating Antigravity SDK Hook Filter */}
      <div className="px-4 py-3 bg-gradient-to-r from-[color:var(--color-bg)] to-amber-950/10 border-b border-[color:var(--color-hairline)] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider text-[color:var(--color-gold)]">
            Antigravity SDK 2.0
          </span>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-[family-name:var(--font-mono)]">
            HOOK ACTIVE
          </span>
        </div>
        <div className="text-[9px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] uppercase tracking-wider">
          hook_policy: ENFORCE_FIDELITY
        </div>
      </div>

      {/* Visual Interceptor Pipeline Graph */}
      <div className="px-4 py-3.5 bg-zinc-950/20 border-b border-[color:var(--color-hairline)] flex items-center justify-between text-[10px] font-[family-name:var(--font-mono)]">
        <div className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[color:var(--color-ink-dim)]">
          Search Tool
        </div>
        <div className="flow-line flex-1">
          <div className="flow-dot" />
        </div>
        <div className="px-2.5 py-1 rounded bg-amber-500/10 text-[color:var(--color-amber)] border border-amber-500/20 font-semibold animate-pulse">
          Post-Tool Filter
        </div>
        <div className="flow-line flex-1">
          <div className="flow-dot" style={{ animationDelay: "1s" }} />
        </div>
        <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Audited Input
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-1">
            Verified Claim
          </div>
          <div className="text-xs text-[color:var(--color-ink-dim)] font-[family-name:var(--font-sans)] leading-relaxed">
            {latest.original_claim}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[color:var(--color-hairline)]">
          <div>
            <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-[color:var(--color-amber)] mb-1">
              Factual Drift (Intercepted)
            </div>
            <div className="text-xs text-[color:var(--color-ink-dim)] font-[family-name:var(--font-sans)] leading-snug">
              <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-[color:var(--color-danger)] border border-red-500/20 line-through decoration-[color:var(--color-danger)]/50">
                {latest.drift_text}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-[family-name:var(--font-mono)] uppercase tracking-wider text-emerald-400 mb-1">
              Corrected Output
            </div>
            <div className="text-xs text-[color:var(--color-ink)] font-[family-name:var(--font-sans)] leading-snug">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {latest.final_text}
              </span>
            </div>
          </div>
        </div>

        {sourceUrl && (
          <div className="pt-2.5 border-t border-[color:var(--color-hairline)] flex items-center justify-between">
            <span className="text-[9px] font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)]">
              Verification Source:
            </span>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] font-[family-name:var(--font-mono)] text-[color:var(--color-gold)] hover:underline truncate max-w-[200px]"
            >
              {new URL(sourceUrl).hostname}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
