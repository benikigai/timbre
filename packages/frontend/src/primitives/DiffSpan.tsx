// Renders a single VoiceDiff span inline with hover-revealed reason.
import type { VoiceDiff } from "@timbre/shared/contracts";

interface DiffSpanProps {
  diff: VoiceDiff;
  flagged?: boolean;
  resolved?: boolean;
}

export function DiffSpan({ diff, flagged, resolved }: DiffSpanProps) {
  const baseStyle =
    "relative inline group transition-colors duration-300 " +
    (flagged
      ? "bg-[color:var(--color-danger)]/20 outline outline-1 outline-[color:var(--color-danger)]/40"
      : resolved
      ? "bg-[color:var(--color-sage)]/15 outline outline-1 outline-[color:var(--color-sage)]/30"
      : "");

  if (diff.op === "delete") {
    return (
      <span className={baseStyle}>
        <s className="text-[color:var(--color-danger)] decoration-[color:var(--color-danger)]/60">{diff.original_text}</s>
        <Reason reason={diff.reason} />
      </span>
    );
  }

  if (diff.op === "insert") {
    return (
      <span className={baseStyle}>
        <ins className="bg-[color:var(--color-sage)]/15 text-[color:var(--color-ink)] no-underline">{diff.rewritten_text}</ins>
        <Reason reason={diff.reason} />
      </span>
    );
  }

  // replace
  return (
    <span className={baseStyle}>
      <s className="text-[color:var(--color-danger)]/80 decoration-[color:var(--color-danger)]/40 mr-1">{diff.original_text}</s>
      <ins className="bg-[color:var(--color-sage)]/15 text-[color:var(--color-ink)] no-underline">{diff.rewritten_text}</ins>
      <Reason reason={diff.reason} />
    </span>
  );
}

function Reason({ reason }: { reason: string }) {
  return (
    <span
      className="pointer-events-none absolute left-0 top-full mt-1 z-20 hidden group-hover:block whitespace-normal max-w-xs rounded-md px-2 py-1 text-[10px] font-mono leading-snug bg-[color:var(--color-bg)]/90 border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] shadow-xl"
      role="tooltip"
    >
      {reason}
    </span>
  );
}
