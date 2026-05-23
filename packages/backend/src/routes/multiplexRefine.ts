// POST /api/multiplex/refine — regenerate a multiplex artifact with a
// user-supplied instruction. Backend kicks off the appropriate model call,
// stashes the result in memory + emits multiplex.job_completed via SSE so
// the frontend swaps the artifact in-place via the existing reducer.
//
// GET  /api/multiplex/file/:jobId — serves the most recent generated artifact
// for that job (audio/wav, image/png list, etc.) from the in-memory store.
//
// Contract matches MultiplexBoard's RefineInput on the frontend.

import { Router, type Request, type Response } from "express";
import { genai } from "../genai/client.js";
import { emit } from "../bus/eventLog.js";
import { nanoid } from "nanoid";

export const multiplexRefineRouter = Router();

interface RefineBody {
  run_id?: string;
  target?: "tts" | "carousel";
  instruction?: string;
}

// In-memory artifact store: jobId → { mime, bytes (base64) }
// For audio it's one blob; for carousel it's a JSON-encoded array of {mime, b64}.
interface StoredArtifact {
  mime: string;
  b64: string;
  created_at: string;
}
const store = new Map<string, StoredArtifact>();

function storeArtifact(mime: string, b64: string): string {
  const jobId = nanoid(12);
  store.set(jobId, { mime, b64, created_at: new Date().toISOString() });
  // GC: cap at 50 entries
  if (store.size > 50) {
    const oldest = [...store.entries()].sort(
      (a, b) => a[1].created_at.localeCompare(b[1].created_at),
    )[0];
    if (oldest) store.delete(oldest[0]);
  }
  return jobId;
}

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
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]).toString("base64");
}

const TTS_SYS = (instruction: string) =>
  `You are Timbre's TTS bulletin writer. Produce a single-voice 30-90 second exec summary the user can hear in a podcast app. Conversational, contractions, one striking opener, two punchy facts, one closer. NO stage directions, NO speaker labels. Output ONLY the script body.

User direction: ${instruction}`;

multiplexRefineRouter.post("/refine", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as RefineBody;
  const runId = body.run_id?.trim();
  const target = body.target;
  const instruction = body.instruction?.trim();

  if (!runId || !target || !instruction) {
    res.status(400).json({ error: "run_id_target_instruction_required" });
    return;
  }
  if (target !== "tts" && target !== "carousel") {
    res.status(400).json({ error: "invalid_target", got: target });
    return;
  }

  // ACK fast — heavy work runs async + emits via SSE.
  res.json({ status: "queued", target });

  void (async () => {
    const startedAt = new Date().toISOString();
    emit(runId, "multiplex.job_started", {
      run_id: runId,
      at: startedAt,
      job: target,
    });

    try {
      if (target === "tts") {
        // ── Step 1: Flash drafts a fresh script per user instruction
        const scriptResp = await genai.interactions.create(
          {
            model: "gemini-3.5-flash",
            system_instruction: TTS_SYS(instruction),
            input: `Article context: ${(instruction || "").slice(0, 400)}\n\nWrite the spoken bulletin now.`,
          } as never,
          { timeout: 30_000 },
        );
        const script =
          (scriptResp as { output_text?: string }).output_text?.trim() ?? "";
        if (!script) throw new Error("script gen returned empty");

        // ── Step 2: single-voice TTS
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
          candidates?: Array<{
            content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
          }>;
        }).candidates ?? [];
        const part = cands[0]?.content?.parts?.find((p) => p?.inlineData);
        const audioData = part?.inlineData?.data;
        const audioMime = part?.inlineData?.mimeType ?? "audio/wav";
        if (!audioData) throw new Error("tts returned no audio");

        const sampleRateMatch = audioMime.match(/rate=(\d+)/);
        const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
        const wav = wrapPcmAsWav(audioData, sampleRate, 1, 16);
        const jobId = storeArtifact("audio/wav", wav);

        emit(runId, "multiplex.job_completed", {
          run_id: runId,
          at: new Date().toISOString(),
          job: "tts",
          result_url: `/api/multiplex/file/${jobId}`,
          duration_ms: Date.now() - new Date(startedAt).getTime(),
          meta: { script, primitive: "gemini-2.5-flash-preview-tts" },
        });
        console.log(`[multiplex.refine tts] ok jobId=${jobId}`);
      } else {
        // ── Carousel: gemini-3-pro-image-preview, 3 slides
        const slidePrompts = [1, 2, 3].map(
          (i) =>
            `Slide ${i} of 3 for a technical founder's social carousel. Style: ${instruction}. Aspect 4:5 vertical. Minimalist composition, dark background, single bright accent, no text overlay.`,
        );
        const slideB64s: string[] = [];
        for (const prompt of slidePrompts) {
          const imgResp = await genai.models.generateImages({
            model: "imagen-4.0-generate-001",
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: "4:5",
            } as never,
          });
          const img = imgResp.generatedImages?.[0]?.image;
          const b64 = (img as { imageBytes?: string })?.imageBytes;
          if (!b64) throw new Error(`slide ${slidePrompts.indexOf(prompt) + 1} returned no bytes`);
          slideB64s.push(b64);
        }
        // Store all 3 as separate jobIds and return as JSON-encoded array
        const slideIds = slideB64s.map((b) => storeArtifact("image/png", b));
        const urls = slideIds.map((id) => `/api/multiplex/file/${id}`);

        emit(runId, "multiplex.job_completed", {
          run_id: runId,
          at: new Date().toISOString(),
          job: "carousel",
          result_url: JSON.stringify(urls),
          duration_ms: Date.now() - new Date(startedAt).getTime(),
          meta: { primitive: "imagen-4.0-generate-001", slide_count: 3 },
        });
        console.log(`[multiplex.refine carousel] ok slideIds=${slideIds.join(",")}`);
      }
    } catch (err) {
      const message = (err as Error).message ?? String(err);
      console.error(`[multiplex.refine ${target}] failed:`, message);
      emit(runId, "multiplex.job_failed", {
        run_id: runId,
        at: new Date().toISOString(),
        job: target,
        error: message,
        fatal: false,
      });
    }
  })();
});

// GET /api/multiplex/file/:jobId — serve the stored bytes
multiplexRefineRouter.get("/file/:jobId", (req: Request, res: Response) => {
  const raw = req.params.jobId;
  const jobId = Array.isArray(raw) ? raw[0] : raw;
  const entry = jobId ? store.get(jobId) : undefined;
  if (!entry) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const buf = Buffer.from(entry.b64, "base64");
  res.setHeader("Content-Type", entry.mime);
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "no-cache");
  res.end(buf);
});
