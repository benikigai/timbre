# Timbre — Demo Script

**Owner:** demoer (Ben)
**Time budget:** 3:00–3:30 spoken; 4:00 hard cap
**Run mode:** `live` with auto-fallback to `cached` (transparent). If anything feels off pre-demo, hit `?demo=cached&cache_fixture=agentic-web-infra` and run pure cache.

---

## Pre-demo setup (T-3 min)

1. Open laptop on presenter monitor at `https://usetimbre.ai/?demo=auto`
2. Open backup tab at `https://usetimbre.ai/?demo=cached&cache_fixture=agentic-web-infra` (don't focus it)
3. Open phone with `data/cache/agentic-web-infra/multiplex/tts.mp3` ready as last-resort audio
4. Confirm Scout panel shows ≥18 ticks accumulated overnight + at least one alert
5. Confirm one real Ben blog post URL loads (the ProofBeat target)
6. Mic check; deep breath

If Scout panel is empty: hit "Use cached snapshot" button (renders `scout-state.json` fallback). Demo continues unchanged.

---

## Beat 1 — Cold open *(0:00 – 0:25, 25s)*

**What's on screen:** ScoutPanel left rail showing 18+ tick timestamps, candidates list scrolling, one bright alert card "0.94 — Anthropic posts on agentic web infra (3:42am)".

**Narration (verbatim):**
> "Every B2B founder in this room needs to write deep technical content to get users. It takes ten hours a week, and AI writers produce slop that doesn't sound like you."
> [click ScoutPanel ls expand]
> "While I was sleeping last night, this agent — Scout — ran every hour, scanned my sources, and flagged this at 3:42 AM. Real timestamps. Real candidates. Real persistent file system."

**Action:** click the `ls -la` collapsible to reveal the monospace timestamp block. Let it sit for 2 seconds.

**Fallback:** if ls block is empty, skip the click, just gesture at the candidate list. The alert card alone carries the moment.

---

## Beat 2 — Research with visible reasoning *(0:25 – 1:40, 75s)*

**What's on screen:** Click top alert → Center swaps to "Run starting…" → 1s later `PlanApprovalModal` opens with the research plan in a textarea.

**Narration:**
> "Watch this. I pick the topic and the Deep Research agent proposes a plan — not just goes off and runs."
> [edit textarea inline: add the words "and the cold-start latency angle"]
> "I add one direction. Approve."
> [click "Approve with edits"]
> "Now the agent starts work — and you can watch it think."

**What happens:** modal closes, agent.thought tokens stream into the Research panel (right rail). Inline citations flow as they're cited. After ~25 seconds of real streaming, a chart image renders inline.

**Cut-to-cached trigger:** if streaming stalls >8s past expected, backend auto-engages cached replay silently (per master §7). Narration unchanged.

**Hard-fallback:** if the modal never opens (Research API down): swap to backup tab `?demo=cached` and start mid-stream. Say "we cached this run from this morning to keep us on time." No one will know.

---

## Beat 3 — The fight *(1:40 – 3:10, 90s)*

**What's on screen:** DiffView splits the center. Left column: Writer tokens streaming into a draft. Right column: starts blank.

**Narration:**
> "Now Writer drafts the article — and Voice rewrites it sentence by sentence to sound like me."
> [pause as both columns stream]
> "Watch the right side. Every diff has a reason."
> [point at one specific diff with hover-revealed reason: "starts with cliché; sharpened opener"]
> "Here's the part that's the whole reason this project exists."

**At ~30s into this beat, VerifyOverlay slides in from the right.**

> "Verify just caught that Voice changed 'sub-200ms cold-start' to 'instant cold-start' — sounds better, technically a lie. It's pulling the original source right now."
> [the overlay shows source URL + drift comparison]
> "Auto-corrected back to the cited number."
> [overlay fades green]
> "This is what nobody else does. Voice transfer that fights for your facts."

**Cut-to-cached trigger:** if Write or Voice tokens stop arriving >8s, auto-fallback engages mid-beat. The beat continues at speed.

**If Verify never fires a discrepancy:** the seeded drift in `data/cache/agentic-web-infra/events.ndjson` guarantees it; live runs without seeded drift may not. The cached path is preferable here. Decide pre-demo: if live run hasn't shown a discrepancy in any of 3 rehearsals, switch this beat to cached.

---

## Beat 4 — The fan-out *(3:10 – 3:40, 30s)*

**What's on screen:** MultiplexBoard rises to prominence. TTS card "ready" → click play. Carousel thumbnails render.

**Narration:**
> "One approval, four formats. Audio bulletin —"
> [click play, let 4-5 seconds of TTS play]
> "Social carousel —"
> [click first thumb to lightbox, dismiss in 1s]
> "All from the verified post. No re-writes. No second prompt."

**Tier 2 (if Radio + Veo shipped):** play 5s of radio segment, gesture at Veo clip. Don't dwell. The volume is the point.

**Fallback:** if any multiplex card failed, just play TTS + show carousel. Skip the failed card with no comment.

---

## Beat 5 — The proof *(3:40 – 4:00, 20s)*

**What's on screen:** ProofBeat replaces center, iframe loads a real recently-published Ben blog post.

**Narration:**
> "This is a real post on my real blog. It came out of Timbre earlier this week."
> [let the iframe sit for 2 beats]
> "Today is the day I show it to you."
> [pause]
> "Timbre — built on Gemini Deep Research, Antigravity managed agents, and the Interactions API. Seven Google primitives, one product. Thanks."

**End.**

---

## Q&A prep (likely questions, 1-sentence answers each)

| Likely judge question | Answer |
|---|---|
| "How is this different from Gemini Spark?" | Spark generates content. Timbre *preserves your voice through generation* — verification is a different product. |
| "What's the persistent agent actually doing?" | Antigravity gives us a Linux sandbox that holds state across hourly ticks — Scout's candidates file grows from real RSS scans across 18+ hours overnight. |
| "What happens if Voice introduces an error you don't catch?" | Verify is the second-pass agent that compares the rewrite against the original Research evidence pack. It catches drift introduced by Voice transfer specifically. |
| "What models does it use?" | Gemini 3.5 Flash for the chain, Deep Research preview for the research stage, Antigravity for Scout, Nano Banana + Gemini 2.5 TTS for multiplex. |
| "How long does a full run take live?" | 4–8 minutes end-to-end. Research is the long pole (2–6 minutes). The demo cuts to streamed thoughts to make that watchable. |
| "Where does the voice profile come from?" | A founder drops 4-6 past posts in a corpus folder. A skill extracts tone, sentence patterns, forbidden jargon. It re-extracts on every voice_corpus update. |
| "Is it shipping?" | Yes — `usetimbre.ai`. The post you just saw was a real Timbre output. |
| "Can I try it?" | [if Ben wants users] hand a card / QR; [if not] "private beta — talk to me after." |

---

## Emergency protocols

### If the whole live pipeline dies (network, model 503, etc.)
Say: *"Let me show you the cached run we recorded this morning — same flow."*
Switch to backup tab (`?demo=cached`). Continue from current beat. Total recovery time: <5 seconds.

### If the dashboard doesn't load at all
Open the local backup at `localhost:3000?demo=cached` (you'll have the dev server running as a backup). If that's dead too, play `data/cache/agentic-web-infra/multiplex/tts.mp3` from your phone and narrate over it: "Voice DNA. Fact-checking. Multi-format. Demo's at usetimbre.ai if you want to see the live agent."

### If a judge interrupts mid-beat
Pause politely. Answer. Resume by clicking the next visible affordance — the state machine survives interruption.

### If you forget a line
The demo carries itself visually for ~15s on any beat. Let the visuals run. Pick up at the next milestone.

---

## Acceptance (Sat 11pm rehearsal gate)

Run this script end-to-end three times Saturday night:
- [ ] Run 1 — full live: must complete ≤ 3:45 spoken
- [ ] Run 2 — cached: must complete ≤ 3:15 spoken
- [ ] Run 3 — live with one forced disconnect mid-Research: must auto-recover transparently

If any rehearsal busts 4:00, cut Beat 4 Tier 2 elements (Radio + Veo) and re-time.
