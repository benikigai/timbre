#!/usr/bin/env tsx
// In-process smoke test for the cache replay fixture.
// Walks the NDJSON, validates each event against Zod, then emits through
// the real bus into a fake SSE writer — proves wire-format produces a
// parseable SSE stream of all 47 events with correct ids/types.
import { readFileSync } from 'node:fs';
import type { Response } from 'express';
import { emit, attachWriter } from '../src/bus/eventLog.js';
import {
  parseEvent,
  EventTypeMap,
  type EventType,
} from '../../shared/src/contracts/events.js';

const fixturePath =
  process.argv[2] ?? 'data/cache/agentic-web-infra/events.ndjson';
const RUN_ID = `smoke_${Date.now()}`;

type Wrapper = {
  id: number;
  type: string;
  t_offset_ms: number;
  data: Record<string, unknown>;
};

const rawLines = readFileSync(fixturePath, 'utf8')
  .split('\n')
  .filter((l) => l.trim());
const lines: Wrapper[] = rawLines.map((l) => JSON.parse(l));
console.log(`Loaded ${lines.length} events from ${fixturePath}`);

// 1) Zod conformance
let zodErrs = 0;
const expectedCounts = new Map<string, number>();
for (const ev of lines) {
  expectedCounts.set(ev.type, (expectedCounts.get(ev.type) ?? 0) + 1);
  try {
    parseEvent(ev.type as EventType, { ...ev.data, run_id: 'X', at: 'X' });
  } catch (e) {
    zodErrs++;
    console.error(`  zod fail id=${ev.id} type=${ev.type}: ${(e as Error).message.slice(0, 100)}`);
  }
}
console.log(`Zod: ${lines.length - zodErrs}/${lines.length} events conform`);

// 2) Monotonic timing
let timingErrs = 0;
for (let i = 1; i < lines.length; i++) {
  if (lines[i].t_offset_ms < lines[i - 1].t_offset_ms) {
    timingErrs++;
    console.error(`  timing regress at id=${lines[i].id}: ${lines[i].t_offset_ms} < prev ${lines[i - 1].t_offset_ms}`);
  }
}
console.log(
  `Timing: ${lines.length - timingErrs}/${lines.length} t_offset_ms monotonic; ` +
    `total wall ${lines.at(-1)!.t_offset_ms / 1000}s`,
);

// 3) Type coverage vs registered EventTypeMap
const known = new Set(Object.keys(EventTypeMap));
const unknownTypes = [...expectedCounts.keys()].filter((t) => !known.has(t));
console.log(
  `Type coverage: ${expectedCounts.size} distinct types, ${unknownTypes.length} unknown` +
    (unknownTypes.length ? ` (${unknownTypes.join(', ')})` : ''),
);

// 4) In-process bus replay through a fake Express Response
let writeCount = 0;
let writeBytes = 0;
const sseChunks: string[] = [];
const fakeRes = {
  write: (chunk: string) => {
    writeCount++;
    writeBytes += chunk.length;
    sseChunks.push(chunk);
    return true;
  },
  end: () => {},
  on: () => fakeRes,
  flushHeaders: () => {},
} as unknown as Response;

const detach = attachWriter(RUN_ID, fakeRes);
for (const ev of lines) {
  emit(RUN_ID, ev.type, {
    ...ev.data,
    run_id: RUN_ID,
    at: new Date().toISOString(),
  });
}
detach();

console.log(`Bus emit: ${writeCount} SSE writes, ${writeBytes} bytes`);

// 5) Parse the SSE wire stream back and tally types
const wire = sseChunks.join('');
const records = wire.split('\n\n').filter((r) => r.trim() && !r.startsWith(':'));
const receivedCounts = new Map<string, number>();
const sseIds: number[] = [];
let parseErrs = 0;
for (const rec of records) {
  const evLine = rec.split('\n').find((l) => l.startsWith('event:'));
  const idLine = rec.split('\n').find((l) => l.startsWith('id:'));
  const dataLine = rec.split('\n').find((l) => l.startsWith('data:'));
  if (!evLine || !dataLine) continue;
  const type = evLine.slice(6).trim();
  receivedCounts.set(type, (receivedCounts.get(type) ?? 0) + 1);
  if (idLine) sseIds.push(Number(idLine.slice(3).trim()));
  try {
    JSON.parse(dataLine.slice(5).trim());
  } catch {
    parseErrs++;
  }
}
console.log(`SSE parse-back: ${records.length} records, ${parseErrs} JSON-parse errors`);

let countMismatches = 0;
for (const [t, n] of expectedCounts) {
  const got = receivedCounts.get(t) ?? 0;
  if (got !== n) {
    countMismatches++;
    console.error(`  count mismatch ${t}: expected ${n}, got ${got}`);
  }
}
if (countMismatches === 0) {
  console.log(`Per-type tally: all ${expectedCounts.size} types match`);
}

// SSE ids must be strictly monotonic starting at 1 (per api-contracts §2.4)
const idsMono = sseIds.every((v, i) => i === 0 || v === sseIds[i - 1] + 1);
const idsStart = sseIds[0] === 1;
console.log(
  `SSE ids: ${sseIds.length} emitted, monotonic=${idsMono}, starts-at-1=${idsStart}` +
    (sseIds.length ? `, range ${sseIds[0]}..${sseIds.at(-1)}` : ''),
);

const ok =
  zodErrs === 0 &&
  timingErrs === 0 &&
  unknownTypes.length === 0 &&
  records.length === lines.length &&
  parseErrs === 0 &&
  countMismatches === 0 &&
  idsMono &&
  idsStart;
console.log(`\n${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
