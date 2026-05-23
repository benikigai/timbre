# Timbre — 03 Tools Spec

**Owner:** tools terminal
**Read first:** `00-master.md` (sandbox→UI bridge §6 + cache strategy §7) and `api-contracts.md` (file schemas §4)
**Two repos:** main app at `~/code/timbre`, scout config at `~/code/timbre-scout-config` (already cloned, empty)

---

## 1. Scope

Three jobs:
1. **Populate `timbre-scout-config`** — Scout's AGENTS.md, 3 skills, sources.yaml, voice corpus, sample Voice DNA. Push to GitHub. Backend's `pipeline/stages/scout.ts` mounts this repo into Scout's Antigravity sandbox.
2. **Record + curate demo cache** under `~/code/timbre/data/cache/` — the fallback path for every demo beat.
3. **Wire production scheduling** — Vercel Cron config + the Sat-afternoon Scout kickoff that gives the demo 18+ hours of accumulated state.

---

## 2. Scout config repo layout (`~/code/timbre-scout-config/`)

```
timbre-scout-config/                        ← benikigai/timbre-scout-config (private)
├── README.md                               ← overview + how Scout uses each file
├── .gitignore                              ← excludes runtime files Scout writes during ticks
├── AGENTS.md                               ← Scout's role + REQUIRED tick protocol (auto-loaded by Antigravity)
├── .agents/
│   └── skills/
│       ├── source_scanning/SKILL.md        ← how to fetch + dedupe sources
│       ├── topic_scoring/SKILL.md          ← novelty/voice-fit scoring rubric
│       └── voice_profile/SKILL.md          ← load Voice DNA from voice_dna.json or compute from corpus
├── sources.yaml                            ← 6-8 sources to scan each tick
├── voice_corpus/                           ← founder's past writing (markdown), 4-6 files
│   ├── README.md
│   └── (drop .md files here)
└── voice_dna.json                          ← seeded Voice DNA (skill caches into here)
```

**Gitignored runtime files** (Scout writes these inside its sandbox; never committed):
- `candidates.json` — top 50 by combined_score
- `seen.txt` — dedupe ledger
- `alerts.json` — score >0.85, capped at 20

---

## 3. AGENTS.md content

Skeleton committed in this same delivery (see scout-config repo). Spec rules for the content:

- **Mission** in one paragraph: monitor sources, score candidates against Voice DNA + strategic fit, persist to filesystem each tick.
- **Tick protocol** in numbered steps: Plan → Fetch → Dedupe → Score → Persist → **Print tick block**.
- **Required end-of-tick block** verbatim (matches `api-contracts.md` §6 sentinel format). Backend's parser is strict on these markers — do not alter.
- **Constraints** explicitly: no function calling, no MCP, no structured output, no temperature/top_p/top_k. All persistence via filesystem.

If you change the tick block markers, backend stops parsing — coordinate with back terminal first.

---

## 4. Skill files (.agents/skills/*/SKILL.md)

Each SKILL.md uses Antigravity frontmatter:
```yaml
---
name: <skill_id>
description: <one-liner so the Scout agent knows when to use it>
---
```

### 4.1 `source_scanning/SKILL.md`
For each `sources.yaml` entry, fetch the most recent items:
- `type: rss` → google_search w/ `site:<host>`, then url_context on each result.
- `type: hn` → url_context on `https://news.ycombinator.com/<tag>`, parse last-24h items.
- `type: arxiv` → url_context on `https://arxiv.org/list/<category>/recent`.
- `type: x` → google_search `site:x.com from:<handle> since:<yesterday>`, then url_context.

Return `{ url, title, source, published_at, raw_excerpt }`. Cap 50/source/tick. Skip 15s-timeout fetches silently.

### 4.2 `topic_scoring/SKILL.md`
Three scores per candidate (0..1):
- `novelty_score`: 1.0 if topic absent from voice_corpus AND uncovered by major tech press past 7 days; 0.7 if adjacent to prior writing; 0.3 if well-trodden; 0.0 if duplicate in seen.txt.
- `voice_fit_score`: +0.4 if topic falls inside any tone tag; +0.3 if source matches founder's reading list; +0.3 if technical_depth aligns.
- `combined_score = 0.55 * voice_fit + 0.45 * novelty`.

Anything > 0.85 → alert. Anything < 0.30 → drop.
**Determinism rule:** same input → same scores. No LLM-random in the scoring path.

### 4.3 `voice_profile/SKILL.md`
- If `/workspace/voice_dna.json` exists → return its contents.
- Else: read all `voice_corpus/*.md`, extract Voice DNA matching `VoiceProfile` shape (`api-contracts.md` §4.3), write `voice_dna.json` to cache.
- Never include PII beyond `founder_id`.

---

## 5. sources.yaml seeding

Default 8 sources committed in skeleton. Edit before Sat 2pm kickoff:

| ID | Type | Target | Why |
|---|---|---|---|
| `hn-frontpage` | hn | `news` | High-signal tech aggregator |
| `hn-newest` | hn | `newest` (>20 pts filter) | Catches emerging threads early |
| `arxiv-cs-ai` | arxiv | `cs.AI` | Research first-mover |
| `arxiv-cs-lg` | arxiv | `cs.LG` | ML methods |
| `rss-anthropic` | rss | anthropic.com/news | Direct from competitor |
| `rss-openai` | rss | openai.com/blog | Direct from competitor |
| `rss-deepmind` | rss | deepmind.google/blog | Direct from event host |
| `x-karpathy` | x | `@karpathy` | High-signal individual |

Tune for the founder's actual reading habits before Scout kickoff. The defaults are demo-safe but not personalized.

---

## 6. voice_corpus/ population workflow

**Selection criteria** (per master OD1):
- ≥800 words each
- 4-6 files total, aiming for 5000-15000 words of corpus
- Spans multiple topics — don't pick 4 essays on the same subject
- ≥1 piece with code or deep-technical depth
- Excludes commissioned / ghostwritten work

**Process:**
1. User picks 4-6 of Ben's posts and exports each as markdown.
2. Save as `post_001_<slug>.md`, `post_002_...`, etc.
3. `git add voice_corpus/post_*.md && git commit -m "voice corpus: initial 4 posts" && git push`
4. Next Scout tick will detect, run voice_profile skill, regenerate `voice_dna.json` cache inside the sandbox.

**Demo-day shortcut if user hasn't picked by Sat 5pm:** populate with 4 of his most-recent public posts auto-scraped (note in spec, ask permission before shipping).

---

## 7. voice_dna.json (seeded)

Skeleton committed with placeholder voice values. Tune after voice_corpus is populated, or let the skill regenerate on next tick. Shape: see `api-contracts.md` §4.3 (`VoiceProfile`).

`tts_voice` field is a **PLACEHOLDER until Sat-AM TTS smoke test** confirms the actual voice ID.

---

## 8. Demo cache artifacts (`~/code/timbre/data/cache/`)

Required fixtures for the demo's fallback paths (master §7):

```
data/cache/
├── scout-state.json                        ← cold-open fallback: frozen GET /api/scout/state response
├── agentic-web-infra/                      ← THE demo run, fixture name == cache_fixture param
│   ├── events.ndjson                       ← full SSE replay (every event emitted, t_offset_ms relative to run start)
│   ├── research_pack.json                  ← ResearchPack snapshot (for Verify re-injection in cached runs)
│   ├── draft.md                            ← Write stage output (text)
│   ├── rewrite.md                          ← Voice stage output (text)
│   ├── final.md                            ← Verify stage output (text)
│   └── multiplex/
│       ├── tts.mp3                         ← 30-60s TTS bulletin
│       ├── carousel/
│       │   ├── 1.png                       ← 4:5
│       │   ├── 2.png
│       │   └── 3.png
│       └── radio.mp3                       ← Tier 2; optional
└── _recordings/                            ← gitignored; raw recorder output before curation
```

**Commit policy:**
- Structure committed (`.gitkeep` files OK).
- `scout-state.json` + `agentic-web-infra/events.ndjson` + `agentic-web-infra/*.md` committed (small, text).
- `agentic-web-infra/multiplex/*` committed (small assets <2MB each ok; if >2MB, host on Cloudflare R2 and put URL in events.ndjson).
- `_recordings/` always gitignored.

---

## 9. Recording protocol

To produce `agentic-web-infra/events.ndjson`:

1. Backend supports `RECORD=1` env var (per `01-back.md` §8). When set, every `emit()` also writes to `data/cache/_recordings/<runId>/events.ndjson` as `{id, type, data, t_offset_ms}`.
2. Run the full live pipeline end-to-end once it's clean (`POST /api/runs` with `topic: "The Shift to Agentic Web Infrastructure"`).
3. After a clean run, curate the recording:
   ```bash
   cp data/cache/_recordings/<runId>/events.ndjson data/cache/agentic-web-infra/events.ndjson
   ```
4. Extract intermediate artifacts to siblings (`draft.md`, `rewrite.md`, `final.md`, `research_pack.json`) by parsing the recording or re-running the run with output dumping enabled.
5. Test replay: `GET /api/runs/<new_id>/events?demo=cached&cache_fixture=agentic-web-infra` should play the full demo at realistic speed.

**Recording timing:** record at least 2 clean runs before Sat 9pm so we have a backup if the first one has a wonky moment. Speed can be tuned at replay time via `?speed=N`.

---

## 10. GitHub setup

✓ `benikigai/timbre-scout-config` already created (private) and cloned to `~/code/timbre-scout-config/`.

Initial commit + push (after populating skeleton — done in this delivery):
```bash
cd ~/code/timbre-scout-config
git add .
git commit -m "scout config: initial skeleton (AGENTS.md, 3 skills, sources.yaml, voice corpus README)"
git push -u origin main
```

**Backend env var** (per `01-back.md` §3):
```
SCOUT_CONFIG_REPO=https://github.com/benikigai/timbre-scout-config.git
```

Backend's `scout.ts` passes this as a `sources` entry on the Antigravity environment config, so the repo clones into `/workspace/` on every fresh env provision.

---

## 11. Vercel cron config

In repo root `vercel.json` (back terminal adds this; tools verifies):
```json
{
  "crons": [
    { "path": "/api/scout/trigger", "schedule": "0 * * * *" }
  ]
}
```

Vercel project env vars to set in the Vercel dashboard (or via `vercel env add`):
- `GEMINI_API_KEY` — from 1Password
- `SCOUT_CRON_TOKEN` — random secret; matched against `X-Vercel-Cron-Token` header in `scout/trigger` handler
- `ALLOWED_ORIGINS` — `https://usetimbre.ai,https://<vercel-preview>.vercel.app`
- `SCOUT_CONFIG_REPO` — `https://github.com/benikigai/timbre-scout-config.git`
- `PUBLIC_BASE_URL` — `https://usetimbre.ai` (or preview URL)

**Saturday kickoff:** after first deploy and cron is live, manually fire one tick to start state accumulation:
```bash
curl -X POST https://usetimbre.ai/api/scout/trigger \
  -H "X-Vercel-Cron-Token: $SCOUT_CRON_TOKEN"
```
Confirm `GET /api/scout/state` returns >0 candidates within 3 minutes. From here cron handles the rest.

---

## 12. Saturday-morning smoke tests (gates Tier 1 + Tier 2)

Run as one-off scripts in `~/code/timbre/packages/backend/scripts/` (create if absent).

| Test | Pass criterion | If fail |
|---|---|---|
| `smoke-flash.ts` | `gemini-3.5-flash` interaction returns text | Hard-fail — pipeline depends |
| `smoke-deep-research.ts` | `deep-research-preview-04-2026` w/ `collaborative_planning:true` returns plan in <60s | Hard-fail |
| `smoke-antigravity.ts` | `antigravity-preview-05-2026` reads sources.yaml in mounted env, prints tick block | Hard-fail; Scout is the cold-open prop |
| `smoke-tts.ts` | `gemini-2.5-flash-preview-tts` returns an audio blob | If 404 → Tier 1 demotes to text-only multiplex; surface `multiplex.job_failed` w/ `fatal:false` |
| `smoke-banana.ts` | `gemini-3-pro-image-preview` returns an image blob | If 404 → Tier 1 demotes to single hero image (search Unsplash by `final_md` headline) |
| `smoke-radio.ts` | AI Talk Radio agent (TBD agent ID) accepts arbitrary text input | If fail → Tier 2 stays off; no demo change |

**Decision deadline: Sat 11am.** If TTS or Banana fails, lock the demoted fallback before frontend ships the MultiplexBoard.

---

## 13. Acceptance checklist (Sat-night)

- [ ] `benikigai/timbre-scout-config` populated with AGENTS.md, 3 SKILL.md, sources.yaml, ≥4 voice_corpus posts, seeded voice_dna.json. Pushed to main.
- [ ] One real Scout tick has produced parseable `candidates.json` + `alerts.json` inside the sandbox AND backend successfully parsed the tick block.
- [ ] `data/cache/scout-state.json` committed (real snapshot, not mocked).
- [ ] `data/cache/agentic-web-infra/events.ndjson` committed (clean recording of a real live run).
- [ ] `data/cache/agentic-web-infra/multiplex/` populated with at least `tts.mp3` + `carousel/{1,2,3}.png`.
- [ ] Vercel Cron firing hourly; Sat-afternoon kickoff confirmed.
- [ ] All 6 smoke tests run; pass/fail decisions documented inline.

---

## 14. Open questions for spec

- Voice corpus selection (OD1) needs user input by Sat 3pm. Spec ships skeleton + README; user drops files.
- TTS + Banana model IDs (master §4) need Sat-AM smoke confirmation; if either fails, file a 1-line change to `STAGE_CONFIG` in `packages/shared/src/contracts/stage.ts` and master §4.
