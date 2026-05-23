# Timbre — MINIMUM-VIABLE Scope Cut (3.5h ship)

**Status:** locked Sat 1:00pm PDT — submit 5:00pm PDT
**Authority:** this doc overrides 01-back.md / 02-front.md / 03-tools.md where they conflict
**Why:** brief assumes 24h; we have 3.5h of build before submit. Cutting ruthlessly to 7a (per chat decision).

---

## 1. Scope — what's IN vs OUT

### LIVE on stage (real API calls)
| # | Stage | Why it stays live |
|---|---|---|
| 1 | **Scout** | One real `agents.create()` + one real tick. The cold-open prop + prize-lane qualifier. |
| 2 | **Curate** | 3s Flash call. Cheap, fast, hard to fail. |
| 3 | **Research plan_proposed** | ~30s live. THE "modify-on-stage" interactive moment. |

### CACHED on stage (replay fixture)
| # | Stage | Why cached |
|---|---|---|
| 3' | **Research execution** | Takes 2–20 min; can't run in a 3-min demo |
| 4 | **Write** | Cached SSE replay of token stream |
| 5 | **Voice** | Hand-crafted diff fixture (no function-tool wiring) |
| 6 | **Verify** | Hand-scripted discrepancy moment (cleanly choreographed) |
| 7 | **Multiplex Tier 1** | TTS mp3 + 3 carousel PNGs served as static assets |

### CUT COMPLETELY
- Multiplex Tier 2 (Radio + Veo)
- Vercel Cron (one manual curl is enough)
- Last-Event-Id reconnect (browser default is fine)
- Voice `emit_diff` function-tool wiring (cached fixture has the diffs)
- Verify `flag_discrepancy` function-tool wiring (cached)
- ESLint/test passes (deal with it post-ship)
- Component-level tests
- Saturday-AM smoke test suite (collapse to: run one curl per model when wiring)
- ProofBeat optional if no real published Timbre post exists by 4pm

---

## 2. Back terminal — must build

1. Express + cors + healthz
2. SSE bus: in-memory ring buffer per `run_id` (Map-based); emit + writer; reconnect via SSE default (no Last-Event-Id parsing logic, just plain `EventSource`)
3. **LIVE wrappers:**
   - `POST /api/scout/trigger` — `agents.create({id: 'timbre_scout', ...})` if not exists, then `interactions.create({agent: 'timbre_scout', environment: 'remote'|<env_id>, input: 'Run the standard tick...'})`. Parse `<<<TIMBRE_TICK_END>>>` block. Cache result.
   - `GET /api/scout/state` — return last cached tick result + candidates + alerts
   - Curate: Flash `interactions.create({model:'gemini-3.5-flash', generationConfig:{thinkingLevel:'low'}, systemInstruction: CURATE_SYS, input: [{type:'text', text: JSON.stringify({voice_profile, candidates})}]})`. Parse top-3 from response text.
   - Research plan: `interactions.create({agent:'deep-research-preview-04-2026', agentConfig:{type:'deep-research', collaborativePlanning: true}, input: [{type:'text', text: ...}, ...voice_corpus_docs]})`. Return `plan_md` + `plan_interaction_id`.
   - `POST /api/runs/:id/plan-approval` resolves the suspended promise → **hands off to cache replay**.
4. **Cache replay engine:** reads `data/cache/agentic-web-infra/events.ndjson`, emits each event at `t_offset_ms` interval, scoped to the current `run_id`. Re-emits with fresh `run_id` substitution.
5. `GET /api/cache/:fixture` — static file from `data/cache/`
6. `POST /api/runs` orchestrator: live Curate → live Research plan → suspend → on approval → cache replay rest

**Drop:** Tier 2 multiplex stages, Vercel Cron, function-tool wiring for Voice/Verify, Last-Event-Id, exponential backoff.

**Migration:** rename + refactor existing `src/agents/{scout,analyst,writer,vibecheck}.ts` per `01-back.md §2`. Don't restart.

---

## 3. Front terminal — must build

1. AppShell: simple 3-zone grid (ScoutPanel | Center | (Tier-2 right rail dropped))
2. ScoutPanel: hits `/api/scout/state` once on mount + subscribes to `/api/scout/events`; renders tick count, alert card, candidates list, `ls -la` monospace block
3. RunControls: topic input + START button → `POST /api/runs` → opens SSE on `/api/runs/:id/events`
4. PlanApprovalModal: opens on `research.plan_proposed`; textarea with `plan_md`; "Approve" / "Approve with edits" → `POST /api/runs/:id/plan-approval`
5. DiffView (CENTERPIECE): split-screen Write tokens (L) + Voice tokens (R) w/ inline diff highlights from `voice.diff` events
6. VerifyOverlay: slides in on `verify.discrepancy`; shows original_claim vs drift_text + source URL; red→green tween on `auto-corrected`
7. MultiplexBoard: 2 cards — TTS player (audio plays from `multiplex.job_completed.result_url`) + 3-thumbnail carousel
8. ProofBeat: iframe to `VITE_PROOF_URL` (if set) else hidden
9. `useSSE` hook (browser-native `EventSource` — let it auto-reconnect; no manual reconnect logic)
10. `useReducer` state machine over the AnyEvent discriminated union (events.ts already exports it)
11. Dark sage-amber palette already shipped at `caee391`/`23fe61c` — don't re-theme

**Drop:** Council View 6-panel right rail (or collapse to 6 status dots in header); per-stage thought expansion modal; Tier-2 multiplex cards (Radio/Veo); lightbox; tests; Storybook.

---

## 4. Tools terminal (you, Ben) — must produce

These block both yolos until done. Ship them first.

1. **`data/cache/agentic-web-infra/events.ndjson`** — hand-craft ~40 events spanning ~2.5 min, covering: stage.started/completed for write/voice/verify/multiplex, 12-18 `agent.token` events for write (streaming a draft), 8-10 `voice.diff` events (each w/ realistic original/rewritten/reason), 2-3 `verify.checking_claim`, 1 `verify.discrepancy` (the demo moment), 4 `multiplex.job_started/completed` events. Use `t_offset_ms` ascending. Format per `events.ts` schemas — validate before committing.

2. **`data/cache/agentic-web-infra/multiplex/tts.mp3`** — 30-60s audio. Record yourself reading the article summary, or use ElevenLabs CLI, or `say` macOS voice. Anything under 90s works.

3. **`data/cache/agentic-web-infra/multiplex/carousel/{1,2,3}.png`** — three 4:5 PNGs (e.g. 800x1000). Hand-design in Figma in 15 min, or use any quick template. Article title + 1 bullet each.

4. **`data/cache/scout-state.json`** — IF live Scout tick fails, this is the fallback the front loads. Mirror `ScoutStateResponse` shape from `rest.ts`. Hand-craft 5-10 plausible candidates + 1 alert.

5. **Decide ProofBeat URL** — set `VITE_PROOF_URL` env var to a real Ben blog post (any recent one). If you don't have one, front hides the beat.

Cache fixture is the single biggest demo lever. Prioritize ruthlessly.

---

## 5. Demo flow under the cut (overrides demo-script.md beats 2-5)

| Beat | What plays | Live or cached |
|---|---|---|
| Cold open | ScoutPanel renders real tick from `agents.create()`'d Scout | **LIVE** |
| Topic pick | Click candidate → POST /api/runs starts | n/a |
| Curate | 3s, top-3 appears (visible) | **LIVE** |
| Research plan modal | Plan appears, edit textarea, approve | **LIVE** |
| Research → Write → Voice → Verify → Multiplex | Streaming events from cache fixture | **CACHED** (transparent) |
| Proof | iframe to real post | LIVE-ish |

Front does NOT distinguish live vs cached in the UI — events are events.

---

## 6. Acceptance — must pass before 4:15pm PDT

- [ ] `npm run dev` on backend boots; `/api/healthz` ok
- [ ] `POST /api/scout/trigger` returns within 3 min with a parsed tick block
- [ ] `GET /api/scout/state` returns the tick + at least 5 candidates
- [ ] `POST /api/runs` returns run_id; SSE delivers `run.started` within 500ms
- [ ] Curate live emits `curate.selected` within 10s of start
- [ ] Research plan modal opens in frontend within 60s of `run.started`
- [ ] Approve modal → cache replay begins; full demo plays to `run.completed` within 2.5 min
- [ ] DiffView renders ≥6 visible diff highlights
- [ ] VerifyOverlay renders + resolves once
- [ ] TTS audio plays + 3 carousel thumbnails render
- [ ] Deployed at a public URL (Vercel preview OK)

If any of these aren't green at 4:15pm, ship what works. Don't keep building past hard stop.

---

## 7. Submission (4:50pm)

- README.md at repo root: 1-paragraph what-it-is + how to run + demo URL
- Hackathon form: project name `Timbre`, link to repo + live URL + 60-90s video
- Demo video: screen-record one clean run; narrate live or post-add voiceover

---

## 8. Spec terminal commitment

I (spec terminal on Mini) stay reactive in this Claude Code session:
- Watch for contract gaps either /yolo raises
- Patch contracts + push if needed (round-trip <5 min)
- Will write the submission README at 4:30pm

Ping me with "spec:" prefix in commit messages if you want me to look.
