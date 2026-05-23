// REST calls against the /api/scout surface — typed by api-contracts §5.

import type {
  ScoutStateResponse,
  ScoutTriggerRequest,
  ScoutTriggerResponse,
} from "@timbre/shared/contracts";
import { api } from "./client.js";

export function getScoutState(): Promise<ScoutStateResponse> {
  return api<ScoutStateResponse>("/api/scout/state");
}

export function triggerScout(req: ScoutTriggerRequest = {}): Promise<ScoutTriggerResponse> {
  return api<ScoutTriggerResponse>("/api/scout/trigger", { method: "POST", body: req });
}
