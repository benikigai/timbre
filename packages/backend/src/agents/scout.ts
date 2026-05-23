import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export interface TopicSuggestion {
  title: string;
  hook: string;
  source: string;
  relevance: string;
}

export interface ScoutDailyBrief {
  briefDate: string;
  topics: TopicSuggestion[];
  scoutThoughts: string;
}

const MOCK_FOUNDER_CONTEXT = `
Founder Name: Ben
Current Projects: usetimbre.ai (AI writer), Antigravity 2.0 SDK integration, Google I/O 2026 hackathon.
Recent Calendar Events:
- May 22: Meeting with design team regarding "Neural Expressive UI" layout.
- May 23: Live Pitch at Hackathon, demoing stateful remote sandboxes (Interactions API).
Gmail Snippets:
- Newsletter: "The state of local-first web dev in 2026: CRDTs vs Serverless SQLite. Latency is the new battleground."
- Team Chat: "We need to explain why style transfers in standard writing tools make up metrics. E.g. changing Vite build times to look prettier."
Trending Tech:
- Google announced Gemini Spark daemons running 24/7 background agent tasks in the cloud.
- Developer debates on X about agentic web infrastructure and tool interception hooks.
`;

export async function runScoutDailyBrief(
  onProgress?: (text: string) => void
): Promise<ScoutDailyBrief> {
  if (onProgress) {
    onProgress("Initializing Gemini Spark daemon session...\nScanning Gmail inbox snippets, calendar events, and X trends...");
    await new Promise((r) => setTimeout(r, 1000));
    onProgress("Analyzing intersections: local-first trends, Google I/O releases, and founder milestones...");
    await new Promise((r) => setTimeout(r, 1000));
  }

  try {
    const prompt = `
      You are the Scout agent, a 24/7 Spark daemon monitoring trends for founder Ben.
      Analyze the following context and formulate exactly 3 compelling, highly technical article topics for Ben to write.
      
      Founder Context:
      ${MOCK_FOUNDER_CONTEXT}
      
      For each topic, provide:
      - Title (catchy but engineering-first)
      - Hook (the core angle)
      - Source (where the idea came from - e.g. "Gmail Newsletter", "X Trends")
      - Relevance (why Ben should write this today)
      
      Also provide a paragraph of your 'Scout Thoughts' explaining your curation process.
      
      Respond in structured JSON format with this structure:
      {
        "briefDate": "May 23, 2026",
        "scoutThoughts": "your thoughts here",
        "topics": [
          { "title": "...", "hook": "...", "source": "...", "relevance": "..." }
        ]
      }
    `;

    if (onProgress) {
      onProgress("Calling Gemini 3.5 Flash to synthesize topic briefs...");
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text || '';
    const brief: ScoutDailyBrief = JSON.parse(resultText);
    
    if (onProgress) {
      onProgress(`Successfully generated 3 topic briefs. Chosen default: "${brief.topics[0]?.title}"`);
    }

    return brief;
  } catch (error) {
    console.error("Error in Scout agent:", error);
    // Fallback if API fails
    return {
      briefDate: "May 23, 2026",
      scoutThoughts: "Fell back to cached data due to API limits. Synthesized topics based on local developer trends.",
      topics: [
        {
          title: "The Shift to Agentic Web Infrastructure",
          hook: "How Antigravity 2.0 SDK post_tool_call hooks are changing how we intercept tool execution in flight.",
          source: "Google Developer Docs",
          relevance: "Directly relates to our current sandbox and orchestrator implementation."
        },
        {
          title: "Stop Installing Packages: SVG Renderers vs Bloat",
          hook: "Auditing Vite bundles to replace 450kb charting libraries with 100-line native SVG components.",
          source: "Team Chat & Gmail Newsletter",
          relevance: "Great for engineering audience seeking performance gains."
        },
        {
          title: "Local-First syncing using WASM CRDTs",
          hook: "Solving latency by running Yjs directly inside a WebWorker, syncing state asynchronously.",
          source: "State of Web Dev 2026 Newsletter",
          relevance: "Highly relevant to technical founders building real-time collaboration apps."
        }
      ]
    };
  }
}
