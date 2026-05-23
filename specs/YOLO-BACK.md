# YOLO — BACK

**You are the back terminal. 3.5h to ship. Submit at 5pm PDT. Hard stop: 4:15pm.**

## Read first (in order)
1. `specs/MINIMUM-VIABLE.md` (overrides everything broader)
2. `specs/00-master.md`
3. `specs/api-contracts.md`
4. `specs/01-back.md` (reference only — you will NOT build all of it)

## Import all types from `packages/shared/src/contracts/`. Never redefine.

## BUILD (in order, ~3 hours)

1. **Install:** `cd packages/backend && npm i zod nanoid eventsource-parser`
2. **Express + cors + `GET /api/healthz`** — boot at :3000
3. **SSE bus** (`src/bus/`): per-run `Map<runId, {events[], writers[], nextId}>`. `emit(runId, type, data)` appends + fans out. `GET /api/runs/:id/events` opens an SSE writer. Use browser-default reconnect — DO NOT build Last-Event-Id replay logic.
4. **Live wrappers** (`src/pipeline/stages/`):
   - `scout.ts` — `agents.create({id:'timbre_scout', baseAgent:'antigravity-preview-05-2026', baseEnvironment:{type:'remote', sources:[{type:'repository', source:'https://github.com/benikigai/timbre-scout-config.git', target:'/workspace'}]}})` (idempotent — catch "already exists"). `POST /api/scout/trigger` runs one `interactions.create({agent:'timbre_scout', environment:'remote'|<env_id>, input:'Run the standard tick.'})`. Parse `<<<TIMBRE_TICK_END>>>` block. Cache result in-memory. Emit `scout.tick_completed`.
   - `curate.ts` — Flash `interactions.create({model:'gemini-3.5-flash', generationConfig:{thinkingLevel:'low'}, systemInstruction:'<select top 3 candidates by combined_score; respond as JSON {top:[id,id,id]}>', input:[{type:'text', text:JSON.stringify({candidates})}]})`. Parse top-3. Emit `curate.selected`.
   - `research.ts` — `interactions.create({agent:'deep-research-preview-04-2026', agentConfig:{type:'deep-research', collaborativePlanning:true}, input:[{type:'text', text:'<topic>'}]})`. Return `{plan_md: response.outputText, plan_interaction_id: response.id}`. Emit `research.plan_proposed`. Suspend.
5. **`POST /api/runs/:id/plan-approval`** — resolves the suspended promise. Run orchestrator then HANDS OFF TO CACHE REPLAY (do NOT stream real Research execution — too slow).
6. **Cache replay engine** (`src/bus/replay.ts`) — reads `data/cache/agentic-web-infra/events.ndjson`, emits each event at recorded `t_offset_ms` intervals, substitutes the current `run_id`.
7. **`GET /api/cache/:fixture`** — serves static file from `data/cache/`. Used for TTS/carousel asset URLs in `multiplex.job_completed` events.
8. **`POST /api/runs` orchestrator** — fire-and-forget: live Curate → live Research-plan → suspend until plan-approval → cache replay rest → emit `run.completed`.
9. **`POST /api/runs/:id/cancel`** — sets a `cancelled` flag; `emit` short-circuits. No real API cancellation.
10. **Local smoke test:** boot, hit `POST /api/scout/trigger`, then `POST /api/runs`, watch SSE in browser.

## DROP completely
- Vercel Cron config
- Last-Event-Id reconnect logic
- Voice `emit_diff` function-tool wiring (cached in fixture)
- Verify `flag_discrepancy` function-tool wiring (cached)
- Multiplex live model calls (assets served as static cache files)
- Tier 2 stages (Radio + Veo)
- Robust retry / exponential backoff
- Vercel deploy until working locally
- Refactoring polish — leave the old src/agents/* files in place if they don't conflict; only refactor what you actively use

## Migration
Refactor existing `src/agents/{scout,analyst,vibecheck,writer}.ts` per `01-back.md §2`. Or start fresh in `src/pipeline/` and just delete the old files — your call based on what's faster.

## Cadence
- Commit + push every 15 min with descriptive messages: `back: <what you did>`
- If you hit a contract gap, leave a `// SPEC-QUESTION:` comment + keep going
- Pull `git pull --rebase` before each commit

## Acceptance (must pass by 4:15pm)
- [ ] `npm run dev` boots; `/api/healthz` returns ok
- [ ] `POST /api/scout/trigger` works within 3 min, parses tick block
- [ ] `POST /api/runs` returns run_id immediately
- [ ] SSE delivers full demo (live curate + live plan + cached rest) end-to-end within 3 min total

## Hard stop
**4:15pm PDT.** Whatever works ships. Don't keep building.

GO.
