// Always-visible style profile panel — shows the voice DNA + corpus posts
// currently in play. Fetches /api/voice-profile on mount and refreshes when
// the voice-gate is approved (override may differ from disk).

import { useEffect, useState } from "react";
import type { VoiceProfile } from "@timbre/shared/contracts";

interface VoiceProfilePayload {
  profile: VoiceProfile;
  corpus: Array<{ filename: string; title: string; size_bytes: number; excerpt: string }>;
  sources: { dna_path: string; corpus_dir: string; repo: string };
}

interface StyleProfilePanelProps {
  // Optional: override profile to show (from voice-gate approval) instead of disk.
  overrideProfile?: VoiceProfile | null;
  edited?: boolean;
}

export function StyleProfilePanel({ overrideProfile, edited }: StyleProfilePanelProps) {
  const [data, setData] = useState<VoiceProfilePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/voice-profile")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: VoiceProfilePayload) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="px-4 py-3 text-[10px] font-mono text-[color:var(--color-ink-mute)] italic">
        voice profile unavailable: {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="px-4 py-3 text-[10px] font-mono text-[color:var(--color-ink-mute)] italic">
        loading voice profile…
      </div>
    );
  }

  const profile = overrideProfile ?? data.profile;
  const isOverride = !!overrideProfile && edited;

  return (
    <div className="p-4 flex flex-col gap-3 border-t border-[color:var(--color-hairline)] font-[family-name:var(--font-sans)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
          Voice DNA
        </span>
        {isOverride && (
          <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-[color:var(--color-amber)]/40 text-[color:var(--color-amber)]">
            run override
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {profile.tone.map((t) => (
          <span
            key={t}
            className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[color:var(--color-sage)]/30 text-[color:var(--color-sage)] bg-[color:var(--color-sage)]/5"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
        <div className="text-[color:var(--color-ink-mute)]">sentence</div>
        <div className="text-[color:var(--color-ink-dim)]">{profile.sentence_length}</div>
        <div className="text-[color:var(--color-ink-mute)]">depth</div>
        <div className="text-[color:var(--color-ink-dim)]">{profile.technical_depth}</div>
        {profile.tts_voice && (
          <>
            <div className="text-[color:var(--color-ink-mute)]">tts voice</div>
            <div className="text-[color:var(--color-ink-dim)]">{profile.tts_voice}</div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="self-start font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-sage)] hover:text-[color:var(--color-ink)] transition"
      >
        {expanded ? "▾" : "▸"} {expanded ? "hide" : "show"} jargon, openers, corpus
      </button>

      {expanded && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-1">
              forbidden jargon ({profile.forbidden_jargon.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {profile.forbidden_jargon.slice(0, 16).map((j) => (
                <span
                  key={j}
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[color:var(--color-hairline)] text-[color:var(--color-ink-dim)] line-through decoration-[color:var(--color-danger)]/60"
                >
                  {j}
                </span>
              ))}
            </div>
          </div>

          {profile.preferred_openings.length > 0 && (
            <div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-ink-mute)] mb-1">
                preferred openers
              </div>
              <ul className="text-[10px] font-mono text-[color:var(--color-ink-dim)] leading-snug list-none flex flex-col gap-0.5">
                {profile.preferred_openings.slice(0, 5).map((o) => (
                  <li key={o}>▸ {o}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
                voice corpus ({data.corpus.length} posts)
              </span>
              <a
                href={data.sources.repo}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[9px] text-[color:var(--color-sage)] hover:underline"
              >
                github ↗
              </a>
            </div>
            <ul className="text-[10px] text-[color:var(--color-ink-dim)] leading-snug flex flex-col gap-1">
              {data.corpus.map((c) => (
                <li key={c.filename} className="border-l border-[color:var(--color-hairline)] pl-2">
                  <div className="font-mono">{c.title}</div>
                  <div className="text-[color:var(--color-ink-mute)] line-clamp-2 text-[10px]">{c.excerpt}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
