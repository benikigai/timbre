// Voice-profile gate modal — opens on voice.profile_proposed event.
// User reviews the voice DNA + corpus the agent will draw from, can edit
// tone/jargon/openings inline, and approves. Submission resumes the pipeline.

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RunState } from "../state/runStateTypes";
import type { VoiceProfile } from "@timbre/shared/contracts";

interface VoiceProfileModalProps {
  state: RunState;
  runId: string | null;
}

export function VoiceProfileModal({ state, runId }: VoiceProfileModalProps) {
  const gate = state.voiceGate;
  const open = !!gate && !gate.approved;
  const [editing, setEditing] = useState<VoiceProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset editing buffer when a new gate opens.
  useEffect(() => {
    if (gate && !gate.approved) setEditing({ ...gate.profile });
    if (!gate) setEditing(null);
  }, [gate?.profile, gate?.approved]);

  if (!open || !editing || !gate) return null;

  const handleApprove = async () => {
    if (!runId) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/voice-profile/${encodeURIComponent(runId)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approved_profile: editing }),
        },
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 120)}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = <K extends keyof VoiceProfile>(key: K, value: VoiceProfile[K]) => {
    setEditing((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Dialog.Root open={open} modal>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[color:var(--color-hairline)] bg-[color:var(--color-bg)] shadow-2xl">
          <div className="px-6 py-5 border-b border-[color:var(--color-hairline)] flex items-baseline justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                Voice profile · verify before Write
              </Dialog.Title>
              <Dialog.Description className="font-mono text-[11px] text-[color:var(--color-ink-mute)]">
                This is the voice DNA the Write + Voice stages will use. Edit anything before approving — your changes are bound to this run.
              </Dialog.Description>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[color:var(--color-amber)]/40 text-[color:var(--color-amber)] shrink-0">
              human gate · stage 2 of 2
            </span>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Tone */}
            <Field label="Tone tags" hint="Comma-separated descriptors. Drives sentence cadence and stance.">
              <input
                type="text"
                value={editing.tone.join(", ")}
                onChange={(e) =>
                  setField("tone", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))
                }
                className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sage)]/60"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Sentence length" hint="">
                <select
                  value={editing.sentence_length}
                  onChange={(e) => setField("sentence_length", e.target.value as VoiceProfile["sentence_length"])}
                  className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sage)]/60"
                >
                  <option value="concise">concise</option>
                  <option value="medium">medium</option>
                  <option value="long">long</option>
                </select>
              </Field>
              <Field label="Technical depth" hint="">
                <select
                  value={editing.technical_depth}
                  onChange={(e) => setField("technical_depth", e.target.value as VoiceProfile["technical_depth"])}
                  className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sage)]/60"
                >
                  <option value="layman">layman</option>
                  <option value="engineer">engineer</option>
                  <option value="deep-engineer">deep-engineer</option>
                </select>
              </Field>
            </div>

            <Field label="Forbidden jargon" hint="Voice agent strikes any of these and rewrites.">
              <textarea
                rows={3}
                value={editing.forbidden_jargon.join(", ")}
                onChange={(e) =>
                  setField("forbidden_jargon", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))
                }
                className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sage)]/60 font-[family-name:var(--font-sans)] resize-y"
              />
            </Field>

            <Field label="Preferred opener patterns" hint="Voice agent biases first sentences toward these patterns.">
              <textarea
                rows={3}
                value={editing.preferred_openings.join("\n")}
                onChange={(e) =>
                  setField("preferred_openings", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))
                }
                className="w-full bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none focus:border-[color:var(--color-sage)]/60 font-[family-name:var(--font-mono)] resize-y"
              />
            </Field>

            {/* Corpus surface — read-only, shows what the agent draws from */}
            <div className="rounded-lg border border-[color:var(--color-hairline)] bg-[color:var(--color-surface)]/40 p-3 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
                  voice corpus ({gate.corpusTitles.length} posts)
                </span>
                <a
                  href="https://github.com/benikigai/timbre-scout-config/tree/main/voice_corpus"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-mono text-[color:var(--color-sage)] hover:underline"
                >
                  view on github ↗
                </a>
              </div>
              <ul className="text-[11px] text-[color:var(--color-ink-dim)] leading-relaxed list-disc pl-5">
                {gate.corpusTitles.map((t) => (
                  <li key={t}>{t}</li>
                ))}
                {gate.corpusTitles.length === 0 && (
                  <li className="italic text-[color:var(--color-ink-mute)]">No corpus posts yet — add files to timbre-scout-config/voice_corpus/.</li>
                )}
              </ul>
            </div>

            {error && (
              <p className="font-mono text-[11px] text-[color:var(--color-danger)]">{error}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[color:var(--color-hairline)] flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] text-[color:var(--color-ink-mute)]">
              Approving resumes the pipeline. Edits are scoped to this run only.
            </span>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="font-[family-name:var(--font-display)] font-medium text-sm px-5 py-2 rounded-full bg-[color:var(--color-amber)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-amber-hot)] transition disabled:opacity-50"
            >
              {submitting ? "approving…" : "Approve voice profile →"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-sage)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[10px] text-[color:var(--color-ink-mute)] leading-snug font-mono italic">
          {hint}
        </span>
      )}
    </label>
  );
}
