// Live Scout: ensure managed agent exists, run one tick, parse the tick block,
// cache the result. Emits scout.* events on the SCOUT channel.

import { nanoid } from "nanoid";
import { genai } from "../../genai/client.js";
import { env } from "../../env.js";
import { emitScout } from "../../bus/eventLog.js";
import { extractText } from "../extractText.js";
import { parseTickBlock } from "../parseTickBlock.js";
import { recordTick, getLastEnvId } from "../scoutCache.js";
import type {
  ScoutTickResult,
  Candidate,
  Alert,
} from "../../../shared/src/contracts/index.js";

// Per ai.google.dev/gemini-api/docs/antigravity-agent: call the base antigravity
// agent directly with environment.sources mounting our scout config repo. The
// managed-agent path (agents.create + agent: 'timbre_scout') fails with generic
// 400 — base-agent + per-call env is the documented + working pattern.
const BASE_AGENT = "antigravity-preview-05-2026";

// Repo source: strip .git suffix per docs example shape. Sub-directory target
// (root '/' is rejected per docs).
function scoutEnvironment() {
  const sourceUrl = env.SCOUT_CONFIG_REPO.replace(/\.git$/, "");
  return {
    type: "remote" as const,
    sources: [
      {
        type: "repository" as const,
        source: sourceUrl,
        target: "/workspace/scout",
      },
    ],
  };
}

export interface ScoutTickOptions {
  envId?: string;
}

export async function runScoutTick(opts: ScoutTickOptions = {}): Promise<ScoutTickResult> {
  const tickId = nanoid();
  const startedAt = new Date().toISOString();
  emitScout("scout.tick_started", { tick_id: tickId, at: startedAt });

  try {
    const envIdToUse = opts.envId ?? getLastEnvId();
    // environment: env_id string (reuse) OR full Environment object with sources.
    const environment = envIdToUse ?? scoutEnvironment();

    // Per antigravity-agent docs: store=true REQUIRED, background=false (default).
    // Returns synchronously when the sandbox loop completes — can take 1-5 min,
    // so override the SDK's default client timeout.
    const interaction = await genai.interactions.create(
      {
        agent: BASE_AGENT,
        environment,
        input:
          "Read /workspace/scout/AGENTS.md and follow the tick protocol exactly. End your output by printing the TIMBRE_TICK block verbatim per the AGENTS.md 'Tick output contract' section.",
        store: true,
      },
      { timeout: 600_000 },
    );

    if (interaction.status !== "completed") {
      throw new Error(`scout tick non-completed status: ${interaction.status}`);
    }

    // SDK exposes interaction.output_text for managed-agent responses (per
    // README example: `console.log(interaction.output_text)`). Fall back to
    // extractText() if not populated.
    const sdkOutput = (interaction as { output_text?: string }).output_text;
    const outputText = sdkOutput && sdkOutput.length > 0
      ? sdkOutput
      : extractText(interaction);
    const parsed = parseTickBlock(outputText);

    const result: ScoutTickResult = {
      tick_id: parsed.tick_id || tickId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      env_id: interaction.environment_id ?? envIdToUse ?? "",
      candidates_count: parsed.candidates_count,
      new_candidates_count: parsed.candidates_count, // delta computed against prior tick — MVP keeps it = count
      alerts: parsed.alerts as Alert[],
      ls_output_text: parsed.ls_output_text,
      output_text_excerpt: outputText.slice(0, 4000),
    };

    recordTick(result, parsed.candidates_head as Candidate[]);
    emitScout("scout.tick_completed", {
      tick_id: result.tick_id,
      at: result.completed_at,
      started_at: result.started_at,
      completed_at: result.completed_at,
      env_id: result.env_id,
      candidates_count: result.candidates_count,
      new_candidates_count: result.new_candidates_count,
      alerts: result.alerts,
      ls_output_text: result.ls_output_text,
      output_text_excerpt: result.output_text_excerpt,
    });

    return result;
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    emitScout("scout.tick_error", {
      tick_id: tickId,
      at: new Date().toISOString(),
      error: message,
    });
    throw err;
  }
}
