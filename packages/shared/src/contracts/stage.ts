// Pipeline stage constants — mirrors specs/00-master.md §3 + §4.
// Single source of truth for agent/model IDs, thinking levels, and expected timings.

export const STAGE_IDS = [
  'scout',
  'curate',
  'research',
  'write',
  'voice',
  'verify',
  'multiplex',
] as const;
export type StageId = (typeof STAGE_IDS)[number];

// Scout lives on its own SSE channel (/api/scout/events) and never appears
// in run-scoped events. Run lifecycle / stage lifecycle / agent.* events
// use this narrower 6-stage enum. See api-contracts.md §3.2.
export const PIPELINE_STAGE_IDS = [
  'curate',
  'research',
  'write',
  'voice',
  'verify',
  'multiplex',
] as const;
export type PipelineStageId = (typeof PIPELINE_STAGE_IDS)[number];

export const AGENTS = {
  ANTIGRAVITY_BASE: 'antigravity-preview-05-2026',
  TIMBRE_SCOUT: 'timbre_scout',
  DEEP_RESEARCH: 'deep-research-preview-04-2026',
} as const;

export const MODELS = {
  FLASH: 'gemini-3.5-flash',
  // UNVERIFIED — Saturday-morning smoke test required:
  TTS: 'gemini-2.5-flash-preview-tts',
  BANANA: 'gemini-3-pro-image-preview',
} as const;

export const API_REVISION = '2026-05-20';
export const SDK_MIN_VERSION = '2.0.0';

// Headers to pin on every REST call to generativelanguage.googleapis.com.
export const REQUIRED_HEADERS = {
  'Api-Revision': API_REVISION,
  'Content-Type': 'application/json',
} as const;

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export interface StageRuntime {
  agent_or_model: string;
  thinking_level?: ThinkingLevel;
  tools?: string[];
  expected_wall_ms_min: number;
  expected_wall_ms_max: number;
}

export const STAGE_CONFIG: Record<StageId, StageRuntime> = {
  scout: {
    agent_or_model: AGENTS.TIMBRE_SCOUT,
    expected_wall_ms_min: 60_000,
    expected_wall_ms_max: 180_000,
  },
  curate: {
    agent_or_model: MODELS.FLASH,
    thinking_level: 'low',
    expected_wall_ms_min: 3_000,
    expected_wall_ms_max: 8_000,
  },
  research: {
    agent_or_model: AGENTS.DEEP_RESEARCH,
    expected_wall_ms_min: 120_000,
    expected_wall_ms_max: 1_200_000,
  },
  write: {
    agent_or_model: MODELS.FLASH,
    thinking_level: 'medium',
    expected_wall_ms_min: 20_000,
    expected_wall_ms_max: 60_000,
  },
  voice: {
    agent_or_model: MODELS.FLASH,
    thinking_level: 'low',
    tools: ['emit_diff'],
    expected_wall_ms_min: 15_000,
    expected_wall_ms_max: 45_000,
  },
  verify: {
    agent_or_model: MODELS.FLASH,
    thinking_level: 'high',
    tools: ['google_search', 'url_context', 'code_execution', 'flag_discrepancy'],
    expected_wall_ms_min: 30_000,
    expected_wall_ms_max: 90_000,
  },
  multiplex: {
    agent_or_model: 'parallel-jobs',
    expected_wall_ms_min: 10_000,
    expected_wall_ms_max: 60_000,
  },
};

// Backend uses this to decide when to engage cache fallback per master §7.
export const FALLBACK_GRACE_MS = 8_000;
