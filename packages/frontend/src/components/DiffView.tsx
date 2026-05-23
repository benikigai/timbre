// CENTERPIECE — split-screen Writer/Voice with inline VoiceDiff highlights.
// Verify discrepancies flash red on the affected span, then fade green after resolution.
import { useEffect, useRef, useState } from "react";
import { GlassPanel } from "../primitives/GlassPanel";
import { DiffSpan } from "../primitives/DiffSpan";
import type { RunState } from "../state/runStateTypes";

interface DiffViewProps {
  state: RunState;
}

export function DiffView({ state }: DiffViewProps) {
  const leftActive = state.stages.write.status === "active";
  const rightActive = state.stages.voice.status === "active";
  const verifyActive = state.stages.verify.status === "active";

  // Track which diff ids have an active discrepancy on them.
  const flaggedDiffIds = new Set(state.discrepancies.map((d) => d.id));
  const [recentlyResolved, setRecentlyResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When a discrepancy resolves (auto-corrected), pulse green for 1.2s.
    const resolvedIds = state.discrepancies
      .filter((d) => d.resolution === "auto-corrected")
      .map((d) => d.id);
    if (resolvedIds.length === 0) return;
    setRecentlyResolved(new Set(resolvedIds));
    const t = setTimeout(() => setRecentlyResolved(new Set()), 1200);
    return () => clearTimeout(t);
  }, [state.discrepancies.length, state.discrepancies]);

  // Auto-scroll the streaming text panes.
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (leftRef.current && leftActive) {
      leftRef.current.scrollTop = leftRef.current.scrollHeight;
    }
  }, [state.draftMd, leftActive]);
  useEffect(() => {
    if (rightRef.current && rightActive) {
      rightRef.current.scrollTop = rightRef.current.scrollHeight;
    }
  }, [state.rewriteMd, rightActive, state.diffs.length]);

  if (!state.runId) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GlassPanel active={leftActive} className="flex flex-col h-[28rem]">
        <PaneHeader title="Writer" stage="write" status={state.stages.write.status} />
        <div ref={leftRef} className="flex-1 overflow-y-auto p-4 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[color:var(--color-ink-dim)] whitespace-pre-wrap">
          {state.draftMd || (
            <span className="text-[color:var(--color-ink-mute)] italic font-[family-name:var(--font-mono)] text-xs">
              waiting for draft…
            </span>
          )}
          {leftActive && state.draftMd && <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-[color:var(--color-amber)] animate-pulse" aria-hidden="true" />}
        </div>
      </GlassPanel>

      <GlassPanel active={rightActive || verifyActive} className="flex flex-col h-[28rem]">
        <PaneHeader title="Voice + Verify" stage="voice" status={state.stages.voice.status} />
        <div ref={rightRef} className="flex-1 overflow-y-auto p-4 font-[family-name:var(--font-sans)] text-sm leading-relaxed text-[color:var(--color-ink-dim)] whitespace-pre-wrap">
          {state.diffs.length === 0 && !state.rewriteMd ? (
            <span className="text-[color:var(--color-ink-mute)] italic font-[family-name:var(--font-mono)] text-xs">
              waiting for voice rewrite…
            </span>
          ) : (
            <>
              {/* Render diffs inline as a chain of spans for visual richness */}
              {state.diffs.map((d) => (
                <DiffSpan
                  key={d.id}
                  diff={d}
                  flagged={flaggedDiffIds.has(d.id) && !recentlyResolved.has(d.id)}
                  resolved={recentlyResolved.has(d.id)}
                />
              ))}
              {state.diffs.length === 0 && state.rewriteMd && <span>{state.rewriteMd}</span>}
              {rightActive && <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-[color:var(--color-amber)] animate-pulse" aria-hidden="true" />}
            </>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

interface PaneHeaderProps {
  title: string;
  stage: string;
  status: string;
}

function PaneHeader({ title, status }: PaneHeaderProps) {
  return (
    <div className="px-4 py-2.5 border-b border-[color:var(--color-hairline)] flex items-center justify-between">
      <h3 className="font-[family-name:var(--font-display)] font-medium text-sm text-[color:var(--color-ink)]">{title}</h3>
      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
        {status}
      </span>
    </div>
  );
}
