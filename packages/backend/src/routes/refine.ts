// POST /api/refine — human-in-loop refine pass. Takes the user-edited draft +
// natural-language feedback ("shorten it", "more skeptical", etc.) and returns
// a revised draft from Flash. Lets the user iterate on the final piece without
// re-running the whole pipeline.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { extractText } from "../pipeline/extractText.js";
import { getRunVoiceProfile } from "../pipeline/voiceProfileApproval.js";
import type { VoiceProfile } from "@timbre/shared";

export const refineRouter = Router();

const REFINE_SYS = `You are Timbre's Refine stage. The user has reviewed the draft and given short instructions to apply. Apply their feedback verbatim — they own the final word.

Rules:
- Return ONLY the revised markdown body. No preamble, no commentary, no markdown code fences.
- Preserve every factual claim and citation unless the feedback explicitly asks to change them.
- Match the existing voice and structure unless feedback says otherwise.
- If feedback is "shorten" without a target, cut to ~70% of the input length.
- If feedback is ambiguous, take the most useful tight interpretation.`;

interface RefineBody {
  draft?: string;
  feedback?: string;
  run_id?: string;
  voice_profile?: VoiceProfile; // Optional inline override (option iii)
}

function voiceProfileAsInstructions(p: VoiceProfile): string {
  const lines: string[] = ["", "## Voice profile (binding)"];
  if (p.tone?.length) lines.push(`- Tone: ${p.tone.join(", ")}`);
  if (p.sentence_length) lines.push(`- Sentence length: ${p.sentence_length}`);
  if (p.technical_depth) lines.push(`- Technical depth: ${p.technical_depth}`);
  if (p.forbidden_jargon?.length) lines.push(`- Never use: ${p.forbidden_jargon.join(", ")}`);
  if (p.preferred_openings?.length) lines.push(`- Prefer opener patterns: ${p.preferred_openings.join(" | ")}`);
  return lines.join("\n");
}

refineRouter.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as RefineBody;
  const draft = (body.draft ?? "").trim();
  const feedback = (body.feedback ?? "").trim();
  if (!draft || !feedback) {
    res.status(400).json({ error: "draft_and_feedback_required" });
    return;
  }
  // Prefer the inline voice profile sent with this request; otherwise fall
  // back to the run-scoped profile set by the voice-profile gate.
  const profile =
    body.voice_profile ?? (body.run_id ? getRunVoiceProfile(body.run_id) : undefined);
  const systemInstruction = profile
    ? `${REFINE_SYS}\n${voiceProfileAsInstructions(profile)}`
    : REFINE_SYS;

  try {
    const interaction = await genai.interactions.create(
      {
        model: "gemini-3.5-flash",
        system_instruction: systemInstruction,
        input: `## Current draft\n\n${draft}\n\n## User feedback\n\n${feedback}\n\nReturn the revised draft now.`,
      } as never,
      { timeout: 120_000 },
    );
    const sdkOutput = (interaction as { output_text?: string }).output_text;
    const refined = sdkOutput && sdkOutput.length > 0 ? sdkOutput : extractText(interaction);
    res.json({ refined: refined.trim() });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[refine] failed:", message);
    res.status(500).json({ error: "refine_failed", detail: message });
  }
});
