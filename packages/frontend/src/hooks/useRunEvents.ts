// Subscribe to per-run SSE channel: GET /api/runs/:run_id/events
// Thin wrapper around useEventStream with the canonical URL.

import { useEventStream, type EventHandlers, type UseEventStreamResult } from "./useEventStream.js";
import { getBackendUrl } from "../api/client.js";

export function useRunEvents(
  runId: string | null,
  handlers: EventHandlers,
  opts: { demoCached?: boolean; cacheFixture?: string; speed?: number } = {},
): UseEventStreamResult {
  // Build URL; empty string disables connection until runId is known.
  const query = new URLSearchParams();
  if (opts.demoCached) query.set("demo", "cached");
  if (opts.cacheFixture) query.set("cache_fixture", opts.cacheFixture);
  if (opts.speed) query.set("speed", String(opts.speed));
  const qs = query.toString();
  const url = runId ? `${getBackendUrl()}/api/runs/${encodeURIComponent(runId)}/events${qs ? `?${qs}` : ""}` : "";
  return useEventStream(url, handlers, { enabled: !!runId });
}
