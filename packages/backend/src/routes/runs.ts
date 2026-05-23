import { Router, type Request, type Response } from "express";
import { approvePending, hasPending } from "../pipeline/planApproval.js";
import { emit, markCancelled } from "../bus/eventLog.js";
import { startRun } from "../pipeline/run.js";
import type { RunRequest } from "../../../shared/src/contracts/index.js";

export const runsRouter = Router();

runsRouter.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as Partial<RunRequest>;
  if (!body.topic && !body.candidate_id && body.mode !== "cached") {
    // Allow start with neither when running cached fixture; otherwise default topic.
  }
  try {
    const result = await startRun({
      topic: body.topic,
      candidate_id: body.candidate_id,
      mode: body.mode ?? "live",
      cache_fixture: body.cache_fixture,
    });
    res.json(result);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    res.status(500).json({ error: "start_run_failed", detail: message });
  }
});

// POST /api/runs/:id/plan-approval — resolves the suspended Research stage.
runsRouter.post("/:id/plan-approval", (req: Request, res: Response) => {
  const runId = req.params.id;
  if (!hasPending(runId)) {
    res.status(409).json({ error: "no_plan_pending" });
    return;
  }
  const modifications =
    typeof req.body?.modifications === "string"
      ? req.body.modifications
      : undefined;
  const ok = approvePending(runId, modifications);
  if (!ok) {
    res.status(409).json({ error: "no_plan_pending" });
    return;
  }
  const approvedAt = new Date().toISOString();
  emit(runId, "research.plan_approved", {
    run_id: runId,
    at: approvedAt,
    plan_interaction_id: "", // orchestrator stamps the real id on the suspended path
    modifications,
  });
  res.json({ ok: true, approved_at: approvedAt });
});

// POST /api/runs/:id/cancel — task 11 stub (cosmetic flag only, no real
// API cancel per master §8 / MINIMUM-VIABLE).
runsRouter.post("/:id/cancel", (req: Request, res: Response) => {
  markCancelled(req.params.id);
  res.json({ ok: true, halted_at: new Date().toISOString() });
});
