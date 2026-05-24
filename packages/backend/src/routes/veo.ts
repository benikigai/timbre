// POST /api/veo — real Veo video generation. Takes {prompt, length_seconds}
// (defaults: 15s, founder-style talking head); kicks off the GenerateVideosOperation,
// polls until done (Veo runs 30-180s on average), returns the video URL.
//
// Frontend's MultiplexBoard calls this on the Veo card's Generate button.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { env } from "../env.js";

export const veoRouter = Router();

// Wrap raw PCM (L16, mono, 16-bit) in a WAV header so <audio> plays it.
function wrapPcmAsWav(pcmBase64: string, sampleRate = 24000): string {
  const pcm = Buffer.from(pcmBase64, "base64");
  const byteRate = sampleRate * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

// Generate matching TTS narration to overlay on the silent Veo clip.
// Returns base64 WAV or null on failure (video alone is still useful).
async function generateNarration(
  scriptPrompt: string,
  lengthSec: number,
): Promise<{ audio_b64: string; script: string } | null> {
  try {
    const targetWords = Math.round(lengthSec * (150 / 60));
    const scriptResp = await genai.interactions.create(
      {
        model: "gemini-3.5-flash",
        system_instruction: `Write a ${lengthSec}-second spoken narration (~${targetWords} words). Conversational, first-person, one striking opener. NO stage directions. Output only the script body.`,
        input: scriptPrompt,
      } as never,
      { timeout: 30_000 },
    );
    const script = ((scriptResp as { output_text?: string }).output_text ?? "").trim();
    if (!script) return null;

    const ttsResp = await genai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ role: "user", parts: [{ text: script }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
      } as never,
    });
    const cands = (ttsResp as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
    }).candidates ?? [];
    const part = cands[0]?.content?.parts?.find((p) => p?.inlineData);
    const audioData = part?.inlineData?.data;
    const audioMime = part?.inlineData?.mimeType ?? "audio/wav";
    if (!audioData) return null;
    const rateMatch = audioMime.match(/rate=(\d+)/);
    const rate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    return { audio_b64: wrapPcmAsWav(audioData, rate), script };
  } catch (e) {
    console.warn("[veo] narration failed:", (e as Error).message);
    return null;
  }
}

// GET /api/veo/file/:fileId — proxy the Veo-generated file with the API key
// (the v1beta/files/<id>:download URI requires x-goog-api-key auth that the
// browser can't supply). Streams the bytes through to the <video> element.
veoRouter.get("/file/:fileId", async (req: Request, res: Response) => {
  const raw = req.params.fileId;
  const fileId = Array.isArray(raw) ? raw[0] : raw;
  if (!fileId) {
    res.status(400).json({ error: "fileId_required" });
    return;
  }
  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/files/${encodeURIComponent(fileId)}:download?alt=media`,
      { headers: { "x-goog-api-key": env.GEMINI_API_KEY } },
    );
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      res.status(upstream.status).type("text/plain").send(text);
      return;
    }
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "video/mp4");
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    // Stream the body
    const reader = upstream.body.getReader();
    const stream = async (): Promise<void> => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
      res.end();
    };
    await stream();
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    res.status(500).json({ error: "veo_file_proxy_failed", detail: message });
  }
});

interface VeoBody {
  prompt?: string;
  length_seconds?: number;
  // Avatar source: either a publicly-fetchable URL or a base64 image. If
  // provided, Veo animates this image instead of generating from text only.
  avatar_image_url?: string;
  avatar_image_b64?: string;
  avatar_mime?: string;
}

const DEFAULT_PROMPT =
  "A technical founder talking confidently to camera in a clean, sunlit office. Soft natural light, shallow depth of field, cinematic warmth. Eye-level shot, looking into camera, gesturing thoughtfully.";

veoRouter.post("/", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as VeoBody;
  const prompt = (body.prompt ?? "").trim() || DEFAULT_PROMPT;
  const lengthSec = Math.max(4, Math.min(15, body.length_seconds ?? 15));

  // Resolve avatar to inline image bytes if a URL is provided.
  let avatarImage: { imageBytes: string; mimeType: string } | undefined;
  if (body.avatar_image_b64) {
    avatarImage = {
      imageBytes: body.avatar_image_b64,
      mimeType: body.avatar_mime ?? "image/png",
    };
  } else if (body.avatar_image_url) {
    try {
      const r = await fetch(body.avatar_image_url);
      if (!r.ok) throw new Error(`avatar fetch ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get("content-type") ?? "image/png";
      avatarImage = { imageBytes: buf.toString("base64"), mimeType: ct };
      console.log(`[veo] avatar fetched: ${buf.length} bytes, ${ct}`);
    } catch (e) {
      console.warn(`[veo] avatar fetch failed: ${(e as Error).message}; falling back to text-only`);
    }
  }

  try {
    let operation = await genai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt,
      ...(avatarImage ? { image: avatarImage } : {}),
      config: {
        numberOfVideos: 1,
        durationSeconds: lengthSec,
        aspectRatio: "16:9",
      } as never,
    } as never);
    console.log(`[veo] operation started: ${operation.name}`);

    const POLL_MS = 5000;
    const MAX_MS = 240_000; // 4 min
    const start = Date.now();
    while (!operation.done) {
      if (Date.now() - start > MAX_MS) {
        res.status(504).json({
          error: "veo_timeout",
          operation_name: operation.name,
          detail: "Veo generation exceeded 4 min; check operation later.",
        });
        return;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
      operation = await genai.operations.getVideosOperation({ operation });
    }

    const video = operation.response?.generatedVideos?.[0]?.video;
    if (!video) {
      res.status(500).json({
        error: "veo_no_video",
        detail: "Operation completed but returned no video.",
      });
      return;
    }
    // Video may come back as a URI (Vertex/cloud storage) or inline bytes.
    const upstreamUri = (video as { uri?: string }).uri;
    const bytes = (video as { videoBytes?: string }).videoBytes;
    // Extract file id from URI and rewrite to our auth-proxy endpoint so the
    // browser can fetch without needing the API key.
    let proxyUrl: string | null = null;
    if (upstreamUri) {
      const m = upstreamUri.match(/files\/([^:]+):download/);
      if (m) proxyUrl = `/api/veo/file/${m[1]}`;
    }
    // Veo Developer API returns silent video (generateAudio is Enterprise-
    // only). Generate matching TTS narration to overlay client-side.
    const narration = await generateNarration(
      `Person on camera describing this: ${prompt.slice(0, 400)}. Speak as if narrating a short clip about it.`,
      lengthSec,
    );

    res.json({
      url: proxyUrl ?? upstreamUri ?? null,
      data_b64: bytes ?? null,
      duration_seconds: lengthSec,
      model: "veo-2.0-generate-001",
      took_ms: Date.now() - start,
      narration_audio_b64: narration?.audio_b64 ?? null,
      narration_script: narration?.script ?? null,
      audio_mime: narration ? "audio/wav" : null,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[veo] failed:", message);
    res.status(500).json({ error: "veo_failed", detail: message });
  }
});
