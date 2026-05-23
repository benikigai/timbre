// Curate: Flash model picks top-3 candidates by combined_score + voice fit.
// Synchronous Flash call (model-based, not agent-based — no background/env quirks).

import { genai } from "../../genai/client.js";
import { emit } from "../../bus/eventLog.js";
import { extractText } from "../extractText.js";
import type { Candidate } from "@timbre/shared";

const CURATE_SYS = `You are Timbre's Curate stage. Pick the 3 candidates a technical founder should write about, balancing combined_score against strategic fit (engineering-first, deep-technical, fresh angle).

Respond with STRICT JSON only (no prose, no markdown fences) in this shape:
{
  "top_ids": ["<candidate.id>", "<candidate.id>", "<candidate.id>"],
  "reason": "<one sentence on why these three together>"
}

Pick exactly 3 ids. If fewer than 3 candidates provided, return all of them.`;

interface CurateReply {
  top_ids: string[];
  reason?: string;
}

export async function runCurate(
  runId: string,
  candidates: Candidate[],
): Promise<Candidate[]> {
  const start = Date.now();
  emit(runId, "stage.started", {
    run_id: runId,
    at: new Date().toISOString(),
    stage: "curate",
    agent: "gemini-3.5-flash",
  });

  // Trim payload to top 30 by combined_score so we don't blow context.
  const ranked = [...candidates].sort(
    (a, b) => b.combined_score - a.combined_score,
  );
  const input = ranked.slice(0, 30);

  const interaction = await genai.interactions.create({
    model: "gemini-3.5-flash",
    system_instruction: CURATE_SYS,
    generation_config: { thinking_level: "low" },
    input: JSON.stringify({ candidates: input }),
  } as never);

  const text = (interaction as { output_text?: string }).output_text
    ?? extractText(interaction);

  const top = pickTop3(text, input);

  emit(runId, "curate.selected", {
    run_id: runId,
    at: new Date().toISOString(),
    top,
  });
  emit(runId, "stage.completed", {
    run_id: runId,
    at: new Date().toISOString(),
    stage: "curate",
    duration_ms: Date.now() - start,
    summary: `selected ${top.length} of ${candidates.length}`,
  });

  return top;
}

function pickTop3(replyText: string, pool: Candidate[]): Candidate[] {
  const stripped = replyText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: CurateReply;
  try {
    parsed = JSON.parse(stripped) as CurateReply;
  } catch {
    // Fall back to first-3 by combined_score if model didn't return JSON.
    return pool.slice(0, 3);
  }
  const byId = new Map(pool.map((c) => [c.id, c]));
  const picked = (parsed.top_ids ?? [])
    .map((id) => byId.get(id))
    .filter((c): c is Candidate => Boolean(c));
  // Pad with top-by-score if model returned fewer than 3.
  if (picked.length < 3) {
    for (const c of pool) {
      if (picked.length >= 3) break;
      if (!picked.includes(c)) picked.push(c);
    }
  }
  return picked.slice(0, 3);
}
