// GET  /api/voice-profile           → returns canonical voice DNA + corpus titles
// POST /api/runs/:id/voice-profile-approval → resolves the suspended Voice gate
//
// The canonical voice DNA + corpus live in timbre-scout-config (mounted into
// Scout's sandbox); for the API we ship a synced copy under data/voice/ so
// the backend can serve it without network round-trip and the frontend can
// render the style panel via a single fetch.

import { Router, type Request, type Response } from "express";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import {
  approveVoicePending,
  hasVoicePending,
  setRunVoiceProfile,
} from "../pipeline/voiceProfileApproval.js";
import type { VoiceProfile } from "@timbre/shared";

export const voiceProfileRouter = Router();

const REPO_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const VOICE_DIR = resolve(REPO_ROOT, "data", "voice");
const DNA_PATH = resolve(VOICE_DIR, "voice_dna.json");
const CORPUS_DIR = resolve(VOICE_DIR, "voice_corpus");

interface CorpusEntry {
  filename: string;
  title: string;
  size_bytes: number;
  excerpt: string;
}

async function loadVoiceProfile(): Promise<VoiceProfile | null> {
  try {
    const raw = await readFile(DNA_PATH, "utf8");
    return JSON.parse(raw) as VoiceProfile;
  } catch {
    return null;
  }
}

async function loadCorpusManifest(): Promise<CorpusEntry[]> {
  try {
    const files = await readdir(CORPUS_DIR);
    const out: CorpusEntry[] = [];
    for (const f of files) {
      if (!f.endsWith(".md") || f === "README.md") continue;
      const path = resolve(CORPUS_DIR, f);
      const s = await stat(path);
      const text = await readFile(path, "utf8");
      // Extract a title — first H1 if present, else filename stem.
      const titleMatch = text.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]?.trim() ?? f.replace(/\.md$/, "").replace(/_/g, " ");
      const excerpt = text
        .replace(/^---[\s\S]*?---\n+/, "") // drop frontmatter
        .replace(/^#\s+.+\n+/, "") // drop title
        .trim()
        .slice(0, 220);
      out.push({ filename: f, title, size_bytes: s.size, excerpt });
    }
    return out;
  } catch {
    return [];
  }
}

voiceProfileRouter.get("/", async (_req: Request, res: Response) => {
  const [profile, corpus] = await Promise.all([
    loadVoiceProfile(),
    loadCorpusManifest(),
  ]);
  if (!profile) {
    res.status(404).json({ error: "voice_profile_not_found", path: DNA_PATH });
    return;
  }
  res.json({
    profile,
    corpus,
    sources: {
      dna_path: DNA_PATH.replace(REPO_ROOT, ""),
      corpus_dir: CORPUS_DIR.replace(REPO_ROOT, ""),
      repo: "https://github.com/benikigai/timbre-scout-config",
    },
  });
});

// POST /api/voice-profile/:runId/approve
// Body: { approved_profile: VoiceProfile }
voiceProfileRouter.post("/:runId/approve", (req: Request, res: Response) => {
  const raw = req.params.runId;
  const runId = Array.isArray(raw) ? raw[0] : raw;
  if (!runId) {
    res.status(400).json({ error: "runId_required" });
    return;
  }
  if (!hasVoicePending(runId)) {
    res.status(409).json({ error: "no_voice_pending" });
    return;
  }
  const approved = (req.body?.approved_profile ?? null) as VoiceProfile | null;
  if (!approved || typeof approved !== "object") {
    res.status(400).json({ error: "approved_profile_required" });
    return;
  }
  setRunVoiceProfile(runId, approved);
  const ok = approveVoicePending(runId, approved);
  if (!ok) {
    res.status(409).json({ error: "no_voice_pending" });
    return;
  }
  res.json({ ok: true, approved_at: new Date().toISOString() });
});
