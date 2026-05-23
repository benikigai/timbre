// Subscribe to the Scout SSE channel: GET /api/scout/events
// Long-lived; opens on mount, lives across the session.

import { useEventStream, type EventHandlers, type UseEventStreamResult } from "./useEventStream.js";
import { getBackendUrl } from "../api/client.js";

export function useScoutEvents(handlers: EventHandlers): UseEventStreamResult {
  return useEventStream(`${getBackendUrl()}/api/scout/events`, handlers);
}
