# Timbre — 01 Backend Spec

**Owner:** back terminal
**Read first:** `00-master.md` (decisions + pipeline) and `api-contracts.md` (event + endpoint shapes)
**Auth + version pins:** see master §4
**Anti-spec:** do not duplicate event/endpoint definitions here; import from `packages/shared/src/contracts/`.

---

## 1. Scope

Build the orchestrator: an Express server that exposes the REST/SSE surface, calls Gemini Interactions API for each stage, multiplexes streams into a single SSE bus per run, and falls back to cached fixtures on failure or `?demo=cached`.

**Stack already installed** (per `packages/backend/package.json`):
- `@google/genai@^2.6.0`, `express@^5`, `cors`, `dotenv`, `ts-node`, `typescript@^6`

**Add immediately:** `zod` (shared contracts depend on it), `eventsource-parser` (for parsing SSE responses from Deep Research), `nanoid` (run/tick IDs).

```bash
cd ~/code/timbre/packages/backend
npm i zod eventsource-parser nanoid
```

---

## 2. File layout (target)

```
packages/backend/src/
├── server.ts                     # Express bootstrap + route mount
├── env.ts                        # process.env validation (Zod)
├── log.ts                        # tiny pino/console wrapper; structured JSON
├── routes/
│   ├── runs.ts                   # POST /api/runs, POST /api/runs/:id/plan-approval, POST /api/runs/:id/cancel
│   ├── events.ts                 # GET /api/runs/:id/events (SSE) + GET /api/scout/events (SSE)
│   ├── scout.ts                  # GET /api/scout/state, POST /api/scout/trigger
│   ├── cache.ts                  # GET /api/cache/:fixture
│   └── health.ts                 # GET /api/healthz
├── bus/
│   ├── eventLog.ts               # in-mem ring buffer per run; id-keyed; Last-Event-Id replay
│   ├── sseWriter.ts              # write events to res in standard SSE wire format
│   └── replay.ts                 # cache fixture → SSE replay engine
├── pipeline/
│   ├── run.ts                    # orchestrator: state machine that drives all 7 stages
│   ├── stages/
│   │   ├── scout.ts              # tick(): manage env, parse TIMBRE_TICK_END block
│   │   ├── curate.ts             # Flash w/ structured output, returns top-3
│   │   ├── research.ts           # Deep Research w/ background+stream+collaborative_planning, reconnect logic
│   │   ├── write.ts              # Flash, previous_interaction_id chain
│   │   ├── voice.ts              # Flash w/ emit_diff function tool
│   │   ├── verify.ts             # Flash w/ google_search + url_context + flag_discrepancy
│   │   └── multiplex.ts          # Promise.all fan-out (tts, carousel, radio?, veo?)
│   └── voiceProfile.ts           # loads voice_corpus + voice_dna.json, caches in-process
├── genai/
│   ├── client.ts                 # GoogleGenAI singleton; pinned Api-Revision header injector
│   ├── interactionStream.ts      # SSE parser for /interactions stream; reconnect w/ Last-Event-Id
│   └── types.ts                  # narrow types over @google/genai response shapes
└── cache/
    └── fixtures.ts               # load + serve cached fixture files from data/cache/
```

**Migration from existing 4-agent files** (per master "drift flag"):

| Existing | → | New module(s) | Notes |
|---|---|---|---|
| `src/agents/scout.ts` | → | `pipeline/stages/scout.ts` | Refactor: emit `<<<TIMBRE_TICK_END>>>` block per master §6 |
| `src/agents/analyst.ts` | → | `pipeline/stages/curate.ts` + `pipeline/stages/research.ts` | Split: ranking vs Deep Research |
| `src/agents/writer.ts` | → | `pipeline/stages/write.ts` | Rename, chain via `previous_interaction_id` |
| `src/agents/vibecheck.ts` | → | `pipeline/stages/voice.ts` + `pipeline/stages/verify.ts` | Split: rewriting vs fact-checking |
| `src/interactions-client.ts` | → | `genai/client.ts` + `genai/interactionStream.ts` | Keep, refactor; lift Api-Revision header into header injector |
| `src/test-connection.ts` | keep | (root or `scripts/`) | Saturday morning smoke-test target |
| `data/voice_corpus/*` | keep for now | (will move to `timbre-scout-config/voice_corpus/` per 03-tools) | Local copy fine for hackathon |
| `data/voice_dna.json` | keep | (will move similarly) | Backend reads on boot |
| `data/search_cache.json` | unused | delete OR rename to `data/cache/legacy_search_cache.json` | Not in 7-stage spec |

---

## 3. Server bootstrap

```ts
// src/server.ts
import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import { runsRouter } from './routes/runs.js';
import { eventsRouter } from './routes/events.js';
import { scoutRouter } from './routes/scout.js';
import { cacheRouter } from './routes/cache.js';
import { healthRouter } from './routes/health.js';

const app = express();
app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', healthRouter);
app.use('/api/runs', runsRouter);
app.use('/api', eventsRouter);    // mounts /api/runs/:id/events + /api/scout/events
app.use('/api/scout', scoutRouter);
app.use('/api/cache', cacheRouter);
const port = Number(env.PORT ?? 3000);
app.listen(port, () => console.log(`timbre backend on :${port}`));
```

**Required env vars** (`src/env.ts` validates with Zod, fails fast):
```
GEMINI_API_KEY=...
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,https://usetimbre.ai
SCOUT_CONFIG_REPO=https://github.com/benikigai/timbre-scout-config.git
SCOUT_CRON_TOKEN=...        # shared secret for Vercel Cron to call POST /api/scout/trigger
PUBLIC_BASE_URL=http://localhost:3000   # for cache asset URLs in events
```

---

## 4. SSE bus

**Per-run channel.** Each `run_id` gets:
- An in-memory ring buffer of the last 5000 events (`{ id: number, type: EventType, data: unknown }`).
- A set of open response writers (SSE connections).
- A monotonically incrementing event id starting at 1.

**Emit(eventType, data):**
1. Append to ring buffer with next id.
2. For each open writer, format `event: <type>\nid: <n>\ndata: <json>\n\n` and `res.write(...)`.

**On new connection to `GET /api/runs/:id/events`:**
1. Read `Last-Event-Id` request header (or `?from=` query).
2. Replay buffered events with id > supplied id, in order.
3. Add this writer to the active set.
4. On `req.on('close')`, remove from set.

**On run.completed / run.error:** flush, close all writers for that run, schedule buffer GC after 5 minutes (so a late reconnect can still get the tail).

**Code sketch:**
```ts
// src/bus/eventLog.ts
type StoredEvent = { id: number; type: string; data: unknown };
const runs = new Map<string, { events: StoredEvent[]; writers: Set<Response>; nextId: number }>();

export function emit(runId: string, type: string, data: unknown) {
  const r = runs.get(runId) ?? init(runId);
  const ev = { id: r.nextId++, type, data };
  r.events.push(ev);
  if (r.events.length > 5000) r.events.shift();
  for (const w of r.writers) writeSse(w, ev);
}
```

Use the same pattern for the Scout channel — keyed by the single literal `'scout'`.

---

## 5. Genai client wrapper

```ts
// src/genai/client.ts
import { GoogleGenAI } from '@google/genai';
import { API_REVISION } from '@timbre/shared/contracts'; // or relative path
export const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Wrap fetch to inject Api-Revision on REST fallback paths.
// (SDK adds its own headers; this is only for raw fetch in `interactionStream.ts`.)
export function geminiFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Api-Revision', API_REVISION);
  headers.set('x-goog-api-key', process.env.GEMINI_API_KEY!);
  headers.set('Content-Type', 'application/json');
  return fetch(url, { ...init, headers });
}
```

**`interactionStream.ts`** uses raw `fetch` + `eventsource-parser` for Deep Research streaming because the SDK's stream API does not (as of `@google/genai@2.6.0`) expose `Last-Event-Id` reconnect cleanly. Pattern:

```ts
async function* streamInteraction(opts: { interactionId?: string; lastEventId?: number; ... }) {
  const url = opts.interactionId
    ? `https://generativelanguage.googleapis.com/v1beta/interactions/${opts.interactionId}?stream=true${opts.lastEventId ? `&last_event_id=${opts.lastEventId}` : ''}`
    : `https://generativelanguage.googleapis.com/v1beta/interactions`;
  const init: RequestInit = opts.interactionId
    ? { method: 'GET' }
    : { method: 'POST', body: JSON.stringify(opts.body) };
  const res = await geminiFetch(url, init);
  // ... eventsource-parser → yield each parsed event
}
```

On stream drop (connection error mid-flight): record `interaction.id` + last `event_id`, reconnect via the GET path.

---

## 6. Per-stage implementations

### 6.1 Scout (`pipeline/stages/scout.ts`)

Triggered by **`POST /api/scout/trigger`** (called by Vercel Cron with shared secret header).

```ts
export async function runScoutTick(opts: { envId?: string }) {
  const tickId = nanoid();
  emitScout('scout.tick_started', { tick_id: tickId });
  try {
    const interaction = await genai.interactions.create({
      agent: AGENTS.TIMBRE_SCOUT,                  // registered managed agent
      environment: opts.envId ?? 'remote',          // reuse if provided, else fresh fork
      input: 'Run the standard hourly tick: refresh sources, score new candidates, write candidates.json + alerts.json, then print the TIMBRE_TICK block.',
    });
    const parsed = parseTickBlock(interaction.outputText ?? '');
    const result: ScoutTickResult = {
      tick_id: tickId,
      started_at: tickStart, completed_at: new Date().toISOString(),
      env_id: interaction.environmentId,
      ...parsed,
    };
    persistTickToState(result);                       // updates GET /api/scout/state snapshot
    emitScout('scout.tick_completed', result);
    return result;
  } catch (e) {
    emitScout('scout.tick_error', { tick_id: tickId, error: String(e) });
    throw e;
  }
}
```

**`parseTickBlock(text)`** — locate the LAST `<<<TIMBRE_TICK_START>>>…<<<TIMBRE_TICK_END>>>` block, split on `---SECTION---` markers, JSON-parse each section. Strict on sentinels, lenient on whitespace. If parse fails → throw; the catch logs and emits `scout.tick_error`.

**Reuse env across ticks:** persist `env_id` from latest successful tick in a tiny `data/scout_state.json` (or env-var-backed KV); pass to next `runScoutTick({ envId })`. This makes Scout's filesystem accumulate state across hours, which is the cold-open prop.

**Antigravity constraints to respect** (master §2):
- `background=true` NOT supported on Antigravity — call is synchronous, expect 60–180s per tick.
- `store=true` is required (default).
- No function calling, no structured output, no MCP. All I/O via filesystem in env + final printed block.

### 6.2 Curate (`pipeline/stages/curate.ts`)

```ts
export async function runCurate(runId: string, candidates: Candidate[]): Promise<Candidate[]> {
  emit(runId, 'stage.started', { stage: 'curate', agent: MODELS.FLASH });
  emit(runId, 'agent.thought', { stage: 'curate', text: `Ranking ${candidates.length} candidates against voice + strategic fit…` });
  const resp = await genai.interactions.create({
    model: MODELS.FLASH,
    generationConfig: { thinkingLevel: 'low' },
    systemInstruction: CURATE_SYS,           // tells model to return JSON of top-3 ids w/ reasons
    input: [{ type: 'text', text: JSON.stringify({ voice_profile: loadVoiceProfile(), candidates }) }],
    // structured output via Gemini 3.x: combine JSON mode w/ system instruction (see whats_new doc)
  });
  const top3 = parseTop3(resp.outputText, candidates);
  emit(runId, 'curate.selected', { top: top3 });
  emit(runId, 'stage.completed', { stage: 'curate', duration_ms: now - start });
  return top3;
}
```

**Cost target:** < $0.005 per call (small input, ~3s wall).

### 6.3 Research (`pipeline/stages/research.ts`)

The centerpiece. Background + stream + collaborative planning. Three-phase:

**Phase A — propose plan.**
```ts
const planResp = await genai.interactions.create({
  agent: AGENTS.DEEP_RESEARCH,
  agentConfig: {
    type: 'deep-research',
    thinkingSummaries: 'auto',
    visualization: 'auto',
    collaborativePlanning: true,
  },
  input: [
    { type: 'text', text: `Topic: ${topic.title}\n\nUser background: …` },
    ...voiceCorpusDocs.map(doc => ({ type: 'document', uri: doc.url, mime_type: 'text/markdown' })),
  ],
  // background + stream — but for the plan stage, plan returns fast (<60s); a single non-stream interaction is fine.
});
const planMd = planResp.outputText!;
const planInteractionId = planResp.id;
emit(runId, 'research.plan_proposed', { plan_md: planMd, plan_interaction_id: planInteractionId });
// SUSPEND — wait for plan-approval POST. Stored in a per-run pending map.
```

**Phase B — execute.** When `POST /api/runs/:id/plan-approval` arrives:
```ts
const approval = req.body.modifications ?? 'Plan looks good. Proceed.';
const execResp = await genai.interactions.create({
  agent: AGENTS.DEEP_RESEARCH,
  previousInteractionId: planInteractionId,
  agentConfig: { type: 'deep-research' },  // collaborativePlanning off this turn
  input: approval,
  background: true,
  stream: true,
});
// execResp is a stream — iterate, emit events as they arrive.
```

**Phase C — stream consumer.**
```ts
for await (const ev of streamInteraction({ interactionId: execResp.id })) {
  switch (ev.event_type) {
    case 'step.delta':
      if (ev.delta.type === 'thought') {
        emit(runId, 'agent.thought', { stage: 'research', text: ev.delta.text });
        // also surface search queries: parse pattern "Searching: \"…\"" → emit agent.tool_call
        const sq = extractSearchQuery(ev.delta.text);
        if (sq) emit(runId, 'agent.tool_call', { stage: 'research', tool: 'google_search', args: { query: sq } });
      } else if (ev.delta.type === 'text') {
        // accumulate body text — but for Research we mostly care about the final outputText
      } else if (ev.delta.type === 'image') {
        emit(runId, 'agent.image', { stage: 'research', mime_type: ev.delta.mime_type, data_b64: ev.delta.data, caption: ev.delta.caption });
      }
      break;
    case 'interaction.completed':
      done = true;
      break;
  }
}
```

**Reconnect protocol:** track `lastEventId` per iteration. On any thrown error: log, then call `streamInteraction({ interactionId: execResp.id, lastEventId })` — backend automatically resumes from the same `interactionId`. If 3 reconnects fail or `FALLBACK_GRACE_MS` exceeded between events → emit `run.fallback_engaged` and switch to cached fixture.

**Output:** persist a `ResearchPack` (per `files.ts`) keyed by `runId`. Backend retains the interaction id for chaining to Write.

### 6.4 Write (`pipeline/stages/write.ts`)

```ts
const resp = await genai.interactions.create({
  model: MODELS.FLASH,
  previousInteractionId: researchPack.interaction_id,   // carries the entire research history
  systemInstruction: WRITE_SYS,                          // "draft a 1000-1500 word technical post with structure, code where useful, reference charts by caption"
  generationConfig: { thinkingLevel: 'medium' },
  input: 'Draft the article now.',
  stream: true,
});
let draftMd = '';
for await (const ev of streamInteraction({ ...respIntoStream(resp) })) {
  if (ev.delta?.type === 'text') {
    draftMd += ev.delta.text;
    emit(runId, 'agent.token', { stage: 'write', text: ev.delta.text });
  }
}
```

Returns `{ draft_md: draftMd, interaction_id: resp.id }`.

### 6.5 Voice (`pipeline/stages/voice.ts`)

Flash with one custom function tool, `emit_diff`. Model rewrites paragraph-by-paragraph; each rewrite triggers an `emit_diff` function call that the orchestrator catches and surfaces as `voice.diff` SSE events.

```ts
const VOICE_TOOLS = [{
  type: 'function',
  name: 'emit_diff',
  description: 'Record a per-span rewrite from the draft to the voice-adjusted version.',
  parameters: {
    type: 'object',
    properties: {
      op: { type: 'string', enum: ['insert','delete','replace'] },
      original_text: { type: 'string' },
      rewritten_text: { type: 'string' },
      span_start: { type: 'integer' },
      span_end: { type: 'integer' },
      reason: { type: 'string' },
    },
    required: ['op','original_text','rewritten_text','span_start','span_end','reason'],
  },
}];

const resp = await genai.interactions.create({
  model: MODELS.FLASH,
  previousInteractionId: writeInteractionId,
  systemInstruction: VOICE_SYS(voiceProfile),
  generationConfig: { thinkingLevel: 'low' },
  tools: VOICE_TOOLS,
  input: 'Rewrite the draft span-by-span to match the founder voice. Emit emit_diff for every change.',
  stream: true,
});
```

For each `emit_diff` function call received in the stream, ALSO reply with `function_result` of `{"ok": true}` per Gemini 3.5 strict matching rules (api-contracts.md note + master). Surface as `voice.diff` SSE.

Final assembled `rewrite_md` = apply diffs in order to original `draft_md`. Persist for Verify.

### 6.6 Verify (`pipeline/stages/verify.ts`)

Combined tool use: `google_search` + `url_context` + `code_execution` + custom `flag_discrepancy` function. `thinking_level: 'high'`. Re-injects research_pack so Verify has ground truth.

```ts
const VERIFY_TOOLS = [
  { type: 'google_search' },
  { type: 'url_context' },
  { type: 'code_execution' },
  { type: 'function', name: 'flag_discrepancy', parameters: { /* mirrors DiscrepancySchema */ } },
];
const resp = await genai.interactions.create({
  model: MODELS.FLASH,
  previousInteractionId: voiceInteractionId,
  systemInstruction: VERIFY_SYS,
  generationConfig: { thinkingLevel: 'high' },
  tools: VERIFY_TOOLS,
  input: [
    { type: 'text', text: 'Compare the voice-rewritten article against the research pack. Verify each metric, name, and quote. Call flag_discrepancy for any drift.' },
    { type: 'document', uri: persistedResearchPackUri, mime_type: 'application/json' },
  ],
  stream: true,
});
```

On each `flag_discrepancy` call: emit `verify.discrepancy` with sources + resolution (typically `auto-corrected` — replace drift with original quoted text). Apply to `rewrite_md` to produce `final_md`.

### 6.7 Multiplex (`pipeline/stages/multiplex.ts`)

```ts
const jobs: Promise<MultiplexResultPart>[] = [
  ttsBulletin(finalMd, voiceProfile.tts_voice),       // Tier 1
  bananaCarousel(finalMd, voiceProfile.brand),        // Tier 1
];
if (FEATURES.RADIO) jobs.push(radioSegment(finalMd)); // Tier 2 (env flag)
if (FEATURES.VEO)   jobs.push(veoHero(finalMd));      // Tier 2 (env flag)

for (const job of jobs) {
  job.then(r => emit(runId, 'multiplex.job_completed', r))
     .catch(e => emit(runId, 'multiplex.job_failed', { job: tagOf(job), error: String(e), fatal: false }));
}
emit each 'multiplex.job_started' just before .then attachment.
const results = await Promise.allSettled(jobs);
```

- **TTS bulletin:** `gemini-2.5-flash-preview-tts` (UNVERIFIED) — single-call audio synth of a 60s exec summary. If model id 404s, fall back to a `tts_unavailable` job error (Tier 2 demotion).
- **Carousel:** `gemini-3-pro-image-preview` (UNVERIFIED) — three 4:5 images. Prompt-encode each slide with `final_md` headline + 1 supporting bullet.
- **Radio + Veo:** off by default behind `FEATURES` flags.

---

## 7. Pipeline orchestrator (`pipeline/run.ts`)

```ts
export async function startRun(req: RunRequest): Promise<string> {
  const runId = nanoid();
  const candidate = await pickCandidate(req);
  emit(runId, 'run.started', { topic: candidate.title, candidate, mode: req.mode });

  // Fire-and-forget (await internally, return runId immediately to caller).
  (async () => {
    try {
      const top3 = await runCurate(runId, await loadScoutCandidates());
      const research = await runResearch(runId, top3[0]);          // suspends at plan-gate
      const draft = await runWrite(runId, research.interaction_id);
      const voiced = await runVoice(runId, draft.interaction_id);
      const final = await runVerify(runId, voiced.interaction_id, research);
      const multi = await runMultiplex(runId, final.final_md);
      emit(runId, 'run.completed', { duration_ms, final_md_url, multiplex: multi });
    } catch (e) {
      // attempt fallback once
      const recovered = await tryFallback(runId, e);
      if (!recovered) emit(runId, 'run.error', { stage: stageOf(e), error: String(e), recoverable: false });
    }
  })();

  return runId;
}
```

**Plan-gate handling:** `runResearch` returns a promise that resolves only after `POST /plan-approval` fires. Implementation: store a `Map<runId, { resolve, planInteractionId }>` keyed by runId; the POST handler calls `resolve(req.body)`.

---

## 8. Cache replay engine

`data/cache/<fixture_name>/events.ndjson` — one JSON event per line, `{ id, type, data, t_offset_ms }`.

When a run is started with `{ mode: 'cached', cache_fixture: 'agentic-web-infra' }` OR auto-fallback engages:
```ts
async function replay(runId: string, fixture: string, speed = 1) {
  const events = await loadNdjson(`data/cache/${fixture}/events.ndjson`);
  let last = 0;
  for (const ev of events) {
    const delay = Math.max(0, (ev.t_offset_ms - last) / speed);
    await sleep(delay);
    emit(runId, ev.type, ev.data);
    last = ev.t_offset_ms;
  }
}
```

**Recording mode:** in dev, a `RECORD=1` env var causes the bus's `emit()` to also append to `data/cache/_recordings/${runId}/events.ndjson`. After a clean live run, copy the recording into `data/cache/agentic-web-infra/events.ndjson` for the demo.

---

## 9. Cancellation handler

```ts
// POST /api/runs/:id/cancel
runs.markCancelled(runId);
// emit() checks runs.cancelled.has(runId) and short-circuits.
res.json({ ok: true, halted_at: nowIso() });
```

**Do not** attempt to cancel underlying Interactions API calls. Tokens accrue until natural completion. UI copy must say "Paused output" (master §8).

---

## 10. Vercel cron config

Add to repo root `vercel.json` (the placeholder is fine to extend):

```json
{
  "crons": [
    { "path": "/api/scout/trigger", "schedule": "0 * * * *" }
  ]
}
```

Vercel calls `POST /api/scout/trigger` hourly. Handler validates header `X-Vercel-Cron-Token: ${SCOUT_CRON_TOKEN}` (set in Vercel project env) before kicking the tick.

**Saturday afternoon kickoff:** once cron is wired, manually trigger one tick (`curl -X POST .../scout/trigger -H 'X-Vercel-Cron-Token: ...'`) to start the 18-hour state accumulation.

---

## 11. Deploy

- **Local dev:** `npm run dev` in `packages/backend` (ts-node) + `npm run dev` in `packages/frontend` (vite on 5173).
- **Production:** Vercel. Backend deploys as a Node serverless function via Vercel's Express-on-Node template. SSE on Vercel serverless has a 10s default timeout — use Vercel's "Fluid Compute" or migrate the SSE endpoints to **Edge Functions** (Hono on Edge) for longer-lived connections. **Hackathon shortcut:** if SSE-on-Vercel is finicky, deploy backend separately to Fly.io / a single VPS, point frontend at it via `VITE_BACKEND_URL` env. Decide Sat night.

---

## 12. Acceptance checklist (Sat-night, per master §9)

- [ ] `npm run dev` boots backend; `GET /api/healthz` returns ok.
- [ ] `POST /api/scout/trigger` (with valid token) completes a real tick; `GET /api/scout/state` reflects the candidates.
- [ ] `POST /api/runs` with `{topic, mode:'live'}` returns run_id immediately; SSE shows `run.started` → `curate.selected` within 10s.
- [ ] Research plan_proposed fires; `POST /plan-approval` resumes; thoughts stream.
- [ ] Write + Voice + Verify chain via `previous_interaction_id` (verify with logs: stage N's request body includes prior interaction id).
- [ ] Voice emits ≥5 `voice.diff` events on a real draft.
- [ ] Verify with seeded drift emits exactly one `verify.discrepancy`.
- [ ] Multiplex Tier 1 (TTS + carousel) returns asset URLs.
- [ ] `?demo=cached&cache_fixture=agentic-web-infra` replays a recorded run in <2 min.
- [ ] Forced disconnect mid-Research auto-reconnects with `last_event_id`.
- [ ] Cancellation halts SSE within 1 event; UI surfaces "Paused output".

---

## 13. Open questions for spec

None blocking. If discovered during impl, raise to spec terminal — do not freeze contracts without spec update.
