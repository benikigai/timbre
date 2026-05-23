// REST calls against the /api/runs surface — typed by api-contracts §5.

import type {
  CancelResponse,
  PlanApprovalRequest,
  PlanApprovalResponse,
  RunRequest,
  RunResponse,
} from "@timbre/shared/contracts";
import { api } from "./client.js";

export function startRun(req: RunRequest): Promise<RunResponse> {
  return api<RunResponse>("/api/runs", { method: "POST", body: req });
}

export function approvePlan(runId: string, body: PlanApprovalRequest = {}): Promise<PlanApprovalResponse> {
  return api<PlanApprovalResponse>(`/api/runs/${encodeURIComponent(runId)}/plan-approval`, {
    method: "POST",
    body,
  });
}

export function cancelRun(runId: string): Promise<CancelResponse> {
  return api<CancelResponse>(`/api/runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" });
}
