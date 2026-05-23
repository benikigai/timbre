# YOLO — TOOLS (the human work; you, Ben)

**This is YOUR checklist. Not for /yolo — these need human judgment + are blockers for both back+front.**
**3.5h to ship. Submit at 5pm PDT. Hard stop: 4:15pm.**

The cache fixture is the single biggest demo lever. Ship it FIRST.

---

## Priority 1 — Cache fixture (blocks demo)

### 1a. `data/cache/agentic-web-infra/events.ndjson`

Hand-craft ~40 SSE events spanning ~2.5 min wall time. Each line is `{id, type, data, t_offset_ms}`.

**Required event sequence:**

```
id=1   t=0       stage.started      {stage:'curate', agent:'gemini-3.5-flash'}
id=2   t=4000    stage.completed    {stage:'curate', duration_ms:4000}
id=3   t=4500    stage.started      {stage:'research', agent:'deep-research-preview-04-2026'}
                 [PLAN MODAL OPENS LIVE — these events emit after approval]
id=4   t=8000    agent.thought      {stage:'research', text:'Considering cold-start latency angle...'}
id=5   t=12000   agent.tool_call    {stage:'research', tool:'google_search', args:{query:'edge function cold start'}}
id=6   t=15000   agent.citation     {stage:'research', url:'https://...', title:'...'}
id=7   t=18000   agent.image        {stage:'research', mime_type:'image/png', data_b64:'<base64>', caption:'Cold-start latency by runtime'}
id=8   t=22000   stage.completed    {stage:'research', duration_ms:18000}
id=9   t=23000   stage.started      {stage:'write', agent:'gemini-3.5-flash'}
id=10-25  t=23000..45000  agent.token  {stage:'write', text:'<chunk>'}  × ~15 events streaming a draft
id=26  t=45000   stage.completed    {stage:'write', duration_ms:22000}
id=27  t=46000   stage.started      {stage:'voice', agent:'gemini-3.5-flash'}
id=28-35  t=47000..75000  voice.diff    × 8 events with realistic original/rewritten/span/reason
id=36  t=78000   stage.completed    {stage:'voice', duration_ms:32000}
id=37  t=79000   stage.started      {stage:'verify', agent:'gemini-3.5-flash'}
id=38  t=82000   verify.checking_claim  {claim:'Vite builds in 1.2s on cold start'}
id=39  t=88000   verify.discrepancy {original_claim:'Vite builds in 1.2s', drift_text:'Vite builds instantly', sources:[...], resolution:'auto-corrected', final_text:'Vite builds in 1.2s', diff_span:{start:120, end:155}}
id=40  t=92000   stage.completed    {stage:'verify', duration_ms:13000}
id=41  t=93000   stage.started      {stage:'multiplex', agent:'parallel-jobs'}
id=42  t=94000   multiplex.job_started   {job:'tts'}
id=43  t=94000   multiplex.job_started   {job:'carousel'}
id=44  t=99000   multiplex.job_completed {job:'tts', result_url:'/api/cache/agentic-web-infra/multiplex/tts.mp3', duration_ms:5000}
id=45  t=102000  multiplex.job_completed {job:'carousel', result_url:'/api/cache/agentic-web-infra/multiplex/carousel/1.png', meta:{urls:['/api/cache/agentic-web-infra/multiplex/carousel/1.png', '/api/cache/agentic-web-infra/multiplex/carousel/2.png', '/api/cache/agentic-web-infra/multiplex/carousel/3.png']}}
id=46  t=103000  stage.completed    {stage:'multiplex', duration_ms:10000}
id=47  t=104000  run.completed      {duration_ms:104000, final_md_url:'/api/cache/agentic-web-infra/final.md', multiplex:{tts:{...}, carousel:{...}, errors:[]}}
```

**Add `run_id` and `at` to every payload** (back fills these dynamically on replay; you can leave them as placeholders like `"run_id":"REPLACED","at":"REPLACED"`).

**Validate** each line against `packages/shared/src/contracts/events.ts` schemas before committing. Quick way: write a 20-line validate-ndjson.ts script in `packages/backend/scripts/` that imports `parseEvent` and runs each line through it.

### 1b. The Write tokens (id 10-25)

Write 800-1200 words of a real-sounding article on "The Shift to Agentic Web Infrastructure." Split into ~15 chunks of 50-80 words each. Each chunk becomes one `agent.token` event.

Tip: ask Claude (here or in Antigravity IDE) to draft it — that's exactly the kind of long-form text the article would be.

### 1c. The voice diffs (id 28-35)

Eight `voice.diff` events. Each needs:
- `op: replace|insert|delete`
- `original_text`, `rewritten_text`
- `span: {start, end}` — char offsets into draft.md
- `reason` — a short narration (e.g. "opening cliché; sharpened opener")

These are the demo centerpiece. Make them VISIBLY DIFFERENT and have narrators-can-point-at reasons.

### 1d. The discrepancy (id 39)

Hand-craft one technical claim that Voice altered. Example:
- `original_claim`: "Vite builds in 1.2 seconds on cold start"
- `drift_text`: "Vite builds instantly on cold start"
- Sources: 1-2 real URLs that back up the original
- Resolution: `auto-corrected`

This is THE other demo centerpiece.

---

## Priority 2 — Multiplex assets

### 2a. `data/cache/agentic-web-infra/multiplex/tts.mp3`

30-60 seconds. Options:
- macOS `say -o tts.aiff "..."` then convert to mp3
- ElevenLabs (any voice; quick)
- Record yourself reading the executive summary

### 2b. `data/cache/agentic-web-infra/multiplex/carousel/{1,2,3}.png`

Three 4:5 PNGs (800x1000 or 1080x1350). 15 min in Figma:
- Slide 1: headline + 1 key claim
- Slide 2: chart or quote
- Slide 3: CTA / takeaway

Use sage + amber + gold palette to match the brand.

---

## Priority 3 — Backup data

### 3a. `data/cache/scout-state.json`

In case live Scout fails. Mirror `ScoutStateResponse` from `rest.ts`:

```json
{
  "latest_tick": {
    "tick_id": "tk_demo",
    "started_at": "2026-05-23T03:42:00Z",
    "completed_at": "2026-05-23T03:42:38Z",
    "env_id": "env_demo",
    "candidates_count": 47,
    "new_candidates_count": 3,
    "alerts": [...],
    "ls_output_text": "total 32\n-rw-r--r-- 1 timbre timbre  8234 2026-05-23 03:42:38 candidates.json\n-rw-r--r-- 1 timbre timbre   456 2026-05-23 03:42:38 alerts.json\n-rw-r--r-- 1 timbre timbre  1822 2026-05-23 03:42:38 seen.txt\n...",
    "output_text_excerpt": "..."
  },
  "candidates": [...5-10 plausible items...],
  "alerts": [...1 alert with score >0.9...],
  "tick_history": [...10 plausible past ticks with timestamps spanning the last 18h...]
}
```

### 3b. ProofBeat URL

Set `VITE_PROOF_URL` env var in `packages/frontend/.env.local` to a real Ben blog post URL. If you don't have one, leave unset — ProofBeat will hide.

---

## Priority 4 — Submission prep (4:30pm)

- README.md at repo root: 1-paragraph what-it-is + how to run + demo URL
- Hackathon form: project name `Timbre`, link to repo + live URL + 60-90s video
- Demo video: screen-record one clean run; narrate live or post-add voiceover (use `demo-script.md` as the script)

---

## Hard stop
**4:15pm PDT** for cache fixtures. **4:50pm PDT** for submission. Don't keep building past these.

GO.
