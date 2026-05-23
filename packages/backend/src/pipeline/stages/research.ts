// Research (plan only): Deep Research agent with collaborative_planning=true.
// Returns the proposed plan + interaction id so the orchestrator can suspend
// for plan-approval, then hand off to cache replay (per MINIMUM-VIABLE §2).
//
// API constraints:
// - deep-research agent REQUIRES background=true (api error if omitted)
// - returns immediately with status='in_progress'; poll interactions.get until
//   terminal status. With collaborative_planning=true, plan emerges as
//   status='completed' (plan content in outputs/output_text) — proceeding to
//   execution requires a follow-up interactions.create with approval input.

import { genai } from "../../genai/client.js";
import { emit } from "../../bus/eventLog.js";
import { extractText } from "../extractText.js";

const AGENT = "deep-research-preview-04-2026";
const POLL_MS = 3000;
const MAX_MS = 240_000; // 4 min ceiling for plan generation

export interface ResearchPlanResult {
  plan_md: string;
  plan_interaction_id: string;
}

export async function runResearchPlan(
  runId: string,
  topic: string,
): Promise<ResearchPlanResult> {
  const start = Date.now();
  emit(runId, "stage.started", {
    run_id: runId,
    at: new Date().toISOString(),
    stage: "research",
    agent: AGENT,
  });

  let interaction = await genai.interactions.create({
    agent: AGENT,
    input: topic,
    agent_config: {
      type: "deep-research",
      collaborative_planning: true,
      thinking_summaries: "auto",
      visualization: "auto",
    },
    background: true,
  } as never);

  emit(runId, "agent.thought", {
    run_id: runId,
    at: new Date().toISOString(),
    stage: "research",
    text: `Researching: ${topic}. Planning approach…`,
  });

  while (interaction.status === "in_progress" || interaction.status === "requires_action") {
    if (Date.now() - start > MAX_MS) {
      throw new Error(`research plan timed out after ${MAX_MS}ms`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
    interaction = await genai.interactions.get(interaction.id);
  }

  if (interaction.status !== "completed") {
    throw new Error(`research plan status: ${interaction.status}`);
  }

  const sdkOutput = (interaction as { output_text?: string }).output_text;
  const planMd =
    sdkOutput && sdkOutput.length > 0 ? sdkOutput : extractText(interaction);

  emit(runId, "research.plan_proposed", {
    run_id: runId,
    at: new Date().toISOString(),
    plan_md: planMd,
    plan_interaction_id: interaction.id,
  });

  return { plan_md: planMd, plan_interaction_id: interaction.id };
}
