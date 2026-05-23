// Pure reducer that folds SSE events into RunState.
// Per specs/02-front.md §4 — the entire UI derives from event-log replay.
// Re-deriving from a replayed log on reconnect gives correct rehydration for free.

import type { AnyEvent, Candidate, StageId } from "@timbre/shared/contracts";
import type { RunState, StageState } from "./runStateTypes.js";
import { initialRunState } from "./runStateTypes.js";

type AnyStageEvent =
  | { type: "stage.started"; data: { stage: StageId; agent: string; at: string } }
  | { type: "stage.completed"; data: { stage: StageId; duration_ms: number; at: string } }
  | { type: "stage.error"; data: { stage: StageId; error: string; recovered: boolean; at: string } };

function isRunStage(stage: StageId): stage is Exclude<StageId, "scout"> {
  return stage !== "scout";
}

function setStage(stages: RunState["stages"], stage: StageId, patch: Partial<StageState>): RunState["stages"] {
  if (!isRunStage(stage)) return stages;
  return { ...stages, [stage]: { ...stages[stage], ...patch } };
}

function pushThought(thoughts: RunState["thoughts"], stage: StageId, text: string): RunState["thoughts"] {
  if (!isRunStage(stage)) return thoughts;
  return { ...thoughts, [stage]: [...thoughts[stage], text] };
}

export function runReducer(s: RunState, e: AnyEvent | { type: "__reset__" }): RunState {
  switch (e.type) {
    case "__reset__":
      return initialRunState;

    case "run.started":
      return {
        ...s,
        runId: (e.data as { run_id?: string }).run_id ?? s.runId,
        mode: e.data.mode,
        topic: e.data.topic,
        candidate: e.data.candidate,
        completed: false,
        error: null,
      };

    case "run.completed":
      return {
        ...s,
        completed: true,
        finalMdUrl: e.data.final_md_url,
      };

    case "run.error":
      return {
        ...s,
        error: { stage: e.data.stage, message: e.data.error },
      };

    case "run.fallback_engaged":
      // Soft event — we just record the mode flip; let UI optionally surface a toast.
      return { ...s, mode: "cached" };

    case "stage.started": {
      const ev = e as AnyStageEvent & { type: "stage.started" };
      return {
        ...s,
        stages: setStage(s.stages, ev.data.stage, {
          status: "active",
          startedAt: ev.data.at,
        }),
      };
    }

    case "stage.completed": {
      const ev = e as AnyStageEvent & { type: "stage.completed" };
      return {
        ...s,
        stages: setStage(s.stages, ev.data.stage, {
          status: "done",
          completedAt: ev.data.at,
        }),
      };
    }

    case "stage.error": {
      const ev = e as AnyStageEvent & { type: "stage.error" };
      return {
        ...s,
        stages: setStage(s.stages, ev.data.stage, {
          status: ev.data.recovered ? "done" : "error",
        }),
      };
    }

    case "agent.thought":
      return { ...s, thoughts: pushThought(s.thoughts, e.data.stage, e.data.text) };

    case "agent.token": {
      const stage = e.data.stage;
      if (stage === "write") return { ...s, draftMd: s.draftMd + e.data.text };
      if (stage === "voice") return { ...s, rewriteMd: s.rewriteMd + e.data.text };
      // Other stages stream tokens via thoughts; treat as thought append for simplicity.
      return { ...s, thoughts: pushThought(s.thoughts, stage, e.data.text) };
    }

    case "agent.tool_call":
      // Surfaced via thoughts as a system line so council view picks it up.
      return {
        ...s,
        thoughts: pushThought(
          s.thoughts,
          e.data.stage,
          `↳ tool: ${e.data.tool}(${JSON.stringify(e.data.args)})`,
        ),
      };

    case "agent.citation":
      return {
        ...s,
        citations: [
          ...s.citations,
          { stage: e.data.stage, url: e.data.url, title: e.data.title, snippet: e.data.snippet },
        ],
      };

    case "agent.image":
      return {
        ...s,
        charts: [
          ...s.charts,
          { caption: e.data.caption ?? "", data_b64: e.data.data_b64, mime_type: e.data.mime_type },
        ],
      };

    case "curate.selected":
      // We don't replace candidate (run.started already set it); just stash thought for the panel.
      return {
        ...s,
        thoughts: pushThought(
          s.thoughts,
          "curate",
          `Selected top 3: ${e.data.top.map((c: Candidate) => c.title).join(" · ")}`,
        ),
      };

    case "research.plan_proposed":
      return {
        ...s,
        plan: {
          md: e.data.plan_md,
          planInteractionId: e.data.plan_interaction_id,
          approved: false,
        },
      };

    case "research.plan_approved":
      return {
        ...s,
        plan: s.plan ? { ...s.plan, approved: true } : s.plan,
      };

    case "voice.profile_proposed":
      return {
        ...s,
        voiceGate: {
          profile: e.data.profile,
          corpusTitles: e.data.corpus_titles,
          approved: false,
          edited: false,
        },
      };

    case "voice.profile_approved":
      return {
        ...s,
        voiceGate: s.voiceGate
          ? { ...s.voiceGate, profile: e.data.approved_profile, approved: true, edited: e.data.edited }
          : null,
      };

    case "voice.diff":
      // VoiceDiff payload merged with envelope; extract the diff fields.
      return {
        ...s,
        diffs: [
          ...s.diffs,
          {
            id: e.data.id,
            op: e.data.op,
            original_text: e.data.original_text,
            rewritten_text: e.data.rewritten_text,
            span: e.data.span,
            reason: e.data.reason,
          },
        ],
      };

    case "verify.checking_claim":
      return {
        ...s,
        thoughts: pushThought(s.thoughts, "verify", `Checking: "${e.data.claim}"`),
      };

    case "verify.discrepancy":
      return {
        ...s,
        discrepancies: [
          ...s.discrepancies,
          {
            id: e.data.id,
            original_claim: e.data.original_claim,
            drift_text: e.data.drift_text,
            diff_span: e.data.diff_span,
            sources: e.data.sources,
            resolution: e.data.resolution,
            final_text: e.data.final_text,
          },
        ],
      };

    case "multiplex.job_started":
      return {
        ...s,
        multiplexJobs: { ...s.multiplexJobs, [e.data.job]: { status: "started" } },
      };

    case "multiplex.job_completed":
      return {
        ...s,
        multiplexJobs: {
          ...s.multiplexJobs,
          [e.data.job]: {
            status: "done",
            url: e.data.result_url,
            durationMs: e.data.duration_ms,
          },
        },
      };

    case "multiplex.job_failed":
      return {
        ...s,
        multiplexJobs: {
          ...s.multiplexJobs,
          [e.data.job]: { status: "failed", error: e.data.error },
        },
      };

    // Scout events arrive on a separate channel — useScoutEvents owns those.
    case "scout.tick_started":
    case "scout.tick_completed":
    case "scout.tick_error":
      return s;

    default: {
      // Exhaustiveness guard. Unknown event types log+skip per api-contracts §9.
      // Cast through unknown to satisfy the never-narrowing.
      const _exhaustive: never = e as never;
      void _exhaustive;
      return s;
    }
  }
}
