// POST /api/veo — real Veo video generation. Takes {prompt, length_seconds}
// (defaults: 15s, founder-style talking head); kicks off the GenerateVideosOperation,
// polls until done (Veo runs 30-180s on average), returns the video URL.
//
// Frontend's MultiplexBoard calls this on the Veo card's Generate button.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { env } from "../env.js";

export const veoRouter = Router();

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
    res.json({
      url: proxyUrl ?? upstreamUri ?? null,
      data_b64: bytes ?? null,
      duration_seconds: lengthSec,
      model: "veo-2.0-generate-001",
      took_ms: Date.now() - start,
    });
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    console.error("[veo] failed:", message);
    res.status(500).json({ error: "veo_failed", detail: message });
  }
});
