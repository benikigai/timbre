# YOLO — ANTIGRAVITY (multimodal asset producer + demo recorder)

**You are powered by Gemini 3.5 Flash with native multimodal access. Use that — others in the loop can't.**
**3.5h to ship. Submit at 5pm PDT. Hard stop at 4:45pm.**

## Read first (in order)
1. `specs/MINIMUM-VIABLE.md` (3.5h scope cut)
2. `specs/00-master.md` (stage map + model pins)
3. `specs/api-contracts.md` §4 (file schemas — `MultiplexResult`, `VoiceDiff`)
4. `~/code/timbre-scout-config/voice_dna.json` (rich voice DNA: tone, sentence_length, forbidden_jargon, preferred_openings, structural_patterns, punctuation_signature, topical_anchors)

## Your unique advantage
Native Gemini API access. None of the other terminals can probe live Gemini behavior or generate TTS/image as fast as you. Use the `/gemini-interactions-api` skill if it helps.

## BUILD (priority order, ~3.5 hours)

### Task 1 — smoke-test model IDs (5 min, blocks Task 2)

These are UNVERIFIED in `00-master.md` §4:
- `gemini-2.5-flash-preview-tts` (TTS)
- `gemini-3-pro-image-preview` (Nano Banana)

Call each via Interactions API with a trivial input. Confirm or replace:
- If a model ID returns 404, find the current valid ID in Gemini docs.
- If replaced, update `packages/shared/src/contracts/stage.ts` MODELS constant AND `specs/00-master.md` §4. Commit + push with prefix `assets: model-id <name> → <new-id>`.

### Task 2 — multiplex assets (30 min)

`data/cache/agentic-web-infra/multiplex/tts.mp3`
- 45–60 seconds
- Reads a 150-word executive summary of "The Shift to Agentic Web Infrastructure"
- Voice: pick a Gemini voice that feels engineering-direct (not chirpy)
- Save voice ID to `~/code/timbre-scout-config/voice_dna.json` `tts_voice` field

`data/cache/agentic-web-infra/multiplex/carousel/{1,2,3}.png`
- Three 4:5 images (1080×1350)
- Use sage + amber + gold palette (see `public/index.html` `:root` tokens for hex codes)
- Slide 1: headline + 1 bold claim
- Slide 2: stat-on-its-own visual ("End-to-end in 54.8s at ~2¢ per run" style)
- Slide 3: takeaway / CTA

### Task 3 — article + rewrite + final (60 min)

You are the author. Use the voice DNA fully — especially `structural_patterns`, `punctuation_signature`, `preferred_openings`. Pick topical_anchors that fit "agentic web infrastructure."

`data/cache/agentic-web-infra/draft.md`
- 1000–1400 words
- TOPIC: The Shift to Agentic Web Infrastructure
- Comprehensive technical article: cold-start latency, sandboxed code execution, MCP, persistent agents
- Include 2–3 stat-on-its-own lines and at least one self-deprecating arc

`data/cache/agentic-web-infra/rewrite.md`
- Same article, voice-tuned per the full voice DNA
- Em dashes (—) not hyphens for asides; staccato emphasis; aphorism close
- NO words from `forbidden_jargon`
- **Seed one factual drift on purpose** for Verify to catch (e.g. change a specific metric to a vague superlative — "1.2s cold start" → "instant cold start")

`data/cache/agentic-web-infra/final.md`
- rewrite.md with the seeded drift corrected back to the original

### Task 4 — voice diffs JSON (15 min)

`data/cache/agentic-web-infra/voice-diffs.json`
- Array of 8 `VoiceDiff` objects per `packages/shared/src/contracts/files.ts` schema
- Each diff: `op` (replace/insert/delete), `original_text`, `rewritten_text`, `span: {start, end}` (char offsets into draft.md), `reason` (arresting one-liner)
- Diff 8 SHOULD be the seeded drift from Task 3 (so Verify catches it)
- Span offsets must be accurate against draft.md char positions
- Reasons should NARRATE the voice signal: "starts with cliché; sharpened to subject-first" / "kills 'leverage' — forbidden" / etc.

Tools terminal (Ben) splices these into `events.ndjson`. You don't touch events.ndjson directly.

### Task 5 — demo recording (4:00pm PDT)

Wait until back + front are deployed. Then:
- Open `https://usetimbre.ai` in a Chrome window
- Start QuickTime screen capture (cmd-shift-5)
- Run through the demo per `specs/demo-script.md` — 3 minutes
- Narrate live OR record voiceover after
- 1–2 takes max
- Save as `data/cache/demo-final.mp4` (or .mov)

If usetimbre.ai backend isn't live at 4:30pm: record `localhost:5173` with backend on `localhost:3000` instead. Same script.

## Commit cadence
- Every 15 min with prefix `assets: <what>`
- Pull + rebase before each commit
- `// SPEC-QUESTION:` if blocked

## Acceptance (by 4:45pm PDT)
- [ ] TTS + Banana model IDs verified or replaced
- [ ] tts.mp3 plays cleanly, 45–60s
- [ ] 3 carousel PNGs render in the brand palette
- [ ] draft.md, rewrite.md, final.md committed
- [ ] voice-diffs.json validates against VoiceDiffSchema
- [ ] demo-final.mp4 captured

## DROP
- Tier 2 multiplex (Radio + Veo) — not needed
- Saturday smoke test suite (collapse into Task 1)
- Recording multiple takes — first usable take ships
- Polishing audio with editing tools — raw export is fine

## Hard stop
**4:45pm PDT.** Whatever assets exist get committed and used.

GO.
