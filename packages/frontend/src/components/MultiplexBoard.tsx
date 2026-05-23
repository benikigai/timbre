// 4-card multiplex board: TTS bulletin, Carousel (Nano Banana), AI Talk Radio,
// Omni video (Veo). TTS + Carousel ride the real pipeline; Radio + Veo are
// stage-2 mocks with controls + input-preview to make the I/O primitive visible.
//
// Each card surfaces the Google I/O primitive it would be powered by, plus the
// input it would receive (snippet of final draft), so judges see the toolchain.

import { useMemo, useState } from "react";
import { GlassPanel } from "../primitives/GlassPanel";
import type { RunState } from "../state/runStateTypes";

interface MultiplexBoardProps {
  state: RunState;
}

export function MultiplexBoard({ state }: MultiplexBoardProps) {
  const tts = state.multiplexJobs.tts;
  const carousel = state.multiplexJobs.carousel;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Radio + Veo mock state. Cards are visible whenever the run has reached
  // multiplex; controls become interactive once it's done.
  const [radioLen, setRadioLen] = useState<30 | 60 | 90>(60);
  const [radioStatus, setRadioStatus] = useState<"idle" | "generating" | "done">("idle");
  const [veoStatus, setVeoStatus] = useState<"idle" | "generating" | "done">("idle");
  const multiplexActive = state.stages.multiplex.status === "active" || state.stages.multiplex.status === "done";

  if (!multiplexActive) return null;

  // Pull a snippet of the final draft for the input-preview blocks.
  const draftSnippet = useMemo(() => {
    const text = state.rewriteMd || state.draftMd || "";
    return text.split(/\n+/).filter(Boolean).slice(0, 2).join(" ").slice(0, 220);
  }, [state.rewriteMd, state.draftMd]);

  // Parse carousel URL list (may be packed JSON, comma-separated, or single URL).
  const carouselUrls: string[] = (() => {
    if (!carousel?.url) return [];
    try {
      const parsed = JSON.parse(carousel.url);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through */
    }
    return carousel.url.split(",").map((s) => s.trim());
  })();

  const handleRadioGenerate = () => {
    if (radioStatus === "generating") return;
    setRadioStatus("generating");
    setTimeout(() => setRadioStatus("done"), 2400);
  };
  const handleVeoGenerate = () => {
    if (veoStatus === "generating") return;
    setVeoStatus("generating");
    setTimeout(() => setVeoStatus("done"), 3000);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            Multiplex
          </h3>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
            4 outputs · powered by 4 google i/o primitives
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── TTS bulletin ─────────────────────────────────────────── */}
          <GlassPanel active={tts?.status === "started"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title="TTS bulletin"
              primitive="gemini-2.5-flash-preview-tts"
              status={tts?.status ?? "pending"}
            />
            {tts?.status === "done" && tts.url ? (
              <audio controls src={tts.url} className="w-full">
                Your browser does not support audio playback.
              </audio>
            ) : tts?.status === "failed" ? (
              <p className="text-xs font-mono text-[color:var(--color-danger)]">
                {tts.error ?? "failed"}
              </p>
            ) : (
              <p className="text-xs font-mono text-[color:var(--color-ink-mute)] italic">
                {tts?.status === "started" ? "synthesizing…" : "waiting…"}
              </p>
            )}
          </GlassPanel>

          {/* ── Carousel (Nano Banana) ───────────────────────────────── */}
          <GlassPanel active={carousel?.status === "started"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title="Carousel · 3 slides"
              primitive="gemini-3-pro-image-preview · nano banana"
              status={carousel?.status ?? "pending"}
            />
            {carousel?.status === "done" && carouselUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {carouselUrls.slice(0, 3).map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOpenIdx(i)}
                    className="aspect-[4/5] rounded-lg overflow-hidden border border-[color:var(--color-hairline)] hover:border-[color:var(--color-amber)]/40 transition"
                  >
                    <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            ) : carousel?.status === "failed" ? (
              <p className="text-xs font-mono text-[color:var(--color-danger)]">
                {carousel.error ?? "failed"}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="aspect-[4/5] rounded-lg border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]"
                  />
                ))}
              </div>
            )}
          </GlassPanel>

          {/* ── AI Talk Radio (Tier 2 mock) ──────────────────────────── */}
          <GlassPanel active={radioStatus === "generating"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title="AI Talk Radio"
              primitive="ai-studio · talk-radio agent"
              status={radioStatus === "idle" ? "ready" : radioStatus}
              tier2={true}
            />
            <InputPreview
              label="What goes into the host script"
              snippet={draftSnippet || "(final draft pending…)"}
            />
            <div className="flex items-center gap-3">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
                length
              </label>
              <div className="flex gap-1">
                {[30, 60, 90].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRadioLen(n as 30 | 60 | 90)}
                    disabled={radioStatus === "generating"}
                    className={`font-mono text-[11px] px-2.5 py-1 rounded border transition ${
                      radioLen === n
                        ? "border-[color:var(--color-amber)]/50 text-[color:var(--color-amber)] bg-[color:var(--color-amber)]/10"
                        : "border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)]"
                    }`}
                  >
                    {n}s
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleRadioGenerate}
                disabled={radioStatus === "generating"}
                className="ml-auto font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[color:var(--color-sage)]/15 border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/25 transition disabled:opacity-50"
              >
                {radioStatus === "generating"
                  ? "generating…"
                  : radioStatus === "done"
                  ? "regenerate"
                  : "generate"}
              </button>
            </div>
            {radioStatus === "done" ? (
              <div className="flex flex-col gap-2">
                <audio controls className="w-full" src="">
                  Your browser does not support audio playback.
                </audio>
                <p className="text-[10px] font-mono text-[color:var(--color-ink-mute)] italic">
                  [Host] / [Caller] · ~{radioLen}s · would synthesize via AI Studio Talk Radio
                </p>
              </div>
            ) : (
              <p className="text-[10px] font-mono text-[color:var(--color-ink-mute)] italic">
                {radioStatus === "generating"
                  ? `Adapting draft → host/caller script · synthesizing ${radioLen}s segment…`
                  : "Tier 2 · mocked for demo. Real integration: ai-studio agent w/ duration param."}
              </p>
            )}
          </GlassPanel>

          {/* ── Omni video (Veo) ─────────────────────────────────────── */}
          <GlassPanel active={veoStatus === "generating"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title="Omni video · 15s clip"
              primitive="veo · gemini omni"
              status={veoStatus === "idle" ? "ready" : veoStatus}
              tier2={true}
            />
            <InputPreview
              label="What goes into Veo"
              snippet={draftSnippet ? `Hero clip from: "${draftSnippet}"` : "(final draft pending…)"}
            />
            {veoStatus === "done" ? (
              <div className="aspect-video rounded-lg overflow-hidden border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)] flex items-center justify-center">
                <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)]">
                  [veo placeholder — 15s clip from final draft]
                </span>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] flex items-center justify-center">
                <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)] italic">
                  {veoStatus === "generating"
                    ? "Veo generating 15s clip… (~30s synthesis on real API)"
                    : "Tier 2 · click generate to mock"}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleVeoGenerate}
              disabled={veoStatus === "generating"}
              className="self-start font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[color:var(--color-sage)]/15 border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/25 transition disabled:opacity-50"
            >
              {veoStatus === "generating"
                ? "generating…"
                : veoStatus === "done"
                ? "regenerate"
                : "generate"}
            </button>
          </GlassPanel>
        </div>
      </div>

      {/* Lightbox-lite for carousel */}
      {openIdx !== null && carouselUrls[openIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpenIdx(null)}
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-8 cursor-zoom-out"
        >
          <img
            src={carouselUrls[openIdx]}
            alt={`Slide ${openIdx + 1}`}
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}

function CardHeader({
  title,
  primitive,
  status,
  tier2,
}: {
  title: string;
  primitive: string;
  status: string;
  tier2?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h4 className="font-[family-name:var(--font-display)] font-medium text-sm text-[color:var(--color-ink)] truncate">
          {title}
        </h4>
        <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-sage)] truncate" title={primitive}>
          {primitive}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {tier2 && (
          <span className="font-mono text-[8px] uppercase tracking-wider px-1 py-0.5 rounded border border-[color:var(--color-amber)]/30 text-[color:var(--color-amber)]">
            tier 2
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
          {status}
        </span>
      </div>
    </div>
  );
}

function InputPreview({ label, snippet }: { label: string; snippet: string }) {
  return (
    <details className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)]/40">
      <summary className="cursor-pointer px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-ink-dim)]">
        ▸ {label}
      </summary>
      <p className="px-2.5 pb-2 text-[11px] text-[color:var(--color-ink-dim)] leading-snug font-[family-name:var(--font-sans)]">
        {snippet}
      </p>
    </details>
  );
}
