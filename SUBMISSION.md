# Timbre — Hackathon Submission

**Event:** Cerebral Valley × Google DeepMind I/O Hackathon
**Date:** Saturday, May 23, 2026
**Category:** Best Use of Managed Agents (Interactions API + Antigravity)

---

## Project

**Name:** Timbre
**Tagline:** Two agents fight so your voice survives.
**Demo:** [usetimbre.ai](https://usetimbre.ai)
**Repo:** [github.com/benikigai/timbre](https://github.com/benikigai/timbre)
**Video:** `data/cache/demo-final.mp4` (uploaded to hackathon form)

---

## One-line description

A multi-agent content engine for technical founders. Researches what matters, writes in your voice, and verifies it didn't lie to sound better.

---

## The problem

Technical content is the highest-ROI acquisition channel for B2B founders — and the channel AI categorically fails at. Generic LLM output is detectable; outsourced copy doesn't carry the founder's voice. The state-of-the-art response is "style-transfer," which silently mangles technical facts to sound smoother. Founders shipping serious technical work can't risk that.

## The solution

Timbre composes seven Google AI primitives into a 7-stage agentic pipeline:

**Scout** (Antigravity managed agent, hourly cron) → **Curate** (Flash) → **Research** (Deep Research with collaborative planning + visualization) → **Write** (Flash) → **Voice** (Flash w/ custom diff function) → **Verify** (Flash w/ combined tools + claim re-grounding) → **Multiplex** (Gemini TTS + Nano Banana, parallel fan-out)

The novel bit is the **Voice ↔ Verify fight**. Voice rewrites the draft sentence-by-sentence to match the founder's tone (concise, engineering-first, no corporate jargon). Verify is the second-pass agent that compares each rewrite against the original Research evidence and catches the moment Voice changes *"Vite builds in 1.2s"* into *"Vite builds instantly"* — sounds better, technically a lie. Verify re-grounds the claim via `google_search` + `url_context` and auto-corrects back.

## The demo moment

A 3-minute live pipeline:

1. **Cold open** — Scout's persistent Antigravity sandbox shows 18+ hours of accumulated state. Real `ls -la` timestamps, real candidates scored against Voice DNA, real 3:42am alert.
2. **Research with visible reasoning** — Deep Research proposes a plan, demoer edits it on stage ("focus more on cold-start latency"), approves, agent streams its thoughts + search queries + an agent-generated chart inline.
3. **The fight** — Split-screen: Write tokens stream left, Voice rewrites stream right with inline diff highlights and reasons. Verify catches one factual drift, flashes red, re-grounds it, fades green.
4. **The fan-out** — One verified article → TTS bulletin + 3-slide social carousel, both real Gemini outputs.
5. **The proof** — A real blog post from an earlier Timbre run.

---

## What's load-bearing

| Google primitive | Where it does real work |
|---|---|
| **Antigravity Agent** (`antigravity-preview-05-2026`) | Scout — persistent Linux sandbox with hourly state accumulation |
| **Managed Agents** (`agents.create()`) | `timbre_scout` registered as a named, reusable managed agent |
| **Deep Research** (`deep-research-preview-04-2026`) | Research stage — collaborative planning, thought streaming, visualization |
| **Interactions API** | Every stage; `previous_interaction_id` chaining for free server-side history |
| **Combined tool use** | Verify combines `google_search` + `url_context` + `code_execution` + custom `flag_discrepancy` fn in a single request |
| **Multimodal multiplex** | `gemini-2.5-flash-preview-tts` + `gemini-3-pro-image-preview` (Nano Banana) — parallel content generation |
| **Strict beta-API discipline** | `Api-Revision: 2026-05-20` pinned, `@google/genai` v2+ pinned, `thinking_level` enum-only (no temperature on Gemini 3.x) |

Seven primitives, every one doing load-bearing work. Nothing decorative.

---

## What's novel

**Sandbox → UI bridge via sentinel JSON print.** Antigravity managed agents have no webhook, no shared mount, no host-side file API. The only way out is `output_text`. Timbre solves this with a strict sentinel protocol Scout emits at the end of every tick:

```bash
echo "<<<TIMBRE_TICK_START>>>"
echo '{"tick_id":"'"$(uuidgen)"'","at":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
echo "---CANDIDATES_COUNT---"
jq -c '.candidates | length' /workspace/candidates.json
echo "---CANDIDATES_HEAD---"
jq -c '.candidates[0:5]' /workspace/candidates.json
echo "---ALERTS---"
jq -c '.alerts // []' /workspace/alerts.json
echo "---LS---"
ls -la --time-style=full-iso /workspace
echo "<<<TIMBRE_TICK_END>>>"
```

Backend parses the last `<<<TIMBRE_TICK_END>>>` block, splits on `---SECTION---` markers, JSON-parses each. Cheap, deterministic, demos great. The verbatim `ls -la` block becomes the cold-open prop.

**`previous_interaction_id` chaining for free.** Write → Voice → Verify don't manually pass context — they chain on the Interactions API's server-side history. The voice rewrite sees the full research evidence pack without re-serialization. Verify re-injects the research_pack as a fresh document input alongside the chained history, so it has both the original evidence and the rewrite to compare.

**One real managed agent.** Scout is registered via `agents.create({id: 'timbre_scout', baseAgent: 'antigravity-preview-05-2026', baseEnvironment: {sources: [github: timbre-scout-config]}})`. The scout config is a separate GitHub repo (AGENTS.md + 3 SKILL.md + sources.yaml + voice_corpus/) that mounts into the sandbox at every tick. Runtime state (candidates, alerts, seen URLs) accumulates in the env across ticks.

---

## Tech stack

- **Backend:** Node 22, Express 5, TypeScript 6, `@google/genai` v2.6+, Server-Sent Events
- **Frontend:** Vite 8, React 19, Tailwind 4, Vercel AI SDK
- **Shared:** Zod schemas for all SSE events + REST + file shapes (single source of truth, both packages import from `packages/shared/src/contracts/`)
- **Scout config:** separate GitHub repo (`benikigai/timbre-scout-config`) mounted into Antigravity sandbox
- **Deploy:** Vercel (landing + frontend), backend running locally for demo

---

## Architecture diagram

See the [README on GitHub](https://github.com/benikigai/timbre#architecture) for the mermaid 7-stage flow diagram.

---

## What was built in 24 hours

- 6 spec docs (~1,500 lines total)
- 6 Zod schema files mirroring contracts
- Backend orchestrator with SSE bus, cache replay engine, plan-approval gate, in-process event log w/ Last-Event-Id reconnect
- Frontend dashboard with split-screen DiffView, plan modal, multiplex board
- Scout config repo with AGENTS.md + 3 SKILL.md + sources.yaml + voice corpus
- Cache fixture: 47-event SSE replay, 8 hand-validated voice diffs, 1 seeded discrepancy, real Gemini TTS audio + 3 Nano Banana carousel images
- Live integration: 1 real `agents.create()` + 1 real Antigravity tick scoring 5 alerts (max score 1.00 on a topic perfectly matching Voice DNA: "BambuStudio violating PrusaSlicer AGPL")

---

## Team

**Benjamin Shyong** ([@benikigai](https://github.com/benikigai)) — solo build, with parallel agent assistance:
- **Claude Opus 4.7** (spec + integration QA, this terminal)
- **Claude Opus 4.7** (backend orchestrator, /yolo'd against `specs/YOLO-BACK.md`)
- **Claude Opus 4.7** (frontend dashboard, /yolo'd against `specs/YOLO-FRONT.md`)
- **Antigravity (Gemini 3.5 Flash)** (multimodal asset production, /yolo'd against `specs/YOLO-ANTIGRAVITY.md`)

Four-terminal parallel build with locked Zod contracts as the integration boundary. Coordination overhead near-zero because contracts were frozen before any agent started building.

---

## Challenges + learnings

- **Antigravity's Interactions-API surface is narrower than the IDE SDK.** No MCP, no function calling, no structured output, no `background=true`. We had to design Scout's I/O entirely through filesystem + a printed sentinel block.
- **Deep Research streaming connections die at ~600s.** Backend must reconnect via `last_event_id`. We deferred this for the hackathon by handing off to cached replay after the live plan_proposed event.
- **`previous_interaction_id` only carries history.** `system_instruction`, `tools`, and `generation_config` are interaction-scoped and must be re-specified per stage. Easy to miss until your second stage silently drops its tools.
- **Voice's `emit_diff` pattern works but requires `function_result` echo.** Gemini 3.5's strict function-call matching means the model stalls silently if you don't return a result for every call. Discovered while wiring.

---

## What we'd build next

- **Live Research streaming end-to-end** on stage (currently we cut to cached after plan_proposed to fit the 3-min demo).
- **AI Talk Radio multiplex** (Tier 2 — deferred for time).
- **Veo hero clip** generation (Tier 2 stretch).
- **Voice DNA self-tuning** — let Voice update the founder's profile based on which diffs they accept vs. reject.
- **Multi-founder** — register one managed agent per founder, voice corpus per agent.

---

## Acknowledgments

- The Cerebral Valley + Google DeepMind team for the event + the cooked Gemini 3.5 GA release on day-of
- Google's Antigravity IDE for being a thoroughly underrated agent harness
- The `gemini-3-pro-image-preview` model for not being the bottleneck this time

---

**Links again:**
- Live: [usetimbre.ai](https://usetimbre.ai)
- Repo: [github.com/benikigai/timbre](https://github.com/benikigai/timbre)
- Specs: [github.com/benikigai/timbre/tree/main/specs](https://github.com/benikigai/timbre/tree/main/specs)
- Scout config: [github.com/benikigai/timbre-scout-config](https://github.com/benikigai/timbre-scout-config)
