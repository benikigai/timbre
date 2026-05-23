// UI-derived state shape for one pipeline run.
// Per specs/02-front.md §4 — built from the SSE event log via runReducer.

import type {
  Candidate,
  Discrepancy,
  MultiplexJob,
  StageId,
  VoiceDiff,
  VoiceProfile,
} from "@timbre/shared/contracts";

export type StageStatus = "idle" | "active" | "done" | "error";

export interface StageState {
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
}

export type StageMap = Record<Exclude<StageId, "scout">, StageState>;

export interface MultiplexJobState {
  status: "pending" | "started" | "done" | "failed";
  url?: string;
  durationMs?: number;
  error?: string;
}

export interface PlanState {
  md: string;
  planInteractionId: string;
  approved: boolean;
}

export interface VoiceProfileGateState {
  profile: VoiceProfile;
  corpusTitles: string[];
  approved: boolean;
  edited: boolean;
}

export interface RunErrorState {
  stage: StageId;
  message: string;
}

export interface Citation {
  stage: StageId;
  url: string;
  title?: string;
  snippet?: string;
}

export interface Chart {
  caption: string;
  data_b64: string;
  mime_type: string;
}

export interface RunState {
  runId: string | null;
  mode: "live" | "cached";
  topic: string;
  candidate: Candidate | null;
  stages: StageMap;
  // Append-on-event: each stage accumulates text deltas.
  thoughts: Record<Exclude<StageId, "scout">, string[]>;
  draftMd: string;
  rewriteMd: string;
  diffs: VoiceDiff[];
  discrepancies: Discrepancy[];
  citations: Citation[];
  charts: Chart[];
  plan: PlanState | null;
  voiceGate: VoiceProfileGateState | null;
  multiplexJobs: Partial<Record<MultiplexJob, MultiplexJobState>>;
  finalMdUrl: string | null;
  completed: boolean;
  error: RunErrorState | null;
}

const idleStage = (): StageState => ({ status: "idle" });

export const initialRunState: RunState = {
  runId: null,
  mode: "live",
  topic: "",
  candidate: null,
  stages: {
    curate: idleStage(),
    research: idleStage(),
    write: idleStage(),
    voice: idleStage(),
    verify: idleStage(),
    multiplex: idleStage(),
  },
  thoughts: {
    curate: [],
    research: [],
    write: [],
    voice: [],
    verify: [],
    multiplex: [],
  },
  draftMd: "",
  rewriteMd: "",
  diffs: [],
  discrepancies: [],
  citations: [],
  charts: [],
  plan: null,
  voiceGate: null,
  multiplexJobs: {},
  finalMdUrl: null,
  completed: false,
  error: null,
};

// Derived UI beat for choreographing the demo's center zone.
export type DemoBeat = "cold-open" | "running" | "plan-gate" | "streaming" | "verify" | "multiplex" | "proof";

export function deriveDemoBeat(s: RunState): DemoBeat {
  if (s.completed) return "proof";
  if (s.plan && !s.plan.approved) return "plan-gate";
  if (Object.values(s.multiplexJobs).some((j) => j && j.status !== "pending")) return "multiplex";
  if (s.discrepancies.length > 0 && s.stages.verify.status === "active") return "verify";
  if (s.stages.write.status === "active" || s.stages.voice.status === "active") return "streaming";
  if (s.runId) return "running";
  return "cold-open";
}
