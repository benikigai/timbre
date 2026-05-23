// In-memory cache of latest Scout tick + history.
// Backs GET /api/scout/state.

import type {
  ScoutTickResult,
  Candidate,
  Alert,
  ScoutStateResponse,
} from "@timbre/shared";

interface State {
  latest_tick: ScoutTickResult | null;
  candidates: Candidate[];
  alerts: Alert[];
  tick_history: Array<{
    tick_id: string;
    at: string;
    new_candidates_count: number;
  }>;
  env_id: string | null;
}

const state: State = {
  latest_tick: null,
  candidates: [],
  alerts: [],
  tick_history: [],
  env_id: null,
};

const HISTORY_CAP = 30;

export function recordTick(tick: ScoutTickResult, candidates: Candidate[]): void {
  state.latest_tick = tick;
  state.candidates = candidates;
  // Merge tick's alerts into the active alerts list (newest first, dedupe by id, cap 20).
  const merged = [...tick.alerts, ...state.alerts];
  const seen = new Set<string>();
  state.alerts = merged.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  }).slice(0, 20);

  state.tick_history.unshift({
    tick_id: tick.tick_id,
    at: tick.started_at,
    new_candidates_count: tick.new_candidates_count,
  });
  if (state.tick_history.length > HISTORY_CAP) {
    state.tick_history.length = HISTORY_CAP;
  }
  state.env_id = tick.env_id;
}

export function getState(): ScoutStateResponse {
  return {
    latest_tick: state.latest_tick,
    candidates: state.candidates,
    alerts: state.alerts,
    tick_history: state.tick_history,
  };
}

export function getLastEnvId(): string | null {
  return state.env_id;
}
