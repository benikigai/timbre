// File / data schemas — mirrors specs/api-contracts.md §4.
import { z } from 'zod';

export const CandidateSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string(),
  source: z.string(), // 'rss:openai-blog' | 'hn:item' | 'x:@karpathy' | 'arxiv:cs.AI' | ...
  published_at: z.string(), // ISO8601
  novelty_score: z.number().min(0).max(1),
  voice_fit_score: z.number().min(0).max(1),
  combined_score: z.number().min(0).max(1),
  summary: z.string().max(280),
  raw_excerpt: z.string().max(2000).optional(),
});
export type Candidate = z.infer<typeof CandidateSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  triggered_at: z.string(),
  candidate: CandidateSchema,
  reason: z.string(),
  threshold: z.number().min(0).max(1),
});
export type Alert = z.infer<typeof AlertSchema>;

export const VoiceProfileSchema = z.object({
  founder_id: z.string(),
  tone: z.array(z.string()),
  sentence_length: z.enum(['concise', 'medium', 'long']),
  technical_depth: z.enum(['layman', 'engineer', 'deep-engineer']),
  forbidden_jargon: z.array(z.string()),
  preferred_openings: z.array(z.string()),
  brand: z.object({
    primary_color: z.string(),
    accent_color: z.string(),
    font_family: z.string(),
  }),
  tts_voice: z.string(),
});
export type VoiceProfile = z.infer<typeof VoiceProfileSchema>;

export const KeyClaimSchema = z.object({
  id: z.string(),
  claim: z.string(),
  sources: z.array(
    z.object({
      url: z.string().url(),
      quote: z.string(),
    }),
  ),
});
export type KeyClaim = z.infer<typeof KeyClaimSchema>;

export const ResearchPackSchema = z.object({
  topic: z.string(),
  interaction_id: z.string(),
  summary_md: z.string(),
  key_claims: z.array(KeyClaimSchema),
  charts: z.array(
    z.object({
      caption: z.string(),
      data_b64: z.string(),
      mime_type: z.string(),
    }),
  ),
  citations: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
    }),
  ),
});
export type ResearchPack = z.infer<typeof ResearchPackSchema>;

export const VoiceDiffSchema = z.object({
  id: z.string(),
  op: z.enum(['insert', 'delete', 'replace']),
  original_text: z.string(),
  rewritten_text: z.string(),
  span: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
  reason: z.string(),
});
export type VoiceDiff = z.infer<typeof VoiceDiffSchema>;

export const DiscrepancySchema = z.object({
  id: z.string(),
  original_claim: z.string(),
  drift_text: z.string(),
  diff_span: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }),
  sources: z.array(
    z.object({
      url: z.string().url(),
      quote: z.string(),
    }),
  ),
  resolution: z.enum(['auto-corrected', 'flagged', 'accepted']),
  final_text: z.string(),
});
export type Discrepancy = z.infer<typeof DiscrepancySchema>;

export const ScoutTickResultSchema = z.object({
  tick_id: z.string(),
  started_at: z.string(),
  completed_at: z.string(),
  env_id: z.string(),
  candidates_count: z.number().int().nonnegative(),
  new_candidates_count: z.number().int().nonnegative(),
  alerts: z.array(AlertSchema),
  ls_output_text: z.string(),
  output_text_excerpt: z.string().max(4000),
});
export type ScoutTickResult = z.infer<typeof ScoutTickResultSchema>;

export const MultiplexJobSchema = z.enum(['tts', 'carousel', 'radio', 'veo']);
export type MultiplexJob = z.infer<typeof MultiplexJobSchema>;

export const MultiplexResultSchema = z.object({
  tts: z
    .object({
      url: z.string(),
      duration_ms: z.number(),
      voice: z.string(),
    })
    .optional(),
  carousel: z
    .object({
      urls: z.array(z.string()).length(3),
    })
    .optional(),
  radio: z
    .object({
      url: z.string(),
      duration_ms: z.number(),
      transcript: z.string().optional(),
    })
    .optional(),
  veo: z
    .object({
      url: z.string(),
      duration_ms: z.number(),
    })
    .optional(),
  errors: z.array(
    z.object({
      job: MultiplexJobSchema,
      error: z.string(),
    }),
  ),
});
export type MultiplexResult = z.infer<typeof MultiplexResultSchema>;
