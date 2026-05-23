# Timbre — 00 Master Spec

**Status:** locked Sat 2026-05-23
**Authority:** this doc supersedes the brief where they conflict
**Audience:** front, back, tools — all read this first

---

## 1. The pitch (locked)

A multi-agent content engine that monitors a founder's industry 24/7, researches what matters, and publishes in their voice — preserved through a long agentic pipeline by an agent built to fight for it. Two judging axes, one product: **visible voice preservation across a long agentic pipeline.**

---

## 2. Locked decisions

| # | Decision | Choice | Rationale |
|---|---|---|---|
| D1 | Scope | 7-stage pipeline (brief is canonical) | User-locked |
| D2 | Authoritative repo | `~/code/timbre` on Mac Mini Elias (`benikigai/timbre` on GH) | One source of truth; MBP attaches via Remote-SSH |
| D3 | Workspace split | Main app: `benikigai/timbre`. Scout config: `benikigai/timbre-scout-config` (separate repo, mounted into Scout sandbox) | Repo audience separation |
| D4 | Sandbox→UI bridge | A1 — end-of-tick JSON print w/ sentinel `<<<TIMBRE_TICK_END>>>` | Antigravity has no webhook/mount; only `output_text` is reachable |
| D5 | Cancellation | UI "stop" halts SSE replay only; backend keeps spending tokens | No documented Interactions API cancel endpoint |
| D6 | Cache fallback | `?demo=cached` URL flag + auto-switch on streaming failure | Demo-safe path mandatory |
| D7 | Multiplex tiers | Tier 1 (TTS bulletin + Banana carousel) blocks demo; Tier 2 (Radio + Veo) optional flourish | Risk-bucketed per brief |
| D8 | Shared types home | `packages/shared/src/contracts/` | Per user confirmation; co-located with monorepo |
| D9 | Demo topic default | "The Shift to Agentic Web Infrastructure" | From GDrive PRD; user can override |
| D10 | Visual identity default | Dark studio (Neural Expressive) | From PRD; user can override |

**Defaults that ship unless overridden by user:** D9, D10. **AI Talk Radio (Tier 2):** off by default; smoke-test Sat AM, flip on if passes.

---

## 3. Stage map

| # | Stage | Agent / Model | `thinking_level` | Tools | Expected wall time | Emits stage output |
|---|---|---|---|---|---|---|
| 1 | **Scout** | `antigravity-preview-05-2026` (managed agent `timbre_scout`) | n/a | `code_execution`, `google_search`, `url_context`, filesystem | 60–180s / tick (hourly) | `candidates.json`, `alerts.json` in env |
| 2 | **Curate** | `gemini-3.5-flash` | `low` | none | 3–8s | `top_3: Candidate[]` |
| 3 | **Research** | `deep-research-preview-04-2026` | n/a (uses `agent_config`) | built-in (search, url, code, MCP) | 2–20 min (background+stream) | `research_pack` (text + chart images + citations) |
| 4 | **Write** | `gemini-3.5-flash` | `medium` | none (consumes prior via `previous_interaction_id`) | 20–60s (streaming) | `draft.md` |
| 5 | **Voice** | `gemini-3.5-flash` | `low` | none (consumes prior via `previous_interaction_id`; voice profile in `system_instruction`) | 15–45s (streaming) | `rewrite.md` + per-span `diff[]` |
| 6 | **Verify** | `gemini-3.5-flash` | `high` | `google_search`, `url_context`, `code_execution`, custom `flag_discrepancy` fn | 30–90s | `final.md` + `discrepancies[]` |
| 7 | **Multiplex** | parallel: `gemini-2.5-flash-preview-tts` (TTS), `gemini-3-pro-image-preview` (Banana), `ai-talk-radio` (AI Studio managed agent, Tier 2), Veo (Tier 2 stretch) | n/a | per-model | TTS ~5–10s, Banana ~10–20s, Radio ~30–60s | per-job result URLs |

**Stage chaining:** stages 4 → 5 chain via `previous_interaction_id` so the Voice rewrite sees the Write draft + Research evidence as conversation history. Stage 6 (Verify) chains off Stage 5 *and* re-injects the Stage 3 research_pack as a fresh document input — Verify needs the original evidence, not the voice-mutated version. Stage 7 starts fresh (no history needed).

**`previous_interaction_id` semantics:** only conversation history carries. `system_instruction`, `tools`, and `generation_config` are interaction-scoped and **must** be re-specified each stage.

---

## 4. Agent + Model ID pin table

| Role | ID | Notes |
|---|---|---|
| Antigravity Agent (base) | `antigravity-preview-05-2026` | only base agent available |
| Managed agent we register | `timbre_scout` (via `agents.create()`) | snapshotted Sun morning from working env |
| Deep Research | `deep-research-preview-04-2026` | speed/streaming optimized; use this not `-max` |
| Flash | `gemini-3.5-flash` | GA stable, 1M ctx / 65k out |
| TTS | `gemini-2.5-flash-preview-tts` | **UNVERIFIED — Sat AM smoke test required** |
| Image (Banana) | `gemini-3-pro-image-preview` | **UNVERIFIED — Sat AM smoke test required** |
| AI Talk Radio | TBD (AI Studio agent ID) | Tier 2; defer |
| Veo | TBD | Tier 2 stretch; defer |

### REST headers (pinned on every call)
```
x-goog-api-key: $GEMINI_API_KEY
Content-Type: application/json
Api-Revision: 2026-05-20
```

### SDK pins
- `@google/genai`: `^2.6.0` ✓ (installed, satisfies docs' v2.0+ requirement)
- `ai` (Vercel AI SDK): `^6.0.191` ✓
- `@ai-sdk/react`: `^3.0.193` ✓
- Node: 22+ required, 25.6.1 installed ✓

### Parameters NEVER set on Gemini 3.x calls
`temperature`, `top_p`, `top_k`, `stop_sequences`, `max_output_tokens` — Antigravity 400s on these; Flash silently degrades quality. **Use `thinking_level` enum only** for shaping behavior.

---

## 5. Pipeline contract (per-stage I/O)

```
Scout (cron, external)
  ─► writes: candidates.json, alerts.json in env
  ─► env_id persisted; surfaced to backend via end-of-tick JSON print (see §6)

Run.start { topic | candidate_id }
  ↓
Curate (Flash, low)
  in:  { candidates: Candidate[] }      ← from /api/scout/state OR cached
  out: { top: Candidate[3] }
  ↓
Research (Deep Research, background+stream)
  in:  { topic, candidate, voice_corpus_docs[] }
  agent_config: { type:"deep-research", thinking_summaries:"auto", visualization:"auto", collaborative_planning:true }
  emits: thoughts, tool_calls, citations, images (live)
  GATE: research.plan_proposed → /api/runs/:id/plan-approval → continues
  out: { research_pack_id (interaction.id), summary_text, charts: Image[] }
  ↓
Write (Flash, medium, previous_interaction_id=research_pack_id)
  system_instruction: "draft a comprehensive technical article ..."
  in:  (empty input; consumes research history)
  emits: tokens (streaming)
  out: { draft_md, write_interaction_id }
  ↓
Voice (Flash, low, previous_interaction_id=write_interaction_id)
  system_instruction: voice_profile + "rewrite to match voice. emit per-span diffs as function calls."
  tools: [{ type:"function", name:"emit_diff", parameters:{op, original, rewritten, span, reason} }]
  emits: tokens (streaming) + voice.diff events
  out: { rewrite_md, diff[], voice_interaction_id }
  ↓
Verify (Flash, high, previous_interaction_id=voice_interaction_id)
  re-injects: research_pack as document input
  tools: [google_search, url_context, code_execution, { type:"function", name:"flag_discrepancy", parameters:{...} }]
  emits: verify.checking_claim, verify.discrepancy events
  out: { final_md, discrepancies[], verify_interaction_id }
  ↓
Multiplex (parallel fan-out)
  Promise.all([
    tts_bulletin(final_md, voice_profile.tts_voice),
    banana_carousel(final_md, voice_profile.brand),
    Tier2: radio_segment(final_md), veo_hero(final_md)
  ])
  emits: multiplex.job_* events per job
  out: { tts_url, carousel_urls[], radio_url?, veo_url? }
```

---

## 6. Sandbox→UI bridge (D4 detail)

Scout's last action every tick — appended to its SKILL.md tick protocol:

```bash
echo "<<<TIMBRE_TICK_START>>>"
echo '{"tick_id":"'"$(uuidgen)"'","at":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
echo "---CANDIDATES---"
jq -c '.candidates | length' /workspace/candidates.json
jq -c '.candidates[0:5]' /workspace/candidates.json
echo "---ALERTS---"
jq -c '.alerts' /workspace/alerts.json
echo "---LS---"
ls -la --time-style=full-iso /workspace
echo "<<<TIMBRE_TICK_END>>>"
```

**Backend parsing rule:** find the last `<<<TIMBRE_TICK_START>>>…<<<TIMBRE_TICK_END>>>` block in `interaction.output_text`, split on `---SECTION---` markers, JSON-parse each block. If markers missing → log + fall back to last successful `scout/state` snapshot.

The `ls -la` block is the **cold-open prop**: surface verbatim in the Scout panel.

**Scout cron schedule:** every 60 minutes via Vercel Cron (`/api/scout/tick` POST). Kick off Sat ~3pm so by demo Sunday ~12pm there are ~18+ real ticks of state.

---

## 7. Demo flow (3 minutes)

| Beat | Time | What plays | Live path | Fallback path |
|---|---|---|---|---|
| **Cold open** | 0:00–0:25 | Scout panel: `ls -la` of env + scroll `candidates.json` + show 0.94 alert at 3:42am | `GET /api/scout/state` (real Scout history) | `GET /api/cache/scout-state.json` (frozen snapshot) |
| **Research w/ visible reasoning** | 0:25–1:40 | Trigger Deep Research with `collaborative_planning:true` → plan appears → modify on stage → approve → stream thoughts + queries + chart for ~30s | live Interactions API call | auto-switch to `cache/research-events.sse` replay if streaming stalls >5s past expected milestone |
| **The fight** | 1:40–3:10 | Split-screen: Write tokens streaming left, Voice rewrite streaming right with per-span diff highlights. Verify catches one drift → flagged red → auto-corrected. | live Flash chain | `cache/write-events.sse` + `cache/voice-events.sse` + `cache/verify-events.sse` replay at realistic intervals |
| **The fan-out** | 3:10–3:40 | Multiplex board: TTS plays 5s clip, carousel slides render, (radio/veo if shipped) | live multiplex jobs | `cache/multiplex-outputs/` static files |
| **The proof** | 3:40–4:00 | Open published blog post — *"this system has been writing my real content this week"* | live URL | n/a — must be real |

**Total budget:** 4 min hard; aim for 3:00–3:30 spoken. Closer beat lives in `demo-script.md`.

**Cache-replay engine:** backend exposes `?demo=cached` URL param on `GET /api/runs/:run_id/events`. When present, backend ignores live Interactions API and replays a recorded SSE fixture from `data/cache/<run_name>/events.ndjson` at realistic intervals (one event every 50–200ms based on event type). Same SSE shapes → frontend can't tell the difference.

**Auto-fallback trigger:** if any live `agent.token` / `agent.thought` event has gone >8s without arriving, backend silently swaps that run's source to the cached fixture and continues. Front never knows.

---

## 8. Cancellation semantics (D5 detail)

- Frontend: each stage has a stop button; pipeline view has a master stop.
- `POST /api/runs/:id/cancel` marks the run cancelled; backend stops emitting SSE for that `run_id`.
- The underlying Interactions API call **continues running on Google's infra**, accruing tokens, until natural completion. There is no documented cancel endpoint as of `Api-Revision: 2026-05-20`.
- **UI copy MUST NOT say "stopped" or "cancelled" with finality.** Use "paused output." Never imply tokens stopped accruing.

---

## 9. Acceptance gates

### Per-stage acceptance (Sat-night gate before demo polish)

| Stage | Acceptance |
|---|---|
| Scout | One real tick from cron has written non-empty `candidates.json` AND `alerts.json` in a persisted env. Backend can parse the tick block. `GET /api/scout/state` returns >0 candidates. |
| Curate | Given a fixed `candidates.json` input, returns same top-3 across 3 runs (deterministic enough for demo). |
| Research | One successful end-to-end live run with `collaborative_planning:true` produced plan → approval → streamed thoughts → final pack with ≥1 chart image. Streaming reconnect after a forced disconnect re-attaches at correct `last_event_id`. |
| Write | Given the cached research pack, produces a draft.md of ≥800 words referencing ≥3 distinct citations from the pack. |
| Voice | Given a fixed draft, emits ≥5 `voice.diff` events, each with non-empty `original`+`rewritten`+`reason`. |
| Verify | Given a draft with one **intentionally seeded factual drift**, emits exactly one `verify.discrepancy` event with non-empty `sources[]` and `resolution`. |
| Multiplex Tier 1 | TTS bulletin <60s plays cleanly. Carousel renders 3 4:5 PNGs. |
| Multiplex Tier 2 | Optional. If Radio agent test failed Sat AM → not in demo. |

### Demo-readiness gate (Sun 8am)
- Three full end-to-end rehearsals: live mode (or live-with-cache-fallback) completes inside 3:30 spoken.
- One full cached-mode rehearsal at `?demo=cached` plays clean.
- `agents.create()` snapshot of `timbre_scout` succeeded.
- Production deploy at `usetimbre.ai` (or Vercel preview if domain not propagated).
- One real published blog post from a Timbre run earlier this week exists at a known URL (proof beat).

---

## 10. Still-pending decisions (don't block spec; lock by 3pm Sat)

| # | Item | Default if user doesn't lock |
|---|---|---|
| OD1 | Voice corpus — which 4–6 of Ben's posts | `tools/voice_corpus_picker.md` proposes a shortlist; ship the top 4 by distinctiveness |
| OD2 | Demo topic | "The Shift to Agentic Web Infrastructure" (D9) |
| OD3 | AI Talk Radio go/no-go | no-go (Tier 1 only) |
| OD4 | Visual identity | dark studio (D10) |

---

## 11. Where things live

```
~/code/timbre/                              ← benikigai/timbre
├── specs/                                  ← these docs
├── packages/
│   ├── shared/src/contracts/              ← TS types derived from api-contracts.md
│   ├── backend/                            ← Express + orchestrator + SSE bus
│   └── frontend/                           ← Vite + React + Vercel AI SDK
├── data/cache/                             ← demo fixtures (gitignored content; structure committed)
│   ├── scout-state.json
│   ├── research-events.ndjson
│   ├── write-events.ndjson
│   ├── voice-events.ndjson
│   ├── verify-events.ndjson
│   └── multiplex-outputs/{tts.mp3,carousel/*.png}
├── public/                                 ← Vercel placeholder (to be replaced by frontend build)
└── vercel.json

~/code/timbre-scout-config/                 ← benikigai/timbre-scout-config (to be created by tools)
├── AGENTS.md
├── .agents/skills/{source_scanning,topic_scoring,voice_profile}/SKILL.md
├── sources.yaml
└── voice_corpus/*.md
```

---

## 12. References
- `specs/api-contracts.md` — SSE events + REST + file schemas
- `specs/01-back.md` — orchestrator + Interactions API per-stage calls
- `specs/02-front.md` — UI components + SSE consumption
- `specs/03-tools.md` — Scout config repo + demo cache artifacts
- `specs/demo-script.md` — verbatim narration + fallback per beat
