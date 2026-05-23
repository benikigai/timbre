#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { parseEvent, type EventType } from '../../shared/src/contracts/events.js';

const path = process.argv[2] ?? 'data/cache/agentic-web-infra/events.ndjson';
const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim());

let errors = 0;
for (const [i, line] of lines.entries()) {
  let parsed: { id: number; type: string; t_offset_ms: number; data: unknown };
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    console.error(`line ${i + 1}: invalid JSON — ${(e as Error).message}`);
    errors++;
    continue;
  }
  try {
    parseEvent(parsed.type as EventType, parsed.data);
  } catch (e) {
    console.error(`line ${i + 1} (id=${parsed.id}, type=${parsed.type}): schema mismatch`);
    console.error(`  ${(e as Error).message.split('\n').slice(0, 3).join(' | ')}`);
    errors++;
  }
}
console.log(`${lines.length} events checked; ${errors} errors`);
process.exit(errors === 0 ? 0 : 1);
