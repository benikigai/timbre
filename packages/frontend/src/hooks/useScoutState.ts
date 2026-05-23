// Combines initial /api/scout/state fetch with live /api/scout/events subscription.
import { useEffect, useMemo, useState } from "react";
import type { ScoutStateResponse, ScoutTickResult } from "@timbre/shared/contracts";
import { useScoutEvents } from "./useScoutEvents";
import { getScoutState } from "../api/scout";

interface UseScoutStateResult {
  scoutState: ScoutStateResponse | null;
  connected: boolean;
}

export function useScoutState(): UseScoutStateResult {
  const [scoutState, setScoutState] = useState<ScoutStateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    getScoutState()
      .then((s) => {
        if (!cancelled) setScoutState(s);
      })
      .catch(() => {
        // Backend offline or no scout data — leave null, ScoutPanel handles empty state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlers = useMemo(
    () => ({
      "scout.tick_completed": (tick: ScoutTickResult) => {
        setScoutState((prev) => {
          if (!prev) {
            return {
              latest_tick: tick,
              candidates: [],
              alerts: tick.alerts,
              tick_history: [{ tick_id: tick.tick_id, at: tick.completed_at, new_candidates_count: tick.new_candidates_count }],
            };
          }
          return {
            ...prev,
            latest_tick: tick,
            alerts: [...tick.alerts, ...prev.alerts].slice(0, 20),
            tick_history: [
              { tick_id: tick.tick_id, at: tick.completed_at, new_candidates_count: tick.new_candidates_count },
              ...prev.tick_history,
            ].slice(0, 30),
          };
        });
      },
    }),
    [],
  );

  const { connected } = useScoutEvents(handlers);
  return { scoutState, connected };
}
