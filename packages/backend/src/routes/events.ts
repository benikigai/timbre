import { Router, type Request, type Response } from "express";
import { attachWriter, SCOUT_RUN_ID } from "../bus/eventLog.js";

export const eventsRouter = Router();

function openStream(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write(": connected\n\n");
}

eventsRouter.get("/runs/:id/events", (req: Request, res: Response) => {
  openStream(res);
  const cleanup = attachWriter(req.params.id as string, res);
  req.on("close", cleanup);
});

eventsRouter.get("/scout/events", (req: Request, res: Response) => {
  openStream(res);
  const cleanup = attachWriter(SCOUT_RUN_ID, res);
  req.on("close", cleanup);
});
