import express from "express";
import cors from "cors";
import { resolve } from "node:path";
import { env, allowedOrigins } from "./env.js";
import { eventsRouter } from "./routes/events.js";
import { scoutRouter } from "./routes/scout.js";
import { runsRouter } from "./routes/runs.js";
import type { HealthResponse } from "../../shared/src/contracts/index.js";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..");
const CACHE_DIR = resolve(REPO_ROOT, "data", "cache");

const STARTED_AT = new Date().toISOString();
const BUILD = "back-mvp-001";

const app = express();
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.use("/api", eventsRouter);
app.use("/api/scout", scoutRouter);
app.use("/api/runs", runsRouter);
app.use(
  "/api/cache",
  express.static(CACHE_DIR, {
    maxAge: "1h",
    fallthrough: false,
    setHeaders: (res, path) => {
      if (path.endsWith(".json")) res.setHeader("Content-Type", "application/json");
    },
  }),
);

app.get("/api/healthz", (_req, res) => {
  const body: HealthResponse = {
    ok: true,
    build: BUILD,
    started_at: STARTED_AT,
  };
  res.json(body);
});

const HOST = "127.0.0.1";
const srv = app.listen(env.PORT, HOST, () => {
  if (!srv.listening) {
    console.error(
      `[timbre-back] bind failed: ${HOST}:${env.PORT} unavailable. Set PORT env to a free port.`,
    );
    process.exit(1);
  }
  console.log(
    `[timbre-back] listening on http://${HOST}:${env.PORT} (cors: ${allowedOrigins.join(", ")})`,
  );
});
srv.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[timbre-back] port ${env.PORT} in use. Set PORT env to a free port.`,
    );
  } else {
    console.error("[timbre-back] server error:", err);
  }
  process.exit(1);
});
