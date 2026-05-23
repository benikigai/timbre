// Combines the SSE feed with the reducer — single hook the demo consumes.
// Per specs/02-front.md §4.

import { useMemo, useReducer } from "react";
import type { AnyEvent, EventPayload, EventType } from "@timbre/shared/contracts";
import { initialRunState, deriveDemoBeat, type RunState, type DemoBeat } from "../state/runStateTypes.js";
import { runReducer } from "../state/runReducer.js";
import { useRunEvents } from "./useRunEvents.js";

export interface UseRunStateMachineResult {
  state: RunState;
  beat: DemoBeat;
  connected: boolean;
  reset: () => void;
}

export function useRunStateMachine(
  runId: string | null,
  opts: { demoCached?: boolean; cacheFixture?: string; speed?: number } = {},
): UseRunStateMachineResult {
  const [state, dispatch] = useReducer(runReducer, initialRunState);

  // Build a handlers object that wraps each event type to dispatch through the reducer.
  // Memoize so we don't recreate on every render (would tear down EventSource).
  const handlers = useMemo(() => {
    const make =
      <T extends EventType>(type: T) =>
      (data: EventPayload<T>) =>
        dispatch({ type, data } as AnyEvent);

    return {
      "run.started": make("run.started"),
      "run.completed": make("run.completed"),
      "run.error": make("run.error"),
      "run.fallback_engaged": make("run.fallback_engaged"),
      "stage.started": make("stage.started"),
      "stage.completed": make("stage.completed"),
      "stage.error": make("stage.error"),
      "agent.thought": make("agent.thought"),
      "agent.token": make("agent.token"),
      "agent.tool_call": make("agent.tool_call"),
      "agent.citation": make("agent.citation"),
      "agent.image": make("agent.image"),
      "curate.selected": make("curate.selected"),
      "research.plan_proposed": make("research.plan_proposed"),
      "research.plan_approved": make("research.plan_approved"),
      "voice.diff": make("voice.diff"),
      "verify.checking_claim": make("verify.checking_claim"),
      "verify.discrepancy": make("verify.discrepancy"),
      "multiplex.job_started": make("multiplex.job_started"),
      "multiplex.job_completed": make("multiplex.job_completed"),
      "multiplex.job_failed": make("multiplex.job_failed"),
    };
  }, []);

  const { connected } = useRunEvents(runId, handlers, opts);
  const beat = useMemo(() => deriveDemoBeat(state), [state]);
  const reset = useMemo(() => () => dispatch({ type: "__reset__" } as unknown as AnyEvent), []);

  return { state, beat, connected, reset };
}
