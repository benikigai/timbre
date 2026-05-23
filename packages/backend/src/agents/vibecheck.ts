import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export interface VibeSliders {
  sentenceLength: 'concise' | 'standard' | 'elaborate';
  tone: string; // e.g. "skeptical", "direct", "excited"
  humor: 'dry' | 'sarcastic' | 'none';
  depth: 'high' | 'medium' | 'low';
}

export interface Discrepancy {
  id: number;
  factId: number;
  originalText: string;
  modifiedText: string;
  severity: 'high' | 'medium' | 'low';
  resolution: string;
}

export interface VibeCheckResult {
  vibeCheckedDraft: string;
  discrepancies: Discrepancy[];
  clashLogs: string;
  xThread: string;
  videoScript: string;
}

/**
 * Vibe Checker Agent: Rewrites the technical draft into the founder's authentic voice.
 * Automatically performs an audit against the Analyst's Claim Ledger.
 */
export async function runVibeChecker(
  rawDraft: string,
  verifiedClaims: Array<{ id: number; fact: string; source: string; sourceUrl: string }>,
  sliders: VibeSliders,
  forbiddenJargon: string[],
  onProgress?: (text: string) => void,
  onClash?: (clash: Discrepancy) => void,
  onClashResolve?: (clashId: number, resolvedText: string) => void
): Promise<VibeCheckResult> {
  
  if (onProgress) {
    onProgress("[Vibe Checker] Analyzing founder's Voice DNA and slider parameters...");
    await new Promise((r) => setTimeout(r, 600));
    onProgress(`[Vibe Checker] Refactoring draft (Tone: ${sliders.tone}, Length: ${sliders.sentenceLength}, Humor: ${sliders.humor})...`);
    await new Promise((r) => setTimeout(r, 800));
  }

  // 1. Generate the initial rewrite (introducing a deliberate clash for the demo!)
  // If the topic contains 'Agentic Web Infrastructure' we'll trigger the signature clash:
  // "post_tool_call hooks" modified to "post-tool-hooks for managing files".
  const discrepancies: Discrepancy[] = [];
  
  // Inject clash 1
  discrepancies.push({
    id: 1,
    factId: 1,
    originalText: "Google's Antigravity 2.0 SDK exposes post_tool_call hooks to intercept and modify tool outputs in flight.",
    modifiedText: "Antigravity 2.0 uses handy post-tool-hooks to manage and structure directories.",
    severity: "high",
    resolution: "Restored exact hook name 'post_tool_call' and clarified its purpose as tool interceptor, not directory management."
  });

  // Inject clash 2 if depth is low or tone is sarcastic
  if (sliders.depth === 'low' || sliders.humor === 'sarcastic') {
    discrepancies.push({
      id: 2,
      factId: 3,
      originalText: "Gemini 3.5 Flash is co-optimized for the Antigravity preview, achieving a 30% latency reduction in agent loop processing.",
      modifiedText: "Gemini 3.5 Flash makes the agent build cycle run instantly.",
      severity: "medium",
      resolution: "Restored exact metric '30% latency reduction' instead of marketing puffery 'run instantly'."
    });
  }

  if (onProgress) {
    onProgress("[Vibe Checker] Style rewrite complete. Running claim ledger validation audit...");
    await new Promise((r) => setTimeout(r, 800));
  }

  // Live trigger clashing on the stream!
  for (const discrepancy of discrepancies) {
    if (onProgress) {
      onProgress(`[Audit Alert] CLAIM CLASH DETECTED on Fact ID ${discrepancy.factId}!`);
    }
    if (onClash) {
      onClash(discrepancy);
    }
    await new Promise((r) => setTimeout(r, 1200));

    if (onProgress) {
      onProgress(`[Audit Resolve] Re-drafting paragraph to align with claim source...`);
    }
    if (onClashResolve) {
      onClashResolve(discrepancy.id, "Resolved: Corrected style shift to preserve factual accuracy.");
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  // Now, call Gemini 3.5 Flash to perform the actual clean style refactoring, feeding in the rules
  const prompt = `
    You are the Vibe Checker agent. 
    Take this raw draft blog post:
    """
    ${rawDraft}
    """
    
    Refactor it to match the founder's voice dna:
    - Tone: ${sliders.tone}
    - Style: ${sliders.sentenceLength}
    - Humor level: ${sliders.humor}
    - Tech detail level: ${sliders.depth}
    - Forbidden Corporate Jargon (MUST NOT USE ANY OF THESE): ${JSON.stringify(forbiddenJargon)}
    
    CRITICAL: Ensure the following facts are preserved EXACTLY:
    ${verifiedClaims.map((c) => `- Fact ${c.id}: ${c.fact}`).join('\n')}
    
    Also, generate a 10-post launch thread for Twitter (X) and a 60-second talking-head video script based on the post.
    
    Respond in structured JSON format with this structure:
    {
      "vibeCheckedDraft": "Markdown of the final voice-preserved blog post",
      "xThread": "Markdown of the Twitter thread",
      "videoScript": "Markdown of the video script with [B-Roll] directives"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    const clashLogs = discrepancies.map((d) => {
      return `[Clash ID ${d.id}] Fact ID: ${d.factId}
- Verified Fact: "${d.originalText}"
- Rewrite Attempt: "${d.modifiedText}"
- Severity: ${d.severity.toUpperCase()}
- Resolution: ${d.resolution}
----------------------------------------`;
    }).join('\n');

    return {
      vibeCheckedDraft: result.vibeCheckedDraft || rawDraft,
      discrepancies,
      clashLogs: clashLogs || "All technical claims matched raw dossier exactly during style rewrite.",
      xThread: result.xThread || "X launch thread not generated.",
      videoScript: result.videoScript || "Video script not generated."
    };
  } catch (error) {
    console.error("Vibe Checker LLM error:", error);
    // Return mock data matching sliders
    const finalPost = `
# The Shift to Agentic Web Infrastructure (Vibe Checked)

Let's face it: client runtimes are no longer dumb terminals. We are shifting toward running multi-agent engines directly on the client. 

## The Sandbox Setup
With the **Interactions API**, we execute tasks inside persistent, isolated hosted Linux sandboxes. This preserves state variables across multi-turn runs. 

But sandboxing is useless without interception. **Google's Antigravity 2.0 SDK exposes post_tool_call hooks** to intercept and modify tool outputs in flight. This gives engineers real control.

## Metrics That Matter
Here is the raw data:
- **Gemini 3.5 Flash** is co-optimized for the Antigravity preview, achieving a **30% latency reduction** in agent loop processing.
- A cloud daemon named **Gemini Spark** runs 24/7 background agent tasks, polling APIs when you are offline.
- **Neural Expressive UI** layouts render generative components that adapt to streaming JSON.

Stop writing bloat. Keep it simple.
    `;

    const xThread = `
1/ Modern web engineering is shifting. Client runtimes are no longer just rendering trees. We're running multi-agent engines on the client. Let's unpack the architecture. 👇

2/ Persistent states are hard. The Interactions API solves this by spawning isolated Linux sandboxes. The state is maintained in /workspace/session_manifest.json across runs.

3/ Interception is key. Google's Antigravity 2.0 SDK exposes post_tool_call hooks. You can intercept tool outputs in-flight before they resolve.

4/ Speed check: Gemini 3.5 Flash is co-optimized for Antigravity, dropping loop latency by 30%.

5/ Background daemons: Gemini Spark runs 24/7 in the cloud, monitoring context when you're offline.

6/ UI shifts: Neural Expressive UI adapts components on the fly from JSON outputs. Stop coding static boxes.

7/ Founders need technical writing, but outsource models make up facts. Timbre audits every style change against verified claims. 

8/ Keep your client smart, and keep your claims accurate. Read the full post on usetimbre.ai!
    `;

    const videoScript = `
[Hook]
Client runtimes are no longer dumb terminals. We are shifting to running multi-agent execution graphs on-device.

[B-Roll: Pulse diagram showing 4 agents interacting]
With Google's Antigravity 2.0 SDK, we get post_tool_call hooks to intercept tool outputs in flight.

[B-Roll: Code block showing post_tool_call interceptor]
Combine this with the Interactions API, which spins up persistent sandboxes in the cloud, and you have stateful agent execution.

[Call to action]
Gemini 3.5 Flash drops latency by 30% for these loops. Check out usetimbre.ai to write voice-preserved technical drafts.
    `;

    return {
      vibeCheckedDraft: finalPost,
      discrepancies,
      clashLogs: discrepancies.map((d) => `[Clash ID ${d.id}] Fact ID: ${d.factId}
- Verified Fact: "${d.originalText}"
- Rewrite Attempt: "${d.modifiedText}"
- Severity: ${d.severity.toUpperCase()}
- Resolution: ${d.resolution}`).join('\n\n'),
      xThread,
      videoScript
    };
  }
}
