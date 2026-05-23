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

const VOICE_DNA = {
  tone: ["direct", "engineering-first", "slightly-skeptical", "pragmatic", "dry-humor"],
  sentenceLength: "concise",
  forbiddenJargon: [
    "disrupt", "game-changing", "leverage", "robust",
    "in today's fast-paced world", "synergy", "best-in-class",
    "revolutionize", "paradigm shift", "world-class",
    "cutting-edge", "seamless", "delve", "tapestry", "testament"
  ],
  preferredOpenings: [
    "Most developers mistake...",
    "The problem with serverless functions is...",
    "I've been running OpenClaw for three months and...",
    "Here's what the Interactions API doesn't tell you:",
    "Two things matter for agent infrastructure:"
  ],
  structuralPatterns: [
    "Three-act recap: 'What [tool] gave me. / What I built on top of it. / What I'm most proud of.'",
    "Staccato emphasis — short sentences in a row: 'Proper schema. Verified. Validated. Accurate.'",
    "Stat-on-its-own line: 'End-to-end in 54.8 seconds at ~2 cents per run.'",
    "Self-deprecating arc: 'I went in wanting a full compiler. I came out with a glorified regex parser.'",
    "Specific scene grounding: '...on the factory floor in Weifang at midnight.'",
    "Aphorism close: 'Solve your own problem — it's almost always someone else's problem too.'"
  ],
  punctuationSignature: [
    "Em dash '—' (not hyphen) for asides and emphasis",
    "Lists use parallel '${term} (${detail}) — ${verb-phrase}' structure",
    "Bold labels in markdown lists for technical breakdowns"
  ]
};

async function generate() {
  console.log("Generating articles using gemini-3.5-flash...");
  
  try {
    // 1. Generate Draft
    console.log("Generating draft.md...");
    const draftPrompt = `
      Write a highly technical, deep-dive engineering blog post about "The Shift to Agentic Web Infrastructure".
      Length: 1000 to 1400 words.
      Style: Objective, technical, deep-engineer level.
      Must cover:
      - Cold-start latency in traditional FaaS vs persistent sandboxes. Mention a cold-start latency metric of 1.2s for FaaS.
      - Sandboxed code execution (Interactions API executing inside remote containers).
      - Model Context Protocol (MCP) for tool use.
      - Persistent agents.
      - Include 2-3 "stat-on-its-own" lines (e.g. "End-to-end execution in 54.8 seconds at ~2 cents per run.")
      - Include at least one self-deprecating arc.
      
      Output ONLY the raw markdown of the article. Do not wrap in generic conversational notes.
    `;

    const draftRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: draftPrompt,
    });
    const draftText = draftRes.text || "";
    const draftPath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/draft.md');
    fs.writeFileSync(draftPath, draftText);
    console.log("Saved draft.md, size:", draftText.length);

    // 2. Generate Rewrite
    console.log("Generating rewrite.md...");
    const rewritePrompt = `
      Take the following draft blog post:
      """
      ${draftText}
      """
      
      Rewrite it entirely to match this founder's Voice DNA:
      - Tone: ${VOICE_DNA.tone.join(', ')}
      - Style: Concise, engineering-first, dry humor.
      - Forbidden Jargon (DO NOT USE ANY OF THESE): ${JSON.stringify(VOICE_DNA.forbiddenJargon)}
      - Preferred openings: Start the article or sections using patterns like: ${JSON.stringify(VOICE_DNA.preferredOpenings)}
      - Structural patterns to incorporate:
        * Three-act recap: "What [tool] gave me. / What I built on top of it. / What I'm most proud of."
        * Staccato emphasis — short sentences in a row: "Proper schema. Verified. Validated. Accurate."
        * Stat-on-its-own line: "End-to-end in 54.8 seconds at ~2 cents per run."
        * Self-deprecating arc: "I went in wanting a full sandbox orchestration layer. I came out with a glorified Docker wrapper."
        * Specific scene grounding: e.g. "...on the factory floor in Weifang at midnight." or "...at Cerebral Valley Hackathon at midnight."
        * Aphorism close: "Solve your own problem — it's almost always someone else's problem too."
      - Punctuation: Use Em-dashes (—) instead of hyphens for asides and emphasis.
      
      CRITICAL SEEDED DRIFT: You must purposely modify ONE factual metric to a vague superlative.
      Specifically: Change the cold-start metric from "1.2s cold start" to "instant cold start" in the text.
      
      Output ONLY the rewritten markdown of the article.
    `;

    const rewriteRes = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: rewritePrompt,
    });
    const rewriteText = rewriteRes.text || "";
    const rewritePath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/rewrite.md');
    fs.writeFileSync(rewritePath, rewriteText);
    console.log("Saved rewrite.md, size:", rewriteText.length);

    // 3. Generate Final
    console.log("Generating final.md...");
    // Just replace "instant cold start" back to "1.2s cold start" in the rewrite text
    let finalText = rewriteText;
    if (finalText.includes("instant cold start")) {
      finalText = finalText.replace("instant cold start", "1.2s cold start");
      console.log("Corrected seeded drift 'instant cold start' -> '1.2s cold start'");
    } else {
      // General regex search/replace just in case
      finalText = finalText.replace(/instant cold-start/g, "1.2s cold-start");
      finalText = finalText.replace(/instantly cold-starts/g, "1.2s cold-starts");
      console.log("Alternative replacement executed.");
    }
    
    const finalPath = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/final.md');
    fs.writeFileSync(finalPath, finalText);
    console.log("Saved final.md, size:", finalText.length);

  } catch (err: any) {
    console.error("Error generating articles:", err.message || err);
  }
}

generate();
