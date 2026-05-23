// Parse the Scout tick block per api-contracts.md §6 / AGENTS.md §"Tick output contract".
//
// Block shape:
//   <<<TIMBRE_TICK_START>>>
//   {"tick_id":"...","at":"..."}
//   ---CANDIDATES_COUNT---
//   <integer>
//   ---CANDIDATES_HEAD---
//   [<Candidate>,...]
//   ---ALERTS---
//   [<Alert>,...]
//   ---LS---
//   <raw text>
//   <<<TIMBRE_TICK_END>>>
//
// Strategy: locate the LAST TIMBRE_TICK_START..END block; split on section markers;
// JSON-parse each except LS which is raw text. Strict on markers, lenient on whitespace.

import type { Candidate, Alert } from "../../../shared/src/contracts/index.js";

export interface ParsedTickBlock {
  tick_id: string;
  at: string;
  candidates_count: number;
  candidates_head: Candidate[];
  alerts: Alert[];
  ls_output_text: string;
}

const START = "<<<TIMBRE_TICK_START>>>";
const END = "<<<TIMBRE_TICK_END>>>";

export function parseTickBlock(outputText: string): ParsedTickBlock {
  const startIdx = outputText.lastIndexOf(START);
  if (startIdx < 0) throw new Error("tick parse: missing TIMBRE_TICK_START");
  const endIdx = outputText.indexOf(END, startIdx);
  if (endIdx < 0) throw new Error("tick parse: missing TIMBRE_TICK_END");

  const inner = outputText.slice(startIdx + START.length, endIdx).trim();

  // Sections in order: <header-json>, COUNT, HEAD, ALERTS, LS
  const sections = splitSections(inner);

  const header = jsonParse<{ tick_id: string; at: string }>(
    sections.header,
    "header",
  );
  const candidates_count = Number(sections.count.trim());
  if (!Number.isFinite(candidates_count)) {
    throw new Error(`tick parse: CANDIDATES_COUNT not a number: "${sections.count}"`);
  }
  const candidates_head = jsonParse<Candidate[]>(sections.head, "CANDIDATES_HEAD");
  const alerts = jsonParse<Alert[]>(sections.alerts, "ALERTS");

  return {
    tick_id: header.tick_id,
    at: header.at,
    candidates_count,
    candidates_head,
    alerts,
    ls_output_text: sections.ls.trim(),
  };
}

interface Sections {
  header: string;
  count: string;
  head: string;
  alerts: string;
  ls: string;
}

function splitSections(inner: string): Sections {
  const markers = [
    "---CANDIDATES_COUNT---",
    "---CANDIDATES_HEAD---",
    "---ALERTS---",
    "---LS---",
  ];
  const positions = markers.map((m) => inner.indexOf(m));
  for (let i = 0; i < markers.length; i++) {
    if (positions[i] < 0)
      throw new Error(`tick parse: missing section marker ${markers[i]}`);
  }
  // Each section is between its marker and the next (or end of inner).
  const headerEnd = positions[0];
  const header = inner.slice(0, headerEnd).trim();
  const count = inner
    .slice(positions[0] + markers[0].length, positions[1])
    .trim();
  const head = inner
    .slice(positions[1] + markers[1].length, positions[2])
    .trim();
  const alerts = inner
    .slice(positions[2] + markers[2].length, positions[3])
    .trim();
  const ls = inner.slice(positions[3] + markers[3].length).trim();
  return { header, count, head, alerts, ls };
}

function jsonParse<T>(s: string, label: string): T {
  try {
    return JSON.parse(s) as T;
  } catch (e) {
    throw new Error(
      `tick parse: ${label} not valid JSON (got ${s.slice(0, 80)}…): ${(e as Error).message}`,
    );
  }
}
