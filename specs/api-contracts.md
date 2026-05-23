# Timbre — API Contracts

**Authority:** sole source of truth for SSE event shapes, REST endpoints, and JSON file schemas. Front + back implement from this doc.
**TS mirror:** every shape here is mirrored as a Zod schema in `packages/shared/src/contracts/`. Both packages import from there.

---

## 1. Transport overview

| Channel | Path | Purpose |
|---|---|---|
| SSE | `GET /api/runs/:run_id/events` | All agent + stage + pipeline events for a run |
| SSE | `GET /api/scout/events` | Scout tick lifecycle (separate channel, not per-run) |
| REST | `POST /api/runs` | Start a pipeline run |
| REST | `POST /api/runs/:id/plan-approval` | Approve/modify Deep Research plan |
| REST | `POST /api/runs/:id/cancel` | Pause SSE replay (see §master/D5) |
| REST | `GET /api/scout/state` | Latest Scout snapshot |
| REST | `POST /api/scout/trigger` | Manually fire a Scout tick (dev + demo) |
| REST | `GET /api/cache/:fixture` | Serve a cached fixture file |
| REST | `GET /api/healthz` | Liveness |

**CORS:** backend allows `http://localhost:5173` (Vite dev), the Vercel preview origin, and `https://usetimbre.ai`. Configured in `cors()` middleware.

---

## 2. SSE protocol

### 2.1 Wire format (standard SSE)

```
event: <event_type>
id: <monotonic_event_id_per_run>
data: <single-line JSON, no trailing newline inside data>

```

(Blank line terminates an event. `id:` is the SSE event id used by `Last-Event-Id` on reconnect.)

### 2.2 Connection + reconnect

- Frontend opens `EventSource('/api/runs/<id>/events')`. On disconnect, browser auto-reconnects with `Last-Event-Id` header.
- Backend honors `Last-Event-Id`: replays all stored events with id > supplied id, then resumes live stream.
- Backend stores per-run event log in-memory (process-local; sufficient for hackathon). Capacity: last 5000 events per run.
- If a run is in `cached` mode, backend reads from `data/cache/<fixture>/events.ndjson` and yields events at recorded intervals (or compressed intervals if `?speed=2` query param).

### 2.3 Query params

- `?demo=cached` — force cached replay (see master §7)
- `?speed=N` — replay speed multiplier (default 1.0; max 5.0)
- `?from=<event_id>` — alternative to `Last-Event-Id` for testing

### 2.4 `id` assignment

- Per run, ids are monotonic decimals starting at 1.
- Cached fixtures use ids 1..N from the original recorded run.

---

## 3. SSE event taxonomy

All events share envelope keys `run_id: string` and `at: ISO8601 string` (omitted from per-event docs below for brevity; assume present). Event types are namespaced with `.`.

### 3.1 Run lifecycle

| Event | When | Payload |
|---|---|---|
| `run.started` | Backend received `POST /api/runs` and chose a candidate | `{ topic: string, candidate: Candidate, mode: 'live' \| 'cached' }` |
| `run.completed` | All 7 stages done (or Tier 1 multiplex done if Tier 2 skipped) | `{ duration_ms: number, final_md_url: string, multiplex: MultiplexResult }` |
| `run.error` | Unrecoverable failure (no fallback fired) | `{ stage: StageId, error: string, recoverable: false }` |
| `run.fallback_engaged` | Live → cached auto-switch happened mid-run | `{ stage: StageId, reason: string }` |

### 3.2 Stage lifecycle

| Event | When | Payload |
|---|---|---|
| `stage.started` | Stage's first API call dispatched | `{ stage: StageId, agent: string }` |
| `stage.completed` | Stage emitted final output | `{ stage: StageId, duration_ms: number, summary?: string }` |
| `stage.error` | Stage failed but pipeline recovered (e.g. fallback) | `{ stage: StageId, error: string, recovered: true }` |

`StageId = 'curate' | 'research' | 'write' | 'voice' | 'verify' | 'multiplex'` (Scout has its own channel).

### 3.3 Agent inner events (council view)

These render in per-agent panels for visible reasoning.

| Event | Stages that emit | Payload |
|---|---|---|
| `agent.thought` | research, write, voice, verify | `{ stage: StageId, text: string }` — append to thought panel |
| `agent.token` | write, voice, verify | `{ stage: StageId, text: string }` — append to draft view |
| `agent.tool_call` | research, verify | `{ stage: StageId, tool: 'google_search' \| 'url_context' \| 'code_execution' \| 'flag_discrepancy' \| 'emit_diff', args: object }` |
| `agent.citation` | research, verify | `{ stage: StageId, url: string, title?: string, snippet?: string }` |
| `agent.image` | research | `{ stage: StageId, mime_type: string, data_b64: string, caption?: string }` |

### 3.4 Stage-specific events (custom UI per stage)

#### Curate (stage 2)
| Event | Payload |
|---|---|
| `curate.selected` | `{ top: Candidate[] /* length 3 */ }` |

#### Research (stage 3)
| Event | Payload |
|---|---|
| `research.plan_proposed` | `{ plan_md: string, plan_interaction_id: string }` — UI shows modal: edit/approve |
| `research.plan_approved` | `{ plan_interaction_id: string, modifications?: string }` — echoed from `POST /plan-approval` for log |

#### Voice (stage 5)
| Event | Payload |
|---|---|
| `voice.diff` | `VoiceDiff` (see §4.5) — one per rewritten span; UI highlights inline |

#### Verify (stage 6)
| Event | Payload |
|---|---|
| `verify.checking_claim` | `{ claim: string }` — UI scrolls to claim, pulses |
| `verify.discrepancy` | `Discrepancy` (see §4.6) — UI flashes red, then resolution slot |

#### Multiplex (stage 7)
| Event | Payload |
|---|---|
| `multiplex.job_started` | `{ job: MultiplexJob }` (job ∈ `'tts' \| 'carousel' \| 'radio' \| 'veo'`) |
| `multiplex.job_completed` | `{ job: MultiplexJob, result_url: string, duration_ms: number, meta?: object }` |
| `multiplex.job_failed` | `{ job: MultiplexJob, error: string, fatal: boolean }` (fatal=false for Tier 2) |

### 3.5 Scout channel (`GET /api/scout/events`)

| Event | When | Payload |
|---|---|---|
| `scout.tick_started` | Backend fires `POST /api/scout/trigger` or cron firing | `{ tick_id: string }` |
| `scout.tick_completed` | Backend parsed `<<<TIMBRE_TICK_END>>>` block | `ScoutTickResult` (see §4.7) |
| `scout.tick_error` | Parse failed or sandbox errored | `{ tick_id: string, error: string }` |

---

## 4. JSON file schemas

All defined as Zod in `packages/shared/src/contracts/`. TS types are inferred — never duplicate.

### 4.1 Candidate
```ts
{
  id: string;                    // stable hash of url
  url: string;
  title: string;
  source: string;                // 'rss:openai-blog' | 'hn:item' | 'x:@karpathy' | 'arxiv:cs.AI'
  published_at: string;          // ISO8601
  novelty_score: number;         // 0..1, scout-assigned
  voice_fit_score: number;       // 0..1, scout-assigned
  combined_score: number;        // weighted; 0..1
  summary: string;               // <=280 chars
  raw_excerpt?: string;          // <=2000 chars (first paragraph)
}
```

### 4.2 Alert
```ts
{
  id: string;                    // same id as candidate
  triggered_at: string;          // ISO8601
  candidate: Candidate;
  reason: string;                // human-readable why this crossed threshold
  threshold: number;             // typically 0.85
}
```

### 4.3 VoiceProfile (Voice DNA)
```ts
{
  founder_id: string;            // 'benjamin'
  tone: string[];                // e.g. ['direct', 'engineering-first', 'slightly-skeptical']
  sentence_length: 'concise' | 'medium' | 'long';
  technical_depth: 'layman' | 'engineer' | 'deep-engineer';
  forbidden_jargon: string[];    // ['disrupt', 'game-changing', 'leverage', 'robust', 'in today\'s fast-paced world']
  preferred_openings: string[];  // patterns like 'Most ${noun} ${verb}...' for diff agent to favor
  brand: { primary_color: string; accent_color: string; font_family: string }; // for Banana
  tts_voice: string;             // gemini voice ID, populated after smoke test
}
```

### 4.4 ResearchPack (handed to Write via `previous_interaction_id`)
The pack itself is the Deep Research interaction's history (server-side). For local display + Verify re-injection, backend also persists a flat snapshot:
```ts
{
  topic: string;
  interaction_id: string;        // Deep Research interaction id
  summary_md: string;            // 2-3 paragraph executive summary
  key_claims: { id: string; claim: string; sources: { url: string; quote: string }[] }[];
  charts: { caption: string; data_b64: string; mime_type: string }[];
  citations: { url: string; title: string }[];
}
```

### 4.5 VoiceDiff
```ts
{
  id: string;                    // stable within a run
  op: 'insert' | 'delete' | 'replace';
  original_text: string;         // empty for 'insert'
  rewritten_text: string;        // empty for 'delete'
  span: { start: number; end: number };  // char offsets into draft.md
  reason: string;                // short narration: "starts with cliché; sharpened opener"
}
```

### 4.6 Discrepancy
```ts
{
  id: string;
  original_claim: string;        // from research_pack.key_claims
  drift_text: string;            // what Voice wrote that diverged
  diff_span: { start: number; end: number }; // offsets into rewrite.md
  sources: { url: string; quote: string }[]; // re-grounded evidence
  resolution: 'auto-corrected' | 'flagged' | 'accepted';
  final_text: string;            // text used in final.md
}
```

### 4.7 ScoutTickResult
```ts
{
  tick_id: string;
  started_at: string;
  completed_at: string;
  env_id: string;                // Antigravity environment id
  candidates_count: number;
  new_candidates_count: number;  // delta from previous tick
  alerts: Alert[];               // alerts triggered THIS tick (not cumulative)
  ls_output_text: string;        // raw `ls -la` block, render verbatim
  output_text_excerpt: string;   // first 4000 chars of agent's output_text, for debugging
}
```

### 4.8 MultiplexResult
```ts
{
  tts?:      { url: string; duration_ms: number; voice: string };
  carousel?: { urls: string[];                                 /* length 3 */ };
  radio?:    { url: string; duration_ms: number; transcript?: string };
  veo?:      { url: string; duration_ms: number };
  errors:    { job: MultiplexJob; error: string }[];
}
```

### 4.9 RunRequest / RunResponse (REST)
```ts
// POST /api/runs body
{
  topic?: string;                // either topic or candidate_id required
  candidate_id?: string;
  mode?: 'live' | 'cached';      // default 'live'
  cache_fixture?: string;        // required if mode='cached'; e.g. 'agentic-web-infra'
}
// response
{ run_id: string }
```

### 4.10 PlanApprovalRequest (REST)
```ts
// POST /api/runs/:id/plan-approval body
{
  modifications?: string;        // omitted = approve as-is
}
// response
{ ok: true, approved_at: string }
```

---

## 5. REST endpoint details

### 5.1 `POST /api/runs`
- Body: `RunRequest` (§4.9)
- 200: `RunResponse`
- 400: `{ error: 'topic_or_candidate_required' }`
- Side effect: backend creates run record, returns immediately. Pipeline executes async; events stream on `/events` SSE.

### 5.2 `POST /api/runs/:run_id/plan-approval`
- Body: `PlanApprovalRequest` (§4.10)
- 200: `{ ok: true }`
- 409: `{ error: 'no_plan_pending' }` — call only valid after `research.plan_proposed` emitted
- Side effect: backend resumes Deep Research by issuing follow-up interaction with `previous_interaction_id=<plan_interaction_id>` and approval text. Emits `research.plan_approved` SSE event.

### 5.3 `POST /api/runs/:run_id/cancel`
- Body: (none)
- 200: `{ ok: true, halted_at: string }`
- Semantics: stops SSE emission. **Does NOT cancel underlying Interactions API calls.** (Master §8.)

### 5.4 `GET /api/runs/:run_id/events` (SSE)
- Headers: `Accept: text/event-stream`. Honors `Last-Event-Id`.
- Query: `demo=cached`, `speed=<float>`, `from=<id>`
- Emits all events above for the run. Connection stays open until `run.completed` / `run.error` / `run.fallback_engaged→ run.completed`.

### 5.5 `GET /api/scout/state`
- 200:
```ts
{
  latest_tick: ScoutTickResult | null;
  candidates: Candidate[];       // top 50 by combined_score
  alerts: Alert[];               // active alerts (score > 0.85), most recent first
  tick_history: { tick_id: string; at: string; new_candidates_count: number }[]; // last 30
}
```

### 5.6 `POST /api/scout/trigger`
- Body: (optional) `{ env_id?: string }` — reuse env or provision new
- 200: `{ tick_id: string, env_id: string }`
- Side effect: kicks off a Scout interaction, emits Scout SSE events as it progresses.

### 5.7 `GET /api/scout/events` (SSE)
- Standalone channel for Scout lifecycle. Same reconnect protocol as run events.

### 5.8 `GET /api/cache/:fixture_name`
- Returns raw file from `data/cache/`. Used by frontend for static prefetch of demo props (e.g. cold-open scout snapshot).

### 5.9 `GET /api/healthz`
- 200: `{ ok: true, build: string, started_at: string }`

---

## 6. Scout tick output sentinel (see master §6)

Exact protocol Scout must emit at end of every tick:

```
<<<TIMBRE_TICK_START>>>
{"tick_id":"<uuid>","at":"<iso8601>"}
---CANDIDATES_COUNT---
<integer>
---CANDIDATES_HEAD---
<JSON array of first 5 candidates>
---ALERTS---
<JSON array of alerts (full)>
---LS---
<raw `ls -la --time-style=full-iso /workspace` output>
<<<TIMBRE_TICK_END>>>
```

**Parser MUST be strict on sentinels; lenient on whitespace inside sections.** If parse fails, log `scout.tick_error` and keep prior `scout/state` snapshot intact.

---

## 7. TS contract layout

```
packages/shared/src/contracts/
├── index.ts                 // re-exports everything
├── events.ts                // SSE event types + Zod schemas + EventEnvelope discriminated union
├── files.ts                 // Candidate, Alert, VoiceProfile, ResearchPack, VoiceDiff, Discrepancy, ScoutTickResult, MultiplexResult
├── rest.ts                  // RunRequest, RunResponse, PlanApprovalRequest, ScoutStateResponse
└── stage.ts                 // StageId enum + per-stage agent/model constants (mirrored from master §3)
```

**Both packages import from `@timbre/shared/contracts` (or relative path until workspaces are set up).** No duplicating types.

---

## 8. Examples (copy-pasteable for testing)

### 8.1 Sample SSE stream (run start → research plan gate)
```
event: run.started
id: 1
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:00Z","topic":"The Shift to Agentic Web Infrastructure","candidate":{"id":"c_abc","url":"https://...","title":"...","source":"hn:item","published_at":"2026-05-23T12:00:00Z","novelty_score":0.88,"voice_fit_score":0.91,"combined_score":0.90,"summary":"..."},"mode":"live"}

event: stage.started
id: 2
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:00Z","stage":"curate","agent":"gemini-3.5-flash"}

event: curate.selected
id: 3
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:04Z","top":[/* 3 candidates */]}

event: stage.completed
id: 4
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:04Z","stage":"curate","duration_ms":4120}

event: stage.started
id: 5
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:04Z","stage":"research","agent":"deep-research-preview-04-2026"}

event: agent.thought
id: 6
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:08Z","stage":"research","text":"To approach this, I'll start by surveying the canonical agentic web infra primitives..."}

event: research.plan_proposed
id: 7
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:00:18Z","plan_md":"## Plan\n1. ...\n2. ...","plan_interaction_id":"int_plan_xyz"}
```

### 8.2 Sample plan approval
```bash
curl -X POST http://localhost:3000/api/runs/r_01HXYZ/plan-approval \
  -H 'Content-Type: application/json' \
  -d '{"modifications":"Focus more on the cold-start latency angle"}'
```

### 8.3 Sample voice.diff event
```
event: voice.diff
id: 142
data: {"run_id":"r_01HXYZ","at":"2026-05-24T15:01:22Z","id":"d_03","op":"replace","original_text":"In today's fast-paced world","rewritten_text":"Most B2B founders","span":{"start":0,"end":29},"reason":"opening cliché; sharper subject-first opener matches your voice"}
```

---

## 9. Versioning + change discipline

- This contract is **frozen for the hackathon weekend**. Any change requires updating `packages/shared/src/contracts/` *and* this doc in the same commit.
- If a new event type is genuinely needed mid-build, prefer extending the `agent.*` namespace over adding stage-specific events.
- Backend MUST tolerate extra unknown fields on inbound JSON; frontend MUST tolerate extra unknown SSE event types (log + ignore, don't crash).
