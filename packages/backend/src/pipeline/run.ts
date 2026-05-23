// Run orchestrator: drives Curate → Research-plan → suspend → cache replay.
// Fire-and-forget: returns runId immediately; pipeline runs async on the bus.

import { nanoid } from "nanoid";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { emit } from "../bus/eventLog.js";
import { replay } from "../bus/replay.js";
import { runCurate } from "./stages/curate.js";
import { runResearchPlan } from "./stages/research.js";
import { registerPending } from "./planApproval.js";
import { registerVoicePending } from "./voiceProfileApproval.js";
import { getState as getScoutState } from "./scoutCache.js";
import type {
  Candidate,
  RunRequest,
  ScoutStateResponse,
} from "@timbre/shared";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const SCOUT_FALLBACK = resolve(REPO_ROOT, "data", "cache", "scout-state.json");
const VOICE_DNA_PATH = resolve(REPO_ROOT, "data", "voice", "voice_dna.json");
const VOICE_CORPUS_DIR = resolve(REPO_ROOT, "data", "voice", "voice_corpus");
const DEMO_FIXTURE = "agentic-web-infra";
// Cached fixture is ~104s of t_offset_ms; 2.5x compresses to ~42s of
// replay. Vercel-edge + Tailscale-Funnel SSE adds ~40s of per-event
// latency on prod, so prod wall time lands ~82s (under the 90s target);
// local-only wall time is ~42s. Drop to 1.0 for true real-time replay.
const REPLAY_SPEED = 2.5;

async function loadVoiceProfileFromDisk(): Promise<{
  profile: unknown;
  corpus_titles: string[];
} | null> {
  try {
    const raw = await readFile(VOICE_DNA_PATH, "utf8");
    const profile = JSON.parse(raw);
    const corpus: string[] = [];
    try {
      const files = await readdir(VOICE_CORPUS_DIR);
      for (const f of files) {
        if (f.endsWith(".md") && f !== "README.md") {
          const text = await readFile(resolve(VOICE_CORPUS_DIR, f), "utf8");
          const m = text.match(/^#\s+(.+)$/m);
          corpus.push(m?.[1]?.trim() ?? f.replace(/\.md$/, ""));
        }
      }
    } catch {
      /* corpus optional */
    }
    return { profile, corpus_titles: corpus };
  } catch {
    return null;
  }
}

async function loadCandidates(): Promise<Candidate[]> {
  const live = getScoutState();
  if (live.candidates.length > 0) return live.candidates;
  // Fallback: cached scout-state.json shipped with the repo.
  try {
    const raw = await readFile(SCOUT_FALLBACK, "utf8");
    const parsed = JSON.parse(raw) as ScoutStateResponse;
    return parsed.candidates ?? [];
  } catch (e) {
    console.warn(
      `[run] no live scout state and no fallback (${(e as Error).message})`,
    );
    return [];
  }
}

export interface StartRunResult {
  run_id: string;
}

export async function startRun(req: RunRequest): Promise<StartRunResult> {
  const runId = nanoid(12);
  const mode = req.mode ?? "live";

  // Pick the topic: explicit topic, candidate_id lookup, or default from spec D9.
  let candidates = await loadCandidates();
  let topic =
    req.topic ??
    candidates.find((c) => c.id === req.candidate_id)?.title ??
    candidates[0]?.title ??
    "The Shift to Agentic Web Infrastructure";

  // Fire-and-forget — don't await.
  void (async () => {
    try {
      emit(runId, "run.started", {
        run_id: runId,
        at: new Date().toISOString(),
        topic,
        candidate:
          candidates.find((c) => c.id === req.candidate_id) ??
          candidates[0] ??
          syntheticCandidate(topic),
        mode,
      });

      // Pure cached mode: skip live entirely.
      if (mode === "cached") {
        await replay({
          runId,
          fixture: req.cache_fixture ?? DEMO_FIXTURE,
          speed: REPLAY_SPEED,
        });
        emit(runId, "run.completed", {
          run_id: runId,
          at: new Date().toISOString(),
          duration_ms: 0,
          final_md_url: `/api/cache/${req.cache_fixture ?? DEMO_FIXTURE}/final.md`,
          multiplex: {
            tts: {
              url: `/api/cache/${req.cache_fixture ?? DEMO_FIXTURE}/multiplex/tts.mp3`,
              duration_ms: 0,
              voice: "cached",
            },
            carousel: {
              urls: [1, 2, 3].map(
                (i) =>
                  `/api/cache/${req.cache_fixture ?? DEMO_FIXTURE}/multiplex/carousel/${i}.png`,
              ),
            },
            errors: [],
          },
        });
        return;
      }

      // Live path: Curate → Research-plan → suspend → cache replay rest.
      if (candidates.length === 0) {
        // No candidates — synthesize one so Curate has something to look at.
        candidates = [syntheticCandidate(topic)];
      }
      const top3 = await runCurate(runId, candidates);
      const chosen = top3[0] ?? candidates[0]!;
      topic = chosen.title;

      const plan = await runResearchPlan(runId, topic);

      // Suspend until plan-approval POST arrives.
      const { modifications } = await registerPending(
        runId,
        plan.plan_interaction_id,
      );
      console.log(
        `[run ${runId}] plan approved${modifications ? ` with mods: ${modifications.slice(0, 80)}…` : ""}; opening voice-profile gate`,
      );

      // ── Voice-profile gate (between plan-approval and Write/replay) ──
      // Surface the current voice DNA + corpus titles so the user can
      // verify/edit before Voice runs. Suspends until POST /api/voice-
      // profile/:runId/approve fires.
      const voiceBundle = await loadVoiceProfileFromDisk();
      if (voiceBundle) {
        emit(runId, "voice.profile_proposed", {
          run_id: runId,
          at: new Date().toISOString(),
          profile: voiceBundle.profile,
          corpus_titles: voiceBundle.corpus_titles,
        });
        try {
          const { approved_profile } = await registerVoicePending(runId);
          emit(runId, "voice.profile_approved", {
            run_id: runId,
            at: new Date().toISOString(),
            approved_profile,
            edited: JSON.stringify(approved_profile) !== JSON.stringify(voiceBundle.profile),
          });
          console.log(`[run ${runId}] voice profile approved`);
        } catch (e) {
          console.warn(`[run ${runId}] voice-profile gate rejected: ${(e as Error).message}`);
        }
      } else {
        console.warn(`[run ${runId}] no voice profile on disk; skipping gate`);
      }

      // Hand off to cache replay (per MINIMUM-VIABLE: don't actually run DR
      // execution — would take 2-20 min).
      await replay({ runId, fixture: DEMO_FIXTURE, speed: REPLAY_SPEED });

      emit(runId, "run.completed", {
        run_id: runId,
        at: new Date().toISOString(),
        duration_ms: 0,
        final_md_url: `/api/cache/${DEMO_FIXTURE}/final.md`,
        multiplex: {
          tts: {
            url: `/api/cache/${DEMO_FIXTURE}/multiplex/tts.mp3`,
            duration_ms: 0,
            voice: "cached",
          },
          carousel: {
            urls: [1, 2, 3].map(
              (i) =>
                `/api/cache/${DEMO_FIXTURE}/multiplex/carousel/${i}.png`,
            ),
          },
          errors: [],
        },
      });
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      console.error(`[run ${runId}] error:`, message);
      emit(runId, "run.error", {
        run_id: runId,
        at: new Date().toISOString(),
        stage: "research",
        error: message,
        recoverable: false,
      });
    }
  })();

  return { run_id: runId };
}

function syntheticCandidate(title: string): Candidate {
  return {
    id: "synthetic_" + nanoid(8),
    url: "https://usetimbre.ai/synthetic",
    title,
    source: "synthetic",
    published_at: new Date().toISOString(),
    novelty_score: 0.9,
    voice_fit_score: 0.9,
    combined_score: 0.9,
    summary: "Synthesized candidate for demo run (no Scout state available).",
  };
}
