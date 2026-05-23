// Gate for Research → cache-replay handoff. Orchestrator awaits a pending
// promise per run_id; POST /api/runs/:id/plan-approval resolves it.

export interface PendingApproval {
  plan_interaction_id: string;
  resolve: (modifications: string | undefined) => void;
  reject: (err: Error) => void;
}

const pending = new Map<string, PendingApproval>();

export function registerPending(
  runId: string,
  planInteractionId: string,
): Promise<{ modifications?: string }> {
  return new Promise((resolve, reject) => {
    pending.set(runId, {
      plan_interaction_id: planInteractionId,
      resolve: (modifications) => {
        pending.delete(runId);
        resolve({ modifications });
      },
      reject: (err) => {
        pending.delete(runId);
        reject(err);
      },
    });
  });
}

export function approvePending(
  runId: string,
  modifications: string | undefined,
): boolean {
  const p = pending.get(runId);
  if (!p) return false;
  p.resolve(modifications);
  return true;
}

export function rejectPending(runId: string, reason: string): boolean {
  const p = pending.get(runId);
  if (!p) return false;
  p.reject(new Error(reason));
  return true;
}

export function hasPending(runId: string): boolean {
  return pending.has(runId);
}
