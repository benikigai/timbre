// Pull all text-content fragments from an Interaction's model_output steps.
// SDK shape: Interaction.steps[] -> filter type='model_output' -> content[] -> filter type='text'.
import type { Interactions } from "@google/genai";

interface ModelOutputStepLike {
  type: string;
  content?: Array<{ type?: string; text?: string }>;
}

export function extractText(interaction: Interactions.Interaction): string {
  const steps = (interaction.steps ?? []) as ModelOutputStepLike[];
  let out = "";
  for (const s of steps) {
    if (s.type !== "model_output" || !s.content) continue;
    for (const c of s.content) {
      if (c.type === "text" && typeof c.text === "string") out += c.text;
    }
  }
  return out;
}
