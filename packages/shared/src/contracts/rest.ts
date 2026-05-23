// REST endpoint schemas — mirrors specs/api-contracts.md §5.
import { z } from 'zod';
import { CandidateSchema, AlertSchema, ScoutTickResultSchema } from './files.js';

const RunRequestBaseSchema = z.object({
  topic: z.string().optional(),
  candidate_id: z.string().optional(),
  mode: z.enum(['live', 'cached']).default('live'),
  cache_fixture: z.string().optional(),
});
type RunRequestBase = z.infer<typeof RunRequestBaseSchema>;
export const RunRequestSchema = RunRequestBaseSchema
  .refine((d: RunRequestBase) => Boolean(d.topic) || Boolean(d.candidate_id), {
    message: 'topic_or_candidate_required',
  })
  .refine(
    (d: RunRequestBase) => d.mode !== 'cached' || Boolean(d.cache_fixture),
    { message: 'cache_fixture_required_when_mode_cached' },
  );
export type RunRequest = z.infer<typeof RunRequestSchema>;

export const RunResponseSchema = z.object({ run_id: z.string() });
export type RunResponse = z.infer<typeof RunResponseSchema>;

export const PlanApprovalRequestSchema = z.object({
  modifications: z.string().optional(),
});
export type PlanApprovalRequest = z.infer<typeof PlanApprovalRequestSchema>;

export const PlanApprovalResponseSchema = z.object({
  ok: z.literal(true),
  approved_at: z.string(),
});
export type PlanApprovalResponse = z.infer<typeof PlanApprovalResponseSchema>;

export const CancelResponseSchema = z.object({
  ok: z.literal(true),
  halted_at: z.string(),
});
export type CancelResponse = z.infer<typeof CancelResponseSchema>;

export const ScoutStateResponseSchema = z.object({
  latest_tick: ScoutTickResultSchema.nullable(),
  candidates: z.array(CandidateSchema),
  alerts: z.array(AlertSchema),
  tick_history: z.array(
    z.object({
      tick_id: z.string(),
      at: z.string(),
      new_candidates_count: z.number().int().nonnegative(),
    }),
  ),
});
export type ScoutStateResponse = z.infer<typeof ScoutStateResponseSchema>;

export const ScoutTriggerRequestSchema = z.object({
  env_id: z.string().optional(),
});
export type ScoutTriggerRequest = z.infer<typeof ScoutTriggerRequestSchema>;

export const ScoutTriggerResponseSchema = z.object({
  tick_id: z.string(),
  env_id: z.string(),
});
export type ScoutTriggerResponse = z.infer<typeof ScoutTriggerResponseSchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  build: z.string(),
  started_at: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
