# Timbre — 02 Frontend Spec

**Owner:** front terminal
**Read first:** `00-master.md` (demo flow + acceptance) and `api-contracts.md` (event shapes)
**Stack pins:** see master §4
**Anti-spec:** do not re-define event shapes; import from `packages/shared/src/contracts/`.

---

## 1. Scope

Vite + React + Tailwind dashboard that consumes the backend's SSE bus and renders the 5-beat demo:
1. Cold-open Scout panel (file-tree proof of life)
2. Council view (per-stage thought/token streams)
3. Writer-vs-Voice split-screen diff (the centerpiece)
4. Verify discrepancy overlay
5. Multiplex status board + the proof beat

**Stack already installed** (per `packages/frontend/package.json`):
- React 19, `ai@^6` (Vercel AI SDK), `@ai-sdk/react`, Tailwind 4, Vite 8, TS 6

**Add immediately:** `zod` (shared contracts), `diff` (for token-level diff visualization), `@headlessui/react` or `radix-ui` (for plan-approval modal). Pick whichever the team is faster with — recommendation: `@radix-ui/react-dialog` (smallest, headless).

```bash
cd ~/code/timbre/packages/frontend
npm i zod diff @radix-ui/react-dialog
```

---

## 2. File layout (target)

```
packages/frontend/src/
├── main.tsx
├── App.tsx                       # keep existing; rewire to AppShell
├── AppShell.tsx                  # layout grid (header + 4 zones)
├── theme/
│   ├── tokens.ts                 # color, type, spacing, motion constants
│   └── global.css                # Tailwind base + a few custom utilities
├── components/                   # existing: CouncilView, DiffView, MultiplexBoard, Header — keep, augment
│   ├── Header.tsx
│   ├── ScoutPanel.tsx            # NEW — cold-open file tree
│   ├── RunControls.tsx           # NEW — topic input, mode toggle, start button
│   ├── CouncilView.tsx           # existing — REFACTOR: 6 stage panels (curate, research, write, voice, verify, multiplex)
│   ├── DiffView.tsx              # existing — REFACTOR: split-screen Write tokens (L) vs Voice rewrite + diff overlay (R)
│   ├── PlanApprovalModal.tsx     # NEW — Research plan gate
│   ├── VerifyOverlay.tsx         # NEW — discrepancy callout (slides in from right)
│   ├── MultiplexBoard.tsx        # existing — REFACTOR: 4 cards (tts, carousel, radio, veo); Tier-2 cards dim if not active
│   ├── ProofBeat.tsx             # NEW — final slide showing real published post
│   └── primitives/
│       ├── GlassPanel.tsx
│       ├── PulsingDot.tsx
│       └── DiffSpan.tsx
├── hooks/
│   ├── useSSE.ts                 # existing — REFACTOR to generic SSE consumer w/ Last-Event-Id reconnect
│   ├── useScoutEvents.ts         # NEW — long-lived SSE on /api/scout/events
│   ├── useRunEvents.ts           # NEW — per-run SSE on /api/runs/:id/events
│   ├── usePlanApproval.ts        # NEW — manages plan modal + POST /plan-approval
│   └── useRunStateMachine.ts     # NEW — useReducer over events → derived UI state
├── api/
│   ├── client.ts                 # tiny fetch wrapper w/ JSON helpers + VITE_BACKEND_URL
│   └── scout.ts                  # GET /scout/state, POST /scout/trigger
├── state/
│   ├── runReducer.ts             # event → state transformer (pure)
│   └── runStateTypes.ts          # UI-side derived types (Stages, Cards, etc.)
└── types/                        # existing — fold into shared/contracts imports
```

---

## 3. SSE consumer hook (the foundation)

Browser `EventSource` auto-reconnects with `Last-Event-Id` header — **do not roll your own reconnect**, let the browser do it. Backend honors the header.

```ts
// hooks/useSSE.ts
import { useEffect, useRef, useState } from 'react';
import { type EventType, type EventPayload, safeParseEvent } from '@timbre/shared/contracts';

export function useSSE(
  url: string,
  handlers: { [T in EventType]?: (data: EventPayload<T>) => void },
  enabled = true,
) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (!enabled) return;
    const es = new EventSource(url);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // browser will auto-retry
    // Subscribe to ALL known event types
    for (const type of Object.keys(EventTypeMap) as EventType[]) {
      es.addEventListener(type, (ev) => {
        const data = safeParseEvent(type, JSON.parse((ev as MessageEvent).data));
        if (data) handlersRef.current[type]?.(data as any);
      });
    }
    return () => es.close();
  }, [url, enabled]);
  return { connected };
}
```

Then `useScoutEvents` and `useRunEvents` are thin wrappers around `useSSE` that pre-bind their respective URLs.

---

## 4. State machine (event → UI state)

Use plain `useReducer` over an event log. Each event applies in order to derive UI state. This means **reconnect re-derives state from replayed events for free** — no manual rehydration.

```ts
// state/runReducer.ts
export interface RunState {
  runId: string | null;
  mode: 'live' | 'cached';
  topic: string;
  candidate: Candidate | null;
  stages: Record<StageId, { status: 'idle'|'active'|'done'|'error'; startedAt?: string; completedAt?: string }>;
  thoughts: Record<StageId, string[]>;                     // append text deltas
  draftMd: string;                                         // Write tokens, accumulated
  rewriteMd: string;                                       // Voice tokens, accumulated
  diffs: VoiceDiff[];                                      // appended in order; UI renders inline
  discrepancies: Discrepancy[];
  citations: { stage: StageId; url: string; title?: string }[];
  charts: { caption: string; data_b64: string; mime_type: string }[];
  plan: { md: string; planInteractionId: string; approved: boolean } | null;
  multiplexJobs: Partial<Record<MultiplexJob, { status: 'pending'|'started'|'done'|'failed'; url?: string; error?: string }>>;
  finalMdUrl: string | null;
  completed: boolean;
  error: { stage: StageId; message: string } | null;
}

export function runReducer(s: RunState, e: AnyEvent): RunState { /* big switch on e.type */ }
```

Wire up:
```ts
const [state, dispatch] = useReducer(runReducer, initialRunState);
useRunEvents(runId, {
  'run.started':        (d) => dispatch({ type: 'run.started',        data: d }),
  'agent.thought':      (d) => dispatch({ type: 'agent.thought',      data: d }),
  'agent.token':        (d) => dispatch({ type: 'agent.token',        data: d }),
  'voice.diff':         (d) => dispatch({ type: 'voice.diff',         data: d }),
  'verify.discrepancy': (d) => dispatch({ type: 'verify.discrepancy', data: d }),
  // ... etc — wire every event type
});
```

---

## 5. Layout (AppShell)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header — logo + topic + mode badge + connection dot                      │
├───────────────┬──────────────────────────────────────────┬──────────────┤
│               │                                          │              │
│ ScoutPanel    │  Center (rotates per demo beat):         │  Council     │
│ (sticky left) │   – cold-open: scoutLs                   │  (right rail)│
│  - tick count │   – run mode: DiffView (split)           │  6 mini      │
│  - top alert  │   – verify mode: VerifyOverlay anchored  │  panels:     │
│  - candidates │   – done: ProofBeat                      │  curate,     │
│  list        │                                          │  research,   │
│  - file tree  │  MultiplexBoard sits bottom-anchored     │  write,      │
│  - ls output  │  inside Center on multiplex beat          │  voice,      │
│               │                                          │  verify,     │
│               │                                          │  multiplex   │
└───────────────┴──────────────────────────────────────────┴──────────────┘
```

Grid: `grid-cols-[260px_minmax(0,1fr)_320px]` (responsive ≥1280px). Below 1280 → vertical stack (acceptable; demo is on a presenter monitor so won't matter).

---

## 6. Components

### 6.1 `ScoutPanel`
- Subscribes via `useScoutEvents`. Also `useEffect` fetches `GET /api/scout/state` once on mount for the cold-open tick history.
- Renders:
  - Header: latest tick timestamp (relative: "2m ago") + tick count + status pulse
  - Top alert card (if any alert score >0.9, big text)
  - Scrollable list of candidates (top 10), each: title, source pill, combined_score bar
  - Collapsible `<details>` showing the verbatim `ls -la` block from `latest_tick.ls_output_text` (monospace, ivory-on-charcoal)

**Cold-open prop:** the `ls -la` block. Render it with `font-mono text-sm whitespace-pre` and let the timestamps speak for themselves.

### 6.2 `RunControls`
- Input: topic (defaults to D9 from master)
- Toggle: mode `live | cached`
- Cache fixture select (only shown if mode=cached): `agentic-web-infra` (the only one we'll ship a fixture for)
- Start button → `POST /api/runs` → set `runId` in app state → opens SSE connection
- Stop button (during run) → `POST /api/runs/:id/cancel`; label says **"Pause output"** not "Cancel" (per master §8)

### 6.3 `CouncilView` (right rail, 6 mini panels)
Each panel is a `GlassPanel` showing:
- Stage name + status dot (idle / active pulse / done check / error red)
- Latest thought line (truncated to ~80 chars, tail of `state.thoughts[stage]`)
- For research: also show citation count badge
- For verify: also show discrepancy count badge

Tap to expand → full thought log for that stage (modal or accordion).

### 6.4 `DiffView` (centerpiece)
Two columns. Renders during Write→Voice→Verify beats.
- **Left:** `state.draftMd` rendered as markdown, with current Write token underlined (the "live" cursor). Smoothly streams in.
- **Right:** rewriteMd, with `VoiceDiff` annotations applied inline:
  - `replace`: strike-through original (red), insert rewritten (green), with a small ⓘ icon that hover-reveals `reason`
  - `insert`: green inserted text, no strikethrough
  - `delete`: strike-through, no replacement
- During Verify: red flash on the diff span that triggered `verify.discrepancy`; flash resolves to green after `auto-corrected` resolution (1.2s tween).

**Token streaming**: Use a `<span>` per token with a CSS animation `@keyframes token-fade-in` (opacity 0→1 over 80ms). Browsers handle thousands of these fine for our scale.

### 6.5 `PlanApprovalModal`
- Opens on `research.plan_proposed`.
- Renders `plan_md` (markdown → JSX) in a `<textarea>` so the demoer can edit live on stage.
- Buttons: "Approve as written", "Approve with edits" (sends `modifications` if textarea was edited).
- Both POST to `/api/runs/:id/plan-approval` → close modal → state.plan.approved = true.

### 6.6 `VerifyOverlay`
- On `verify.checking_claim`: scroll DiffView right-pane to span containing claim, add yellow pulse.
- On `verify.discrepancy`: slide-in card from right showing
  - "Drift detected" header
  - Side-by-side: `original_claim` (from research) vs `drift_text` (from voice rewrite)
  - First source URL clickable (opens in new tab)
  - Resolution badge (green check if auto-corrected; orange if flagged)
- Card stays for 4s then collapses to a badge on the right-rail Verify panel.

### 6.7 `MultiplexBoard`
- 4 cards in a row at bottom of Center:
  1. **TTS Bulletin** — circular play button, duration label. Click to play `<audio>`. Disabled until `multiplex.job_completed` for `tts`.
  2. **Carousel** — three thumbnail squares (4:5 ratio). Lightbox on click.
  3. **Radio** — same as TTS, dimmed if Tier 2 off.
  4. **Veo** — `<video controls>`, dimmed if Tier 2 off.

Each card shows status dot. Errors show inline.

### 6.8 `ProofBeat`
- Triggered on `run.completed` OR a separate "show proof" button.
- Renders an iframe to a real published blog post URL (env var `VITE_PROOF_URL`).
- Caption: *"This system has been writing my actual content. Today's the day I show it to you."*

---

## 7. Demo state choreography

The Center zone swaps content based on a `demoBeat` derived from state:

| Beat | Triggered by | Center shows |
|---|---|---|
| `cold-open` | initial | scrolling Scout snapshot + `ls -la` (in ScoutPanel; Center shows logo + welcome) |
| `plan-gate` | `research.plan_proposed` | PlanApprovalModal opens; Center still showing thoughts |
| `streaming` | `agent.token` (write or voice) starts | DiffView (split-screen) |
| `verify` | `verify.checking_claim` | DiffView + VerifyOverlay slide-in |
| `multiplex` | first `multiplex.job_started` | MultiplexBoard rises to prominence in Center |
| `proof` | `run.completed` | ProofBeat replaces Center |

A simple `useMemo` over state computes `demoBeat`. No router; single page.

---

## 8. Visual identity (default: dark studio)

### Color tokens (`theme/tokens.ts`)
```ts
export const c = {
  bg:         '#0A0B10',    // near-black
  surface:    '#13151E',    // panels
  surfaceHi:  '#1B1E2B',    // hover/active
  ink:        '#E8E9EF',    // primary text
  inkDim:     '#9398A8',    // secondary
  accent:     '#7C5CFF',    // electric purple — agent activity
  warn:       '#F59E0B',    // discrepancy flag
  good:       '#10B981',    // resolved
  danger:     '#EF4444',
  hairline:   'rgba(255,255,255,0.06)',
};
```
Glassmorphism: `bg-white/[0.04] backdrop-blur-lg border border-white/[0.06]` for `GlassPanel`.

### Typography
- Display: **Outfit** (var weight 400–700), via Google Fonts inline `<link>`.
- Body + UI: **Inter Tight** (var 400–600).
- Mono: **JetBrains Mono** (for `ls -la`, code blocks, citations).

### Motion
- Default duration 180ms, easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Agent activity pulse: 1.2s ease-in-out infinite, opacity 0.6→1 on PulsingDot.
- Token fade-in: 80ms.
- VerifyOverlay slide-in: 320ms.
- Diff red→green resolution: 1200ms.

### Tailwind config
Extend `tailwind.config.{js,ts}`:
```js
theme: {
  extend: {
    colors: { ink: '#E8E9EF', inkDim: '#9398A8', accent: '#7C5CFF', surface: '#13151E', bg: '#0A0B10' },
    fontFamily: { display: ['Outfit', 'system-ui'], sans: ['Inter Tight', 'system-ui'], mono: ['JetBrains Mono', 'monospace'] },
    boxShadow: { glass: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 12px 40px -8px rgba(0,0,0,0.5)' },
  },
}
```

---

## 9. Fallback rendering rules

- **Missing event type:** `safeParseEvent` returns null → log+skip, don't crash. UI degrades to "data not yet present" gracefully.
- **Partial cached fixture:** if a fixture ends without `run.completed`, UI shows a small "demo replay finished" toast and freezes the last state. No error popup.
- **Connection drop:** browser auto-reconnects (`EventSource` default). Header connection dot turns amber for the duration. Show "Reconnecting…" subtle tag.
- **No Scout state on cold-open:** if `GET /api/scout/state` returns empty → render mock from `/api/cache/scout-state.json` (front fetches this fallback automatically, no flag needed).

---

## 10. Acceptance checklist (Sat-night)

- [ ] `npm run dev` boots; opens at `localhost:5173` with backend at `localhost:3000`.
- [ ] Cold-open shows Scout `ls -la` block AND ≥3 real candidates from `/api/scout/state` (or cache fallback).
- [ ] Start a `live` run → `run.started` dot appears in Header within 500ms.
- [ ] Research plan modal opens on `research.plan_proposed`; editing the textarea and clicking "Approve with edits" closes modal and triggers `research.plan_approved` echo.
- [ ] DiffView streams Write tokens left, then Voice tokens + diffs right; ≥5 inline diff highlights visible.
- [ ] VerifyOverlay slides in on `verify.discrepancy`; red→green tween plays.
- [ ] MultiplexBoard's TTS card becomes playable; carousel thumbnails render.
- [ ] Pause button halts incoming events visibly within 1 tick.
- [ ] `?demo=cached&cache_fixture=agentic-web-infra` URL renders a complete demo end-to-end with no live API calls.
- [ ] Force-disconnect (devtools "offline") → header dot turns amber, browser auto-reconnects within ~5s, state continues without re-render flicker.

---

## 11. Env vars

`.env.local` (gitignored; document in `.env.example`):
```
VITE_BACKEND_URL=http://localhost:3000
VITE_PROOF_URL=https://benikigai.com/blog/some-real-post     # for ProofBeat
```

---

## 12. Open questions for spec

- Visual identity D10 default: dark studio. If user picks ivory editorial instead, swap tokens; layout + components unchanged.
- ProofBeat URL — needs a real recently-published post URL. Defer to user; placeholder env var.
