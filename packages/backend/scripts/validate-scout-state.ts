#!/usr/bin/env tsx
import { readFileSync } from 'node:fs';
import { ScoutStateResponseSchema } from '../../shared/src/contracts/rest.js';

const path = process.argv[2] ?? 'data/cache/scout-state.json';
const raw = JSON.parse(readFileSync(path, 'utf8'));
const result = ScoutStateResponseSchema.safeParse(raw);
if (result.success) {
  console.log(`OK — scout-state.json passes ScoutStateResponseSchema`);
  console.log(
    `  ${result.data.candidates.length} candidates, ${result.data.alerts.length} alerts, ${result.data.tick_history.length} ticks`,
  );
  process.exit(0);
} else {
  console.error('FAIL:');
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}
