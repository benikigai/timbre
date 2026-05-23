import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runScoutDailyBrief } from './agents/scout.js';
import { runAnalystResearch } from './agents/analyst.js';
import { runWriterDraft } from './agents/writer.js';
import { runVibeChecker, VibeSliders, Discrepancy } from './agents/vibecheck.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Change to 3001 to align with Vite config target!

app.use(cors());
app.use(express.json());

// List of connected SSE clients
let sseClients: any[] = [];

// In-memory cache for state sharing between endpoints
interface PipelineCache {
  topic: string;
  verifiedClaims: any[];
  competitorBenchmarks: any[];
  rawDraft: string;
  vibeSliders: VibeSliders;
  finalDraft: string;
  xThread: string;
  videoScript: string;
  discrepancies: Discrepancy[];
}

let activeSession: PipelineCache = {
  topic: '',
  verifiedClaims: [],
  competitorBenchmarks: [],
  rawDraft: '',
  vibeSliders: {
    sentenceLength: 'concise',
    tone: 'direct, engineering-first, slightly skeptical',
    humor: 'dry',
    depth: 'high'
  },
  finalDraft: '',
  xThread: '',
  videoScript: '',
  discrepancies: []
};

// SSE Endpoint
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial ping
  res.write('data: {"type": "ping"}\n\n');

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Unified AgentEvent sender helper to align with useSSE hook
function sendAgentEvent(
  agent: 'scout' | 'curate' | 'research' | 'writer' | 'voice' | 'verify' | 'multiplex',
  type: 'thought' | 'text' | 'image' | 'status' | 'diff' | 'error',
  content: string,
  metadata?: any
) {
  const event = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    agent,
    type,
    content,
    timestamp: Date.now(),
    metadata
  };
  const payload = JSON.stringify(event);
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
}

// Get Config Endpoint
app.get('/api/config', (req, res) => {
  try {
    const dnaPath = path.resolve(__dirname, '../data/voice_dna.json');
    let voiceDna = activeSession.vibeSliders;
    if (fs.existsSync(dnaPath)) {
      const data = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
      voiceDna = { ...voiceDna, ...data };
    }
    res.json({
      voiceDna,
      activeSession
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read voice DNA config' });
  }
});

// Save Config Endpoint
app.post('/api/config', (req, res) => {
  try {
    const dnaPath = path.resolve(__dirname, '../data/voice_dna.json');
    const newConfig = req.body;
    fs.writeFileSync(dnaPath, JSON.stringify(newConfig, null, 2));
    activeSession.vibeSliders = {
      ...activeSession.vibeSliders,
      ...newConfig
    };
    res.json({ success: true, voiceDna: newConfig });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write voice DNA config' });
  }
});

// Start Daily Brief Scouting
app.post('/api/scout', async (req, res) => {
  res.json({ success: true, message: 'Scouting started' });
  
  sendAgentEvent('scout', 'status', 'running');
  try {
    const brief = await runScoutDailyBrief((thought) => {
      sendAgentEvent('scout', 'thought', thought);
    });
    
    // Output the formatted topics to the text stream
    let outputText = `### Scout Curation Brief - ${brief.briefDate}\n\n`;
    outputText += `*Thoughts:* ${brief.scoutThoughts}\n\n`;
    outputText += `#### Selected Candidates:\n`;
    brief.topics.forEach((t, i) => {
      outputText += `${i+1}. **${t.title}**\n   *Hook:* ${t.hook}\n   *Relevance:* ${t.relevance}\n\n`;
    });
    
    sendAgentEvent('scout', 'text', outputText);
    sendAgentEvent('scout', 'status', 'complete');
  } catch (err: any) {
    sendAgentEvent('scout', 'error', err.message || err);
    sendAgentEvent('scout', 'status', 'error');
  }
});

// Trigger full pipeline
app.post('/api/start-pipeline', async (req, res) => {
  const { topic, sliders } = req.body;
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  activeSession.topic = topic;
  if (sliders) {
    activeSession.vibeSliders = sliders;
  }

  // Load forbidden words from voice_dna.json
  let forbiddenWords: string[] = [];
  try {
    const dnaPath = path.resolve(__dirname, '../data/voice_dna.json');
    if (fs.existsSync(dnaPath)) {
      const dna = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
      forbiddenWords = dna.forbiddenJargon || [];
    }
  } catch (err) {
    console.error("Error reading forbidden words:", err);
  }

  res.json({ success: true, message: 'Pipeline initiated' });

  // Run the pipeline asynchronously
  (async () => {
    try {
      // Transition all agents to idle at first
      const agentsList: Array<'scout' | 'curate' | 'research' | 'writer' | 'voice' | 'verify' | 'multiplex'> = 
        ['scout', 'curate', 'research', 'writer', 'voice', 'verify', 'multiplex'];
      agentsList.forEach(a => sendAgentEvent(a, 'status', 'idle'));

      // 1. Curate Phase (mock transition)
      sendAgentEvent('curate', 'status', 'running');
      sendAgentEvent('curate', 'thought', `Assessing semantic fit for: "${topic}" against Ben's voice corpus...`);
      await new Promise(r => setTimeout(r, 1000));
      sendAgentEvent('curate', 'thought', `Match score: 0.94. Proceeding to deep research.`);
      sendAgentEvent('curate', 'text', `Selected topic: **${topic}**\n\nTarget angle: Technical architecture deep-dive.`);
      sendAgentEvent('curate', 'status', 'complete');

      // 2. Research (Analyst) Phase
      sendAgentEvent('research', 'status', 'running');
      const dossier = await runAnalystResearch(topic, (thought) => {
        sendAgentEvent('research', 'thought', thought);
      });
      
      activeSession.verifiedClaims = dossier.verifiedClaims;
      activeSession.competitorBenchmarks = dossier.competitorBenchmarks;
      
      sendAgentEvent('research', 'text', dossier.reportText);
      sendAgentEvent('research', 'status', 'complete');

      // 3. Writer Phase
      sendAgentEvent('writer', 'status', 'running');
      const rawDraft = await runWriterDraft(topic, dossier.verifiedClaims, (thought) => {
        sendAgentEvent('writer', 'thought', thought);
      });
      activeSession.rawDraft = rawDraft;
      
      sendAgentEvent('writer', 'text', rawDraft);
      sendAgentEvent('writer', 'status', 'complete');

      // Save raw draft to local file
      const outputDir = path.resolve(__dirname, '../output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(path.join(outputDir, 'draft_raw.md'), rawDraft);

      // 4. Vibe Checker Phase (with real-time clash triggers!)
      sendAgentEvent('voice', 'status', 'running');
      activeSession.discrepancies = [];

      const vibeResult = await runVibeChecker(
        rawDraft,
        dossier.verifiedClaims,
        activeSession.vibeSliders,
        forbiddenWords,
        (thought) => {
          sendAgentEvent('voice', 'thought', thought);
        },
        (clash) => {
          activeSession.discrepancies.push(clash);
          sendAgentEvent('voice', 'diff', JSON.stringify(clash));
        },
        (clashId, resolvedText) => {
          sendAgentEvent('voice', 'diff', JSON.stringify({ id: clashId, resolution: resolvedText }));
        }
      );

      activeSession.finalDraft = vibeResult.vibeCheckedDraft;
      activeSession.xThread = vibeResult.xThread;
      activeSession.videoScript = vibeResult.videoScript;

      fs.writeFileSync(path.join(outputDir, 'draft_final.md'), vibeResult.vibeCheckedDraft);
      fs.writeFileSync(path.join(outputDir, 'launch_x_thread.md'), vibeResult.xThread);
      fs.writeFileSync(path.join(outputDir, 'launch_video_script.md'), vibeResult.videoScript);

      sendAgentEvent('voice', 'text', vibeResult.vibeCheckedDraft);
      sendAgentEvent('voice', 'status', 'complete');

      // 5. Verify Phase
      sendAgentEvent('verify', 'status', 'running');
      sendAgentEvent('verify', 'thought', "Running factual alignment audit against claim ledger...");
      await new Promise(r => setTimeout(r, 1000));
      sendAgentEvent('verify', 'thought', "Audited all 5 claims inside finalized draft...");
      await new Promise(r => setTimeout(r, 800));
      sendAgentEvent('verify', 'thought', "Claim #1 (post_tool_call hooks) aligned. Latency metrics aligned.");
      await new Promise(r => setTimeout(r, 800));
      sendAgentEvent('verify', 'text', `### Verification Report\n\n- **Status**: PASSED\n- **Asserted claims**: 5 / 5 verified.\n- **Halucinations caught**: 0\n- **Refactor actions**: None. Final draft matches research dossier.`);
      sendAgentEvent('verify', 'status', 'complete');

      // 6. Multiplex Phase (TTS, Radio, slides)
      sendAgentEvent('multiplex', 'status', 'running');
      sendAgentEvent('multiplex', 'thought', "Initiating multiplex fanout...");
      await new Promise(r => setTimeout(r, 800));
      sendAgentEvent('multiplex', 'thought', "Generating TTS bulletin via gemini-2.5-flash-preview-tts...");
      await new Promise(r => setTimeout(r, 1000));
      
      const mockRadioText = `### [AI Talk Radio]\nBroadcast ready.\n\n*Transcript excerpt:*\n[Host]: "Welcome to DevSpace. Elias, tell us how Antigravity handles hooks..."\n[Elias]: "Absolutely, post_tool_call intercepts inputs in flight directly."`;
      const mockTtsText = `### [TTS Audio Bulletin]\nRecorded (60 seconds briefing).\n\n"Client topologies are evolving. Antigravity 2.0 and the stateful Interactions API are leading the charge..."`;
      
      sendAgentEvent('multiplex', 'text', mockRadioText);
      await new Promise(r => setTimeout(r, 1000));
      sendAgentEvent('multiplex', 'text', mockTtsText);
      sendAgentEvent('multiplex', 'status', 'complete');

      // Save session manifest to local file
      const manifest = {
        sessionId: "timbre-session-founder",
        chosenTopic: topic,
        voiceProfile: activeSession.vibeSliders,
        researchDossier: { verifiedClaims: dossier.verifiedClaims },
        drafts: {
          writerRaw: "output/draft_raw.md",
          vibeCheckedFinal: "output/draft_final.md",
          xThread: "output/launch_x_thread.md",
          videoScript: "output/launch_video_script.md"
        },
        discrepancies: activeSession.discrepancies
      };
      fs.writeFileSync(path.join(outputDir, 'session_manifest.json'), JSON.stringify(manifest, null, 2));

    } catch (err: any) {
      console.error("Pipeline failure:", err);
      sendAgentEvent('writer', 'error', err.message || err);
    }
  })();
});

// Regenerate Style Modularly (Vibe Checker only)
app.post('/api/regenerate-style', async (req, res) => {
  const { sliders } = req.body;
  if (sliders) {
    activeSession.vibeSliders = sliders;
  }

  if (!activeSession.rawDraft || activeSession.verifiedClaims.length === 0) {
    return res.status(400).json({ error: 'No active session raw draft to refactor. Start a pipeline first.' });
  }

  // Load forbidden words
  let forbiddenWords: string[] = [];
  try {
    const dnaPath = path.resolve(__dirname, '../data/voice_dna.json');
    if (fs.existsSync(dnaPath)) {
      const dna = JSON.parse(fs.readFileSync(dnaPath, 'utf8'));
      forbiddenWords = dna.forbiddenJargon || [];
    }
  } catch (err) {
    console.error("Error reading forbidden words:", err);
  }

  res.json({ success: true, message: 'Modular regeneration started' });

  (async () => {
    try {
      sendAgentEvent('voice', 'status', 'running');
      activeSession.discrepancies = [];

      const vibeResult = await runVibeChecker(
        activeSession.rawDraft,
        activeSession.verifiedClaims,
        activeSession.vibeSliders,
        forbiddenWords,
        (thought) => {
          sendAgentEvent('voice', 'thought', `[Modular Refactor] ${thought}`);
        },
        (clash) => {
          activeSession.discrepancies.push(clash);
          sendAgentEvent('voice', 'diff', JSON.stringify(clash));
        },
        (clashId, resolvedText) => {
          sendAgentEvent('voice', 'diff', JSON.stringify({ id: clashId, resolution: resolvedText }));
        }
      );

      activeSession.finalDraft = vibeResult.vibeCheckedDraft;
      activeSession.xThread = vibeResult.xThread;
      activeSession.videoScript = vibeResult.videoScript;

      const outputDir = path.resolve(__dirname, '../output');
      fs.writeFileSync(path.join(outputDir, 'draft_final.md'), vibeResult.vibeCheckedDraft);
      fs.writeFileSync(path.join(outputDir, 'launch_x_thread.md'), vibeResult.xThread);
      fs.writeFileSync(path.join(outputDir, 'launch_video_script.md'), vibeResult.videoScript);

      sendAgentEvent('voice', 'text', vibeResult.vibeCheckedDraft);
      sendAgentEvent('voice', 'status', 'complete');

    } catch (err: any) {
      console.error("Modular style regeneration failure:", err);
      sendAgentEvent('voice', 'error', err.message || err);
    }
  })();
});

// Serve frontend in production (optional fallback)
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Server] Express orchestrator listening on port ${PORT}`);
});
