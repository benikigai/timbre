// Tier 1 only per spec — TTS + Carousel. Radio + Veo dropped.
import { useState } from "react";
import { GlassPanel } from "../primitives/GlassPanel";
import type { RunState } from "../state/runStateTypes";

interface MultiplexBoardProps {
  state: RunState;
}

export function MultiplexBoard({ state }: MultiplexBoardProps) {
  const tts = state.multiplexJobs.tts;
  const carousel = state.multiplexJobs.carousel;
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const hasAnyJob = !!tts || !!carousel;
  if (!hasAnyJob && state.stages.multiplex.status === "idle") return null;

  // Parse carousel URL list from result_url (the API may pack them; fallback to single URL).
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

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TTS card */}
        <GlassPanel active={tts?.status === "started"} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-[family-name:var(--font-display)] font-medium text-sm text-[color:var(--color-ink)]">
              TTS bulletin
            </h3>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
              {tts?.status ?? "pending"}
            </span>
          </div>
          {tts?.status === "done" && tts.url ? (
            <audio controls src={tts.url} className="w-full">
              Your browser does not support audio playback.
            </audio>
          ) : tts?.status === "failed" ? (
            <p className="text-xs font-[family-name:var(--font-mono)] text-[color:var(--color-danger)]">
              {tts.error ?? "failed"}
            </p>
          ) : (
            <p className="text-xs font-[family-name:var(--font-mono)] text-[color:var(--color-ink-mute)] italic">
              {tts?.status === "started" ? "synthesizing…" : "waiting for multiplex…"}
            </p>
          )}
        </GlassPanel>

        {/* Carousel card */}
        <GlassPanel active={carousel?.status === "started"} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-[family-name:var(--font-display)] font-medium text-sm text-[color:var(--color-ink)]">
              Carousel
            </h3>
            <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
              {carousel?.status ?? "pending"}
            </span>
          </div>
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
            <p className="text-xs font-[family-name:var(--font-mono)] text-[color:var(--color-danger)]">
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
      </div>

      {/* Lightbox-lite (no lib per spec) */}
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
