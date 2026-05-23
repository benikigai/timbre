// SSE event schemas — mirrors specs/api-contracts.md §3.
// Every event carries { run_id, at } EXCEPT scout.* events which carry { tick_id, at }.
import { z } from 'zod';
import {
  CandidateSchema,
  VoiceDiffSchema,
  DiscrepancySchema,
  ScoutTickResultSchema,
  MultiplexJobSchema,
  MultiplexResultSchema,
} from './files.js';
import { PIPELINE_STAGE_IDS } from './stage.js';

// Run-scoped events use the 6-stage pipeline subset — scout lives on its
// own SSE channel (see api-contracts.md §3.2) and never appears here.
const StageIdSchema = z.enum(PIPELINE_STAGE_IDS);
const RunEnvelope = z.object({ run_id: z.string(), at: z.string() });
const ScoutEnvelope = z.object({ tick_id: z.string(), at: z.string() });

// Note on `id` field collisions: VoiceDiff and Discrepancy each carry an `id`
// field (stable identifier within a run). This is distinct from the SSE
// wire-level `id:` line (monotonic event id used by Last-Event-Id reconnect).
// Different layers — the wire id never appears inside the JSON `data:` body.

// ───────── run lifecycle ─────────
export const RunStartedSchema = RunEnvelope.extend({
  topic: z.string(),
  candidate: CandidateSchema,
  mode: z.enum(['live', 'cached']),
});
export const RunCompletedSchema = RunEnvelope.extend({
  duration_ms: z.number(),
  final_md_url: z.string(),
  multiplex: MultiplexResultSchema,
});
export const RunErrorSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  error: z.string(),
  recoverable: z.literal(false),
});
export const RunFallbackEngagedSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  reason: z.string(),
});

// ───────── stage lifecycle ─────────
export const StageStartedSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  agent: z.string(),
});
export const StageCompletedSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  duration_ms: z.number(),
  summary: z.string().optional(),
});
export const StageErrorSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  error: z.string(),
  recovered: z.boolean(),
});

// ───────── agent inner (council view) ─────────
export const AgentThoughtSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  text: z.string(),
});
export const AgentTokenSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  text: z.string(),
});
export const AgentToolCallSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  tool: z.enum([
    'google_search',
    'url_context',
    'code_execution',
    'flag_discrepancy',
    'emit_diff',
  ]),
  args: z.record(z.string(), z.unknown()),
});
export const AgentCitationSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  url: z.string().url(),
  title: z.string().optional(),
  snippet: z.string().optional(),
});
export const AgentImageSchema = RunEnvelope.extend({
  stage: StageIdSchema,
  mime_type: z.string(),
  data_b64: z.string(),
  caption: z.string().optional(),
});

// ───────── stage-specific ─────────
export const CurateSelectedSchema = RunEnvelope.extend({
  top: z.array(CandidateSchema).length(3),
});
export const ResearchPlanProposedSchema = RunEnvelope.extend({
  plan_md: z.string(),
  plan_interaction_id: z.string(),
});
export const ResearchPlanApprovedSchema = RunEnvelope.extend({
  plan_interaction_id: z.string(),
  modifications: z.string().optional(),
});

export const VoiceDiffEventSchema = RunEnvelope.merge(VoiceDiffSchema);

export const VerifyCheckingClaimSchema = RunEnvelope.extend({ claim: z.string() });
export const VerifyDiscrepancyEventSchema = RunEnvelope.merge(DiscrepancySchema);

export const MultiplexJobStartedSchema = RunEnvelope.extend({ job: MultiplexJobSchema });
export const MultiplexJobCompletedSchema = RunEnvelope.extend({
  job: MultiplexJobSchema,
  result_url: z.string(),
  duration_ms: z.number(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export const MultiplexJobFailedSchema = RunEnvelope.extend({
  job: MultiplexJobSchema,
  error: z.string(),
  fatal: z.boolean(),
});

// ───────── scout (separate channel) ─────────
export const ScoutTickStartedSchema = ScoutEnvelope;
// ScoutTickCompleted: scout result fields, tick_id from envelope (omit from inner).
export const ScoutTickCompletedSchema = ScoutEnvelope.merge(
  ScoutTickResultSchema.omit({ tick_id: true, started_at: true }),
).extend({
  started_at: z.string(),
});
export const ScoutTickErrorSchema = ScoutEnvelope.extend({ error: z.string() });

// ───────── master map: event type → Zod schema ─────────
export const EventTypeMap = {
  'run.started': RunStartedSchema,
  'run.completed': RunCompletedSchema,
  'run.error': RunErrorSchema,
  'run.fallback_engaged': RunFallbackEngagedSchema,
  'stage.started': StageStartedSchema,
  'stage.completed': StageCompletedSchema,
  'stage.error': StageErrorSchema,
  'agent.thought': AgentThoughtSchema,
  'agent.token': AgentTokenSchema,
  'agent.tool_call': AgentToolCallSchema,
  'agent.citation': AgentCitationSchema,
  'agent.image': AgentImageSchema,
  'curate.selected': CurateSelectedSchema,
  'research.plan_proposed': ResearchPlanProposedSchema,
  'research.plan_approved': ResearchPlanApprovedSchema,
  'voice.diff': VoiceDiffEventSchema,
  'verify.checking_claim': VerifyCheckingClaimSchema,
  'verify.discrepancy': VerifyDiscrepancyEventSchema,
  'multiplex.job_started': MultiplexJobStartedSchema,
  'multiplex.job_completed': MultiplexJobCompletedSchema,
  'multiplex.job_failed': MultiplexJobFailedSchema,
  'scout.tick_started': ScoutTickStartedSchema,
  'scout.tick_completed': ScoutTickCompletedSchema,
  'scout.tick_error': ScoutTickErrorSchema,
} as const;

export type EventType = keyof typeof EventTypeMap;
export type EventPayload<T extends EventType> = z.infer<(typeof EventTypeMap)[T]>;

// Discriminated-union convenience for handlers.
export type AnyEvent = {
  [T in EventType]: { type: T; data: EventPayload<T> };
}[EventType];

/** Validate-and-narrow a raw payload for a given event type. Throws on mismatch. */
export function parseEvent<T extends EventType>(type: T, raw: unknown): EventPayload<T> {
  return EventTypeMap[type].parse(raw) as EventPayload<T>;
}

/** Try parse; returns null on failure (use in frontend ingest loop to log+skip). */
export function safeParseEvent<T extends EventType>(
  type: T,
  raw: unknown,
): EventPayload<T> | null {
  const r = EventTypeMap[type].safeParse(raw);
  return r.success ? (r.data as EventPayload<T>) : null;
}
