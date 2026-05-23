import { Router, type Request, type Response } from "express";
import { runScoutTick } from "../pipeline/stages/scout.js";
import { getState } from "../pipeline/scoutCache.js";

export const scoutRouter = Router();

scoutRouter.get("/state", (_req: Request, res: Response) => {
  res.json(getState());
});

scoutRouter.post("/trigger", async (req: Request, res: Response) => {
  const envId = typeof req.body?.env_id === "string" ? req.body.env_id : undefined;
  try {
    const result = await runScoutTick({ envId });
    res.json({ tick_id: result.tick_id, env_id: result.env_id });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[scout] trigger failed:", message);
    res.status(500).json({ error: "scout_tick_failed", detail: message });
  }
});
