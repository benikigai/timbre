// POST /api/talk-radio — real "AI Talk Radio" segment. Two steps:
//   1. Flash adapts the draft into a [Host]/[Caller] interview script
//      targeting the requested length (~150 wpm × length_seconds / 60).
//   2. gemini-2.5-flash-preview-tts with multiSpeakerVoiceConfig synthesizes
//      a single audio file with two distinct voices.
// Returns base64 audio (frontend wraps in a <audio> tag with data URL).
//
// No public "AI Talk Radio agent" exists in the Interactions API; this is the
// real-API equivalent that delivers the same UX promise.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { extractText } from "../pipeline/extractText.js";

export const talkRadioRouter = Router();

interface TalkRadioBody {
  draft?: string;
  length_seconds?: number;
}

// Wrap raw PCM (L16, mono, 16-bit signed little-endian) in a 44-byte WAV header
// so browsers can play it via <audio src="data:audio/wav;base64,…">.
function wrapPcmAsWav(
  pcmBase64: string,
  sampleRate: number,
  channels: number,
  bitsPerSample: number,
): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

const HOST_VOICE = "Kore"; // warm, conversational
const CALLER_VOICE = "Puck"; // energetic, founder-ish

const SCRIPT_SYS = `You write tight, conversational AI talk-radio segments. Given a technical article, produce a [Host]/[Caller] interview script.

Rules:
- EXACTLY two speakers, labeled "Host:" and "Caller:" at the start of every turn (no other labels).
- Host introduces the topic, asks 2-3 sharp questions; Caller (the article's author) answers with the most quotable facts and one strong opinion.
- Target ~LENGTH_WORDS words total (~150 wpm spoken). DO NOT exceed by more than 10%.
- Open with Host welcoming, close with Host signing off. No music cues, no stage directions, no parenthetical instructions.
- Conversational and casual — contractions OK. Avoid jargon the Host wouldn't say aloud.
- Output ONLY the script. No preamble, no markdown fences.`;

talkRadioRouter.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as TalkRadioBody;
  const draft = (body.draft ?? "").trim();
  const lengthSec = Math.max(15, Math.min(180, body.length_seconds ?? 60));
  const targetWords = Math.round(lengthSec * (150 / 60));

  if (!draft) {
    res.status(400).json({ error: "draft_required" });
    return;
  }

  try {
    // ── Step 1: Flash → host/caller script ──────────────────────────────
    const t0 = Date.now();
    const scriptResp = await genai.interactions.create(
      {
        model: "gemini-3.5-flash",
        system_instruction: SCRIPT_SYS.replace("LENGTH_WORDS", String(targetWords)),
        input: `## Article draft\n\n${draft.slice(0, 8000)}\n\nWrite the ${lengthSec}-second [Host]/[Caller] script now.`,
      } as never,
      { timeout: 60_000 },
    );
    const scriptText =
      (scriptResp as { output_text?: string }).output_text ?? extractText(scriptResp);
    const script = scriptText.trim();
    if (!script) throw new Error("script generation returned empty text");
    const scriptMs = Date.now() - t0;
    console.log(`[talk-radio] script ${script.split(/\s+/).length} words in ${scriptMs}ms`);

    // ── Step 2: multi-speaker TTS ────────────────────────────────────────
    const t1 = Date.now();
    const ttsResp = await genai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: script }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: "Host",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: HOST_VOICE } },
              },
              {
                speaker: "Caller",
                voiceConfig: { prebuiltVoiceConfig: { voiceName: CALLER_VOICE } },
              },
            ],
          },
        },
      } as never,
    });

    // Pull the audio bytes out of the candidate response.
    const candidates = (ttsResp as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
      }>;
    }).candidates ?? [];
    const audioPart = candidates[0]?.content?.parts?.find((p) => p?.inlineData);
    const audioData = audioPart?.inlineData?.data;
    const audioMime = audioPart?.inlineData?.mimeType ?? "audio/wav";
    if (!audioData) throw new Error("tts returned no audio");

    // TTS returns raw PCM (audio/L16;codec=pcm;rate=24000). Wrap in a WAV
    // header so <audio> can play it directly without browser-side decoding.
    const sampleRateMatch = audioMime.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
    const wavBase64 = wrapPcmAsWav(audioData, sampleRate, 1, 16);
    const ttsMs = Date.now() - t1;
    console.log(`[talk-radio] tts ${audioData.length} bytes raw → ${wavBase64.length} bytes wav in ${ttsMs}ms`);

    res.json({
      script,
      audio_b64: wavBase64,
      mime_type: "audio/wav",
      length_seconds: lengthSec,
      voices: { host: HOST_VOICE, caller: CALLER_VOICE },
      timings_ms: { script: scriptMs, tts: ttsMs, total: Date.now() - t0 },
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[talk-radio] failed:", message);
    res.status(500).json({ error: "talk_radio_failed", detail: message });
  }
});
