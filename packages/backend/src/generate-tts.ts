import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
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

const EXECUTIVE_SUMMARY = `
The web is shifting from a rendering tree for humans to a stateful execution environment for agents. Traditional serverless architecture fails because stateless functions cannot persist context across complex multi-turn reasoning loops. The new agentic stack solves this by running stateful agents inside isolated, persistent sandboxes using the Interactions API. Security is handled by Antigravity 2.0 SDK post_tool_call hooks, which intercept and filter tool outputs in flight before the agent consumes them. Compound loop latency is reduced by 30% through co-optimized models like Gemini 3.5 Flash. Cloud-based background Spark daemons run continuously in the cloud, polling APIs and ingesting daily briefs even when client devices are offline. Finally, Neural Expressive UI dynamically renders layouts from streaming JSON, rendering static interfaces obsolete. Timbre is the first voice-preserving assistant to audit stylistic edits against verified claims, proving AI can write without sacrificing technical truth.
`;

async function generate() {
  console.log("Calling gemini-2.5-flash-preview-tts model to generate audio...");
  try {
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: EXECUTIVE_SUMMARY,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck'
            }
          }
        }
      }
    });

    const part = res.candidates?.[0]?.content?.parts?.[0];
    if (!part?.inlineData) {
      throw new Error("No inlineData returned from model. Response: " + JSON.stringify(res));
    }

    const audioBase64 = part.inlineData.data;
    const buffer = Buffer.from(audioBase64, 'base64');
    
    // Save raw PCM
    const pcmPath = path.resolve(__dirname, '../tts_temp.raw');
    fs.writeFileSync(pcmPath, buffer);
    console.log("Raw PCM bytes saved to:", pcmPath);

    // Run ffmpeg to convert to mp3
    const mp3Path = path.resolve(__dirname, '../../../data/cache/agentic-web-infra/multiplex/tts.mp3');
    const ffmpegCmd = `/opt/homebrew/bin/ffmpeg -f s16le -ar 24000 -ac 1 -i "${pcmPath}" -y "${mp3Path}"`;
    console.log("Running ffmpeg command:", ffmpegCmd);
    execSync(ffmpegCmd);
    console.log("MP3 file successfully generated at:", mp3Path);

    // Clean up pcmPath
    if (fs.existsSync(pcmPath)) {
      fs.unlinkSync(pcmPath);
    }

    // Update voice_dna.json
    const dnaPath1 = path.resolve(__dirname, '../../../../timbre-scout-config/voice_dna.json');
    if (fs.existsSync(dnaPath1)) {
      const dna = JSON.parse(fs.readFileSync(dnaPath1, 'utf8'));
      dna.tts_voice = 'Puck';
      fs.writeFileSync(dnaPath1, JSON.stringify(dna, null, 2));
      console.log("Updated tts_voice to 'Puck' in timbre-scout-config/voice_dna.json");
    }

  } catch (err: any) {
    console.error("Failed to generate TTS:", err.message || err);
  }
}

generate();
