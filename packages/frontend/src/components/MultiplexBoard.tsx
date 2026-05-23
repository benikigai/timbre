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

  // Radio + Veo — real API calls. Controls become interactive once multiplex
  // stage is reached; results stream in when the API returns.
  const [radioLen, setRadioLen] = useState<30 | 60 | 90>(30);
  const [radioStatus, setRadioStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [radioAudio, setRadioAudio] = useState<string | null>(null);
  const [radioScript, setRadioScript] = useState<string | null>(null);
  const [radioError, setRadioError] = useState<string | null>(null);
  const [veoStatus, setVeoStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [veoUrl, setVeoUrl] = useState<string | null>(null);
  const [veoError, setVeoError] = useState<string | null>(null);
  const [veoLen, setVeoLen] = useState<5 | 8 | 15>(5);
  // Avatar: user can attach a photo of themselves; Veo animates it as the
  // visual anchor instead of generating from text alone.
  const [avatarB64, setAvatarB64] = useState<string | null>(null);
  const [avatarMime, setAvatarMime] = useState<string>("image/png");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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

  // Pull the article text to feed Radio + Veo.
  const articleText = state.rewriteMd || state.draftMd || "";

  const handleRadioGenerate = async () => {
    if (radioStatus === "generating") return;
    setRadioStatus("generating");
    setRadioError(null);
    setRadioAudio(null);
    setRadioScript(null);
    try {
      const r = await fetch("/api/talk-radio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: articleText, length_seconds: radioLen }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
      const data = (await r.json()) as { audio_b64: string; mime_type: string; script: string };
      setRadioAudio(`data:${data.mime_type};base64,${data.audio_b64}`);
      setRadioScript(data.script);
      setRadioStatus("done");
    } catch (e) {
      setRadioError((e as Error).message);
      setRadioStatus("error");
    }
  };

  const handleAvatarSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      // result is "data:image/png;base64,…" — strip the prefix.
      const comma = result.indexOf(",");
      if (comma < 0) return;
      setAvatarB64(result.slice(comma + 1));
      setAvatarMime(file.type || "image/png");
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleVeoGenerate = async () => {
    if (veoStatus === "generating") return;
    setVeoStatus("generating");
    setVeoError(null);
    setVeoUrl(null);
    try {
      const firstPara = articleText.split(/\n+/).find((l) => l.trim().length > 40) ?? articleText.slice(0, 200);
      const prompt = avatarB64
        ? `Animate this person talking confidently to camera. Soft natural light, eye-level shot, subtle gestures and lip movement, cinematic warmth. Speaking about: ${firstPara.slice(0, 220)}`
        : `A technical founder talking confidently to camera in a clean, sunlit office. Soft natural light, shallow depth of field, cinematic warmth, eye-level shot. Topic: ${firstPara.slice(0, 220)}`;
      const r = await fetch("/api/veo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          length_seconds: veoLen,
          ...(avatarB64 ? { avatar_image_b64: avatarB64, avatar_mime: avatarMime } : {}),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
      const data = (await r.json()) as { url: string | null };
      if (!data.url) throw new Error("Veo returned no URL");
      setVeoUrl(data.url);
      setVeoStatus("done");
    } catch (e) {
      setVeoError((e as Error).message);
      setVeoStatus("error");
    }
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

          {/* ── AI Talk Radio (LIVE — Flash script + multi-speaker TTS) ── */}
          <GlassPanel active={radioStatus === "generating"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title="AI Talk Radio · Host + Caller"
              primitive="gemini-3.5-flash → gemini-2.5-flash-preview-tts · multi-speaker (Kore + Puck)"
              status={radioStatus}
              tier2={false}
            />
            <InputPreview
              label="What goes into the host script"
              snippet={draftSnippet || "(final draft pending…)"}
            />
            <div className="flex items-center gap-3 flex-wrap">
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
                disabled={radioStatus === "generating" || !articleText}
                className="ml-auto font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[color:var(--color-sage)]/15 border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/25 transition disabled:opacity-50"
              >
                {radioStatus === "generating"
                  ? "generating…"
                  : radioStatus === "done"
                  ? "regenerate"
                  : "generate"}
              </button>
            </div>
            {radioStatus === "done" && radioAudio ? (
              <div className="flex flex-col gap-2">
                <audio controls className="w-full" src={radioAudio}>
                  Your browser does not support audio playback.
                </audio>
                {radioScript && (
                  <details className="rounded border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)]/40">
                    <summary className="cursor-pointer px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-ink-dim)]">
                      ▸ Script (real Flash output)
                    </summary>
                    <pre className="px-2.5 pb-2 text-[11px] text-[color:var(--color-ink-dim)] leading-snug whitespace-pre-wrap font-[family-name:var(--font-sans)]">
                      {radioScript}
                    </pre>
                  </details>
                )}
              </div>
            ) : radioStatus === "generating" ? (
              <p className="text-[11px] font-mono text-[color:var(--color-ink-dim)] italic">
                Step 1: Flash → [Host]/[Caller] script · Step 2: multi-speaker TTS synthesis ({radioLen}s target)…
              </p>
            ) : radioStatus === "error" ? (
              <p className="text-[11px] font-mono text-[color:var(--color-danger)]">{radioError}</p>
            ) : (
              <p className="text-[10px] font-mono text-[color:var(--color-ink-mute)] italic">
                Real Google API · Flash drafts script, multi-speaker TTS synthesizes two voices into one audio file.
              </p>
            )}
          </GlassPanel>

          {/* ── Omni video (Veo — LIVE) ──────────────────────────────── */}
          <GlassPanel active={veoStatus === "generating"} className="p-4 flex flex-col gap-3">
            <CardHeader
              title={`Omni video · ${veoLen}s clip`}
              primitive="veo-2.0-generate-001 · gemini omni"
              status={veoStatus}
              tier2={false}
            />
            <InputPreview
              label="What goes into Veo (text prompt)"
              snippet={draftSnippet ? `Founder-style talking head from: "${draftSnippet}"` : "(final draft pending…)"}
            />
            {/* Avatar photo — Veo animates this as the visual anchor */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)] cursor-pointer px-3 py-1.5 rounded-full border border-[color:var(--color-hairline)] hover:border-[color:var(--color-sage)]/40 hover:text-[color:var(--color-ink)] transition">
                {avatarB64 ? "↻ swap avatar" : "📷 attach avatar photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarSelect(f);
                  }}
                />
              </label>
              {avatarPreview && (
                <div className="flex items-center gap-2">
                  <img
                    src={avatarPreview}
                    alt="avatar preview"
                    className="w-10 h-10 rounded-full object-cover border border-[color:var(--color-sage)]/40"
                  />
                  <span className="font-mono text-[10px] text-[color:var(--color-sage)]">
                    Veo will animate your face
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarB64(null);
                      setAvatarPreview(null);
                    }}
                    className="font-mono text-[10px] text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-danger)]"
                    title="Remove avatar"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
                length
              </label>
              <div className="flex gap-1">
                {[5, 8, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVeoLen(n as 5 | 8 | 15)}
                    disabled={veoStatus === "generating"}
                    className={`font-mono text-[11px] px-2.5 py-1 rounded border transition ${
                      veoLen === n
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
                onClick={handleVeoGenerate}
                disabled={veoStatus === "generating" || !articleText}
                className="ml-auto font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-full bg-[color:var(--color-sage)]/15 border border-[color:var(--color-sage)]/40 text-[color:var(--color-sage)] hover:bg-[color:var(--color-sage)]/25 transition disabled:opacity-50"
              >
                {veoStatus === "generating"
                  ? "generating…"
                  : veoStatus === "done"
                  ? "regenerate"
                  : "generate"}
              </button>
            </div>
            {veoStatus === "done" && veoUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)]">
                <video controls src={veoUrl} className="w-full h-full" />
              </div>
            ) : veoStatus === "generating" ? (
              <div className="aspect-video rounded-lg border border-dashed border-[color:var(--color-amber)]/40 bg-[color:var(--color-amber)]/5 flex items-center justify-center">
                <span className="font-mono text-[11px] text-[color:var(--color-amber)] italic">
                  Veo synthesizing {veoLen}s clip · ~30–90s wall time…
                </span>
              </div>
            ) : veoStatus === "error" ? (
              <div className="aspect-video rounded-lg border border-[color:var(--color-danger)]/40 bg-[color:var(--color-danger)]/5 flex items-center justify-center px-4">
                <span className="font-mono text-[11px] text-[color:var(--color-danger)] text-center">
                  {veoError}
                </span>
              </div>
            ) : (
              <div className="aspect-video rounded-lg border border-dashed border-[color:var(--color-hairline)] bg-[color:var(--color-surface)] flex items-center justify-center">
                <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)] italic">
                  Real Veo API · click generate · video proxied through backend auth
                </span>
              </div>
            )}
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
