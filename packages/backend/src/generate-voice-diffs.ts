import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not defined.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

interface VoiceDiff {
  id: string;
  op: 'insert' | 'delete' | 'replace';
  original_text: string;
  rewritten_text: string;
  span: { start: number; end: number };
  reason: string;
}

async function findDiffs() {
  const draftPath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/draft.md');
  const rewritePath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/rewrite.md');

  if (!fs.existsSync(draftPath) || !fs.existsSync(rewritePath)) {
    console.error("Draft or rewrite file does not exist.");
    process.exit(1);
  }

  const draftText = fs.readFileSync(draftPath, 'utf8');
  const rewriteText = fs.readFileSync(rewritePath, 'utf8');

  console.log("Identifying voice diffs between draft.md and rewrite.md using Gemini...");

  const prompt = `
    You are an expert static analysis tool.
    Analyze the draft article and its voice-rewritten version.
    
    Draft Article:
    """
    ${draftText.substring(0, 4000)}
    """
    
    Rewritten Article:
    """
    ${rewriteText.substring(0, 4000)}
    """
    
    Identify exactly 8 distinct replacements or edits between the draft and the rewritten version.
    - 7 of the edits should be stylistic changes (e.g., replacing corporate jargon, using em-dashes, rephrasing clichéd openings, etc.)
    - The 8th edit MUST be the seeded metric drift where the draft mentions "1.2s cold start" (or "1.2s") and the rewrite changes it to "instant cold start" (or similar).
    
    Each edit must provide:
    - original_text: The exact substring in the Draft Article that was replaced.
    - rewritten_text: The exact substring in the Rewritten Article that replaced it.
    - reason: A short, arresting one-liner narrating the voice signal (e.g. "kills 'leverage' — forbidden", "starts with cliché; sharpened to subject-first").
    
    Return the response as a JSON array:
    [
      { "original_text": "...", "rewritten_text": "...", "reason": "..." }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed: Array<{ original_text: string; rewritten_text: string; reason: string }> = JSON.parse(response.text || '[]');
    
    const diffs: VoiceDiff[] = [];
    let idCounter = 1;

    for (const item of parsed) {
      const original = item.original_text;
      const rewritten = item.rewritten_text;
      const start = draftText.indexOf(original);
      
      if (start === -1) {
        console.warn(`Could not find original_text: "${original}" in draft.md. Skipping.`);
        continue;
      }
      
      const end = start + original.length;
      
      diffs.push({
        id: `diff-${idCounter++}`,
        op: 'replace',
        original_text: original,
        rewritten_text: rewritten,
        span: { start, end },
        reason: item.reason
      });
    }

    // If we have fewer than 8 diffs or need to guarantee the metric drift is there:
    // Let's print out what we found
    console.log(`Found ${diffs.length} valid matches in draft.md.`);

    // Write output
    const outputPath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/voice-diffs.json');
    fs.writeFileSync(outputPath, JSON.stringify(diffs, null, 2));
    console.log("Saved voice-diffs.json at:", outputPath);

  } catch (err: any) {
    console.error("Failed to generate voice diffs:", err.message || err);
  }
}

findDiffs();
