# Timbre — 99 Handoff

**Read this first if you just joined.** Then read the doc for your role.

---

## What Timbre is, in one paragraph

A 7-stage multi-agent content pipeline for technical founders: **Scout** monitors sources 24/7 → **Curate** picks topics → **Research** (Deep Research with collaborative planning + visualization) builds an evidence pack → **Write** drafts → **Voice** rewrites in the founder's voice → **Verify** catches drift introduced by voice transfer → **Multiplex** fans out to TTS + carousel (Tier 1) and optional Radio + Veo (Tier 2). Built for the Cerebral Valley Google I/O Hackathon May 23–24, 2026. Pitch line: *"visible voice preservation across a long agentic pipeline."* Centerpiece demo moment: the Writer-vs-Voice diff with Verify catching one factual drift live on stage.

---

## Read order by role

| Role | Read in order |
|---|---|
| **Anyone joining cold** | `99-handoff.md` (this) → `00-master.md` |
| **back terminal** | `00-master.md` → `api-contracts.md` → `01-back.md` |
| **front terminal** | `00-master.md` → `api-contracts.md` → `02-front.md` |
| **tools terminal** | `00-master.md` → `api-contracts.md` (§4 + §6) → `03-tools.md` |
| **demoer (Ben)** | `00-master.md` §7 → `demo-script.md` |
| **judge / outsider** | the brief (linked in `00-master.md` §1) |

`packages/shared/src/contracts/` is the **importable mirror** of `api-contracts.md`. Always import types from there — never duplicate.

---

## Authority order (which doc wins on conflict)

1. `00-master.md` — locked decisions, stage map, model/agent ID pins
2. `api-contracts.md` — event + endpoint + file shapes
3. Per-role spec (`01-back.md` / `02-front.md` / `03-tools.md`) — implementation guidance for that role
4. `demo-script.md` — what happens on stage

If a per-role spec contradicts master or contracts, **master/contracts win**. Open a spec question (see below).

---

## Locked decisions (cheatsheet — full table in `00-master.md` §2)

| # | Decision |
|---|---|
| D1 | Scope: 7-stage pipeline (brief is canonical, GDrive PRD's 4-agent scope is superseded) |
| D2 | Authoritative repo: `~/code/timbre` on Mini (`benikigai/timbre`); MBP attaches via Remote-SSH |
| D3 | Scout config: separate repo `benikigai/timbre-scout-config`, mounted into Scout sandbox |
| D4 | Sandbox→UI bridge: end-of-tick JSON print w/ `<<<TIMBRE_TICK_END>>>` sentinel |
| D5 | "Cancel" is cosmetic — backend stops SSE, tokens keep accruing. UI copy = "Pause output" |
| D6 | Cache fallback: `?demo=cached&cache_fixture=<name>` + auto-switch on streaming stall >8s |
| D7 | Multiplex tiers: Tier 1 (TTS + carousel) blocks demo; Tier 2 (Radio + Veo) optional |
| D8 | Shared types: `packages/shared/src/contracts/` (Zod) |
| D9 | Demo topic default: "The Shift to Agentic Web Infrastructure" |
| D10 | Visual identity default: dark studio (Neural Expressive) |

---

## Critical pins (memorize these; copy from `packages/shared/src/contracts/stage.ts`)

| Thing | Value |
|---|---|
| Antigravity base agent | `antigravity-preview-05-2026` |
| Registered managed agent (Scout) | `timbre_scout` |
| Deep Research agent | `deep-research-preview-04-2026` |
| Flash model | `gemini-3.5-flash` |
| TTS model | `gemini-2.5-flash-preview-tts` **← UNVERIFIED, smoke-test Sat AM** |
| Image model (Banana) | `gemini-3-pro-image-preview` **← UNVERIFIED, smoke-test Sat AM** |
| REST `Api-Revision` header | `2026-05-20` |
| SDK | `@google/genai@^2.6.0` (≥v2.0 required) |
| **Never set** | `temperature`, `top_p`, `top_k`, `stop_sequences`, `max_output_tokens` |
| Thinking control | `generation_config.thinkingLevel` enum: `minimal`/`low`/`medium`/`high` |
| Per-stage thinking levels | curate=`low`, write=`medium`, voice=`low`, verify=`high` |

---

## Status (as of spec lock)

| Track | State | Next |
|---|---|---|
| Specs | ✅ all 6 + Zod contracts shipped, pushed | spec terminal idle, reactive |
| Scout config repo | ✅ skeleton populated + pushed | tools drops 4–6 voice corpus posts (OD1) |
| Backend | 🟡 existing 4-agent WIP committed (commit `47a36db`); needs refactor per `01-back.md` §2 migration map | back terminal owns |
| Frontend | 🟡 landing page shipped (`caee391`); components scaffolded; needs SSE wiring per `02-front.md` | front terminal owns |
| Demo cache | ⬜ structure committed; fixtures TBD (record once live pipeline runs clean) | tools terminal owns, follow `03-tools.md` §9 |
| Vercel cron + env | ⬜ not configured | back + tools share, per `01-back.md` §10 + `03-tools.md` §11 |
| Smoke tests | ⬜ scripts not written | tools terminal, Sat AM deadline, per `03-tools.md` §12 |
| Voice corpus | ⬜ 0 of 4–6 files | Ben, Sat 3pm deadline |

---

## How to ask spec a question

Spec terminal is idle but reactive. If you hit a contract gap (event you need that doesn't exist, field you need that's missing, semantic question the docs don't answer):

1. **Don't freeze the contract by inventing a shape.** That divergence will bite by demo.
2. **Ping spec terminal** with the question + your proposed shape.
3. Spec edits `api-contracts.md` + the matching Zod schema + `00-master.md` if needed, commits, pushes.
4. You pull, regenerate types, continue.

Round-trip target: <5 minutes. If spec is unavailable, follow the existing patterns and leave a `// SPEC-QUESTION:` comment so spec can reconcile later.

---

## Things that are NOT in the brief but you should know

- **Antigravity's Interactions-API surface has limits the SDK doesn't have**: no MCP, no function calling, no structured output, no `background=true`, no temperature controls. The Antigravity local SDK (`google.antigravity`) is a different thing — don't conflate. Pipeline uses the Interactions API.
- **Deep Research streaming connections die at ~600s.** Backend must reconnect with `last_event_id`. Per `01-back.md` §5.
- **Plan-approval gate is mandatory** for the demo's "modify on stage" moment. Don't skip — emit `research.plan_proposed` and wait for `POST /api/runs/:id/plan-approval` before continuing.
- **Voice's `emit_diff` function-call pattern** requires returning a `function_result` for each call (Gemini 3.5 strict matching). Otherwise the stream stalls silently with `finish_reason: STOP`. Per `01-back.md` §6.5.
- **Saturday 2pm decision deadline** for voice corpus (OD1) and smoke tests (OD3). Defaults documented in `00-master.md` §10 and `03-tools.md` §12.

---

## Files of note

| Path | Purpose |
|---|---|
| `~/code/timbre/specs/` | All spec docs (this dir) |
| `~/code/timbre/packages/shared/src/contracts/` | Zod schemas — single source of truth for types |
| `~/code/timbre/data/cache/agentic-web-infra/` | Demo cache fixtures (recording target) |
| `~/code/timbre-scout-config/` | Scout's config repo, mounted into its sandbox |
| `~/code/timbre/specs/demo-script.md` | What Ben says on stage |

---

## Final reality check

- Pipeline runtime expectation: **4–8 minutes end-to-end live.** Research is the long pole (2–6 min). Demo cuts to streaming thoughts to make it watchable; cuts to cached on stall.
- Budget: ~$200 weekend (per master §10 of brief, mostly Deep Research + domain).
- Cancellation: tokens keep spending after "Pause output." Watch the meter Sat night.
- If anything feels stuck and unclear — read `00-master.md` start to finish. ~10 minutes. Almost always answers it.
