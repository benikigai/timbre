import type { Response } from "express";

interface StoredEvent {
  id: number;
  type: string;
  data: unknown;
}

interface Channel {
  events: StoredEvent[];
  writers: Set<Response>;
  nextId: number;
  cancelled: boolean;
}

const channels = new Map<string, Channel>();
const SCOUT_CHANNEL = "scout";

function channel(runId: string): Channel {
  let c = channels.get(runId);
  if (!c) {
    c = { events: [], writers: new Set(), nextId: 1, cancelled: false };
    channels.set(runId, c);
  }
  return c;
}

function writeFrame(res: Response, ev: StoredEvent): void {
  res.write(
    `event: ${ev.type}\nid: ${ev.id}\ndata: ${JSON.stringify(ev.data)}\n\n`,
  );
}

export function emit(runId: string, type: string, data: unknown): void {
  const c = channel(runId);
  if (c.cancelled) return;
  const ev: StoredEvent = { id: c.nextId++, type, data };
  c.events.push(ev);
  if (c.events.length > 5000) c.events.shift();
  for (const w of c.writers) {
    try {
      writeFrame(w, ev);
    } catch {
      c.writers.delete(w);
    }
  }
}

export function emitScout(type: string, data: unknown): void {
  emit(SCOUT_CHANNEL, type, data);
}

export function attachWriter(runId: string, res: Response): () => void {
  const c = channel(runId);
  for (const ev of c.events) writeFrame(res, ev);
  c.writers.add(res);
  return () => {
    c.writers.delete(res);
  };
}

export function markCancelled(runId: string): void {
  const c = channels.get(runId);
  if (c) c.cancelled = true;
}

export function isCancelled(runId: string): boolean {
  return channels.get(runId)?.cancelled === true;
}

export const SCOUT_RUN_ID = SCOUT_CHANNEL;
