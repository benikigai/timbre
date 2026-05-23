import { GlassPanel } from "../primitives/GlassPanel";

const PROOF_URL = import.meta.env.VITE_PROOF_URL as string | undefined;

export function ProofBeat() {
  if (!PROOF_URL) return null;
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[family-name:var(--font-display)] font-medium text-sm text-[color:var(--color-ink)]">
          The proof
        </h3>
        <a
          href={PROOF_URL}
          target="_blank"
          rel="noopener"
          className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-sage)] hover:text-[color:var(--color-ink)]"
        >
          open ↗
        </a>
      </div>
      <p className="text-sm text-[color:var(--color-ink-dim)] font-[family-name:var(--font-display)] italic mb-3">
        This system has been writing real content this week. Today's the day we show it.
      </p>
      <iframe
        src={PROOF_URL}
        title="Published Timbre post"
        className="w-full h-[24rem] rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]"
      />
    </GlassPanel>
  );
}
