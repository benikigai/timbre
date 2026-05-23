// POST /api/refine — human-in-loop refine pass. Takes the user-edited draft +
// natural-language feedback ("shorten it", "more skeptical", etc.) and returns
// a revised draft from Flash. Lets the user iterate on the final piece without
// re-running the whole pipeline.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { extractText } from "../pipeline/extractText.js";

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
}

refineRouter.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as RefineBody;
  const draft = (body.draft ?? "").trim();
  const feedback = (body.feedback ?? "").trim();
  if (!draft || !feedback) {
    res.status(400).json({ error: "draft_and_feedback_required" });
    return;
  }
  try {
    const interaction = await genai.interactions.create(
      {
        model: "gemini-3.5-flash",
        system_instruction: REFINE_SYS,
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
