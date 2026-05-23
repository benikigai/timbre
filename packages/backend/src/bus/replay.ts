// Cache replay engine: reads data/cache/<fixture>/events.ndjson, emits each
// event at its recorded t_offset_ms interval, substituting current run_id +
// timestamp (fixture uses the literal "REPLACED" as placeholder).

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { emit, isCancelled } from "./eventLog.js";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const CACHE_DIR = resolve(REPO_ROOT, "data", "cache");

interface FixtureEvent {
  id: number;
  type: string;
  t_offset_ms: number;
  data: { run_id?: string; at?: string; [k: string]: unknown };
}

export async function loadFixture(name: string): Promise<FixtureEvent[]> {
  const path = resolve(CACHE_DIR, name, "events.ndjson");
  const raw = await readFile(path, "utf8");
  const events: FixtureEvent[] = [];
  let lineNum = 0;
  for (const line of raw.split("\n")) {
    lineNum++;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as FixtureEvent);
    } catch (e) {
      console.warn(
        `[replay] skipped malformed event at ${name}:line ${lineNum}: ${(e as Error).message}`,
      );
    }
  }
  events.sort((a, b) => a.t_offset_ms - b.t_offset_ms);
  return events;
}

export interface ReplayOptions {
  runId: string;
  fixture: string;
  speed?: number; // 1.0 = realtime; 5.0 = 5x faster
  startOffsetMs?: number; // skip events before this offset
}

export async function replay(opts: ReplayOptions): Promise<void> {
  const events = await loadFixture(opts.fixture);
  if (events.length === 0) {
    console.warn(`[replay] fixture ${opts.fixture} has 0 events`);
    return;
  }
  const speed = Math.max(0.1, Math.min(20, opts.speed ?? 1));
  const startOffset = opts.startOffsetMs ?? 0;
  const wallStart = Date.now();
  const offsetBase = startOffset;

  console.log(
    `[replay] ${opts.fixture}: ${events.length} events @ ${speed}x speed`,
  );

  for (const ev of events) {
    if (ev.t_offset_ms < startOffset) continue;
    if (isCancelled(opts.runId)) {
      console.log(`[replay] ${opts.runId} cancelled at event ${ev.id}`);
      return;
    }
    const targetWall = wallStart + (ev.t_offset_ms - offsetBase) / speed;
    const wait = targetWall - Date.now();
    if (wait > 0) await sleep(wait);

    const data = {
      ...ev.data,
      run_id: opts.runId,
      at: new Date().toISOString(),
    };
    emit(opts.runId, ev.type, data);
  }
  console.log(`[replay] ${opts.fixture} done (${events.length} events)`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
