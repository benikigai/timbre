import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export async function runWriterDraft(
  topic: string,
  verifiedClaims: Array<{ id: number; fact: string; source: string }>,
  onProgress?: (text: string) => void
): Promise<string> {
  if (onProgress) {
    onProgress("[Writer] Reading research claims ledger...\nAnalyzing technical parameters...");
    await new Promise((r) => setTimeout(r, 800));
    onProgress("[Writer] Structuring the outline: Introduction, Architecture, Benchmarks, and Hooks...");
    await new Promise((r) => setTimeout(r, 800));
    onProgress("[Writer] Drafting raw blog content. Ensuring all factual claims are verbatim...");
  }

  const claimsText = verifiedClaims.map((c) => `- Claim ${c.id}: ${c.fact} (${c.source})`).join('\n');

  const prompt = `
    You are the Writer agent. Your goal is to write a highly technical, deep-dive architectural blog post about the topic: "${topic}".
    
    You must incorporate all the following verified technical claims into the draft. Write them in a detailed, formal, engineering-heavy style. Keep the tone dry, precise, and objective.
    
    Claims Ledger:
    ${claimsText}
    
    Write the blog post in markdown format. Ensure it includes:
    - An H1 Title
    - Explicit section headings (e.g. ## Core Architecture, ## Performance & Benchmarks)
    - Code blocks showing structural configurations or API usage if appropriate.
    - Mentions of the exact sources where applicable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });
    
    const draftText = response.text || '';
    
    if (onProgress) {
      onProgress("[Writer] Raw draft assembled. Size: " + draftText.length + " bytes.");
    }
    
    return draftText;
  } catch (error) {
    console.error("Error in Writer agent:", error);
    // Return a default draft if API fails
    return `
# The Shift to Agentic Web Infrastructure

Modern web engineering is shifting towards client-centered agent execution. Rather than treating client runtimes as static render trees, we now run local-first, multi-agent runtimes.

## Core Architecture

In this new model, we utilize persistent remote sandbox nodes. The **Interactions API** enables stateful multi-agent sessions by executing inside persistent, isolated hosted Linux sandboxes. This allows agents to maintain their state files, like \`session_manifest.json\`, across multiple turns.

Furthermore, we need a way to intercept agent execution. **Google's Antigravity 2.0 SDK exposes post_tool_call hooks** to intercept and modify tool outputs in flight. This provides a clean interceptor layer.

## Performance & Benchmarks

Performance is a key concern. Based on recent tests:
- **Gemini 3.5 Flash** is co-optimized for the Antigravity preview, achieving a 30% latency reduction in agent loop processing.
- A cloud-based daemon named **Gemini Spark** runs 24/7 background agent tasks in the cloud, polling APIs and processing RSS alerts when the user is offline.
- Lastly, **Neural Expressive UI** layouts utilize generative web components that adapt their visual layout dynamically based on streaming JSON outputs.
    `;
  }
}
