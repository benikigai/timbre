# YOLO — FRONT

**You are the front terminal. 3.5h to ship. Submit at 5pm PDT. Hard stop: 4:15pm.**

## Read first (in order)
1. `specs/MINIMUM-VIABLE.md` (overrides everything broader)
2. `specs/00-master.md`
3. `specs/api-contracts.md`
4. `specs/02-front.md` (reference only — you will NOT build all of it)

## Import all types from `packages/shared/src/contracts/`. Never redefine.

## Backend runs at `http://localhost:3000` in dev. Use `VITE_BACKEND_URL` env in prod.

## BUILD (in order, ~3 hours)

1. **Install:** `cd packages/frontend && npm i zod @radix-ui/react-dialog`
2. **AppShell** (`src/AppShell.tsx`) — 2-zone grid: ScoutPanel left (260px), Center fills rest. Drop the right-rail Council View (collapse to 6 status dots in header).
3. **`useSSE` hook** (`src/hooks/useSSE.ts`) — browser-native `EventSource`. Subscribe to ALL event types from `EventTypeMap`. Use `safeParseEvent` (logs+ignores invalid). Let browser auto-reconnect on disconnect.
4. **`useScoutEvents`** + **`useRunEvents`** — thin wrappers around useSSE pre-bound to their endpoints.
5. **`useReducer`** state machine (`src/state/runReducer.ts`) — reduces over `AnyEvent`; derives `RunState` per `02-front.md §4`.
6. **ScoutPanel** (`src/components/ScoutPanel.tsx`):
   - Mount: fetch `GET /api/scout/state` once + subscribe to `/api/scout/events`
   - Render: tick count, latest alert card (if any), candidates list (top 10), collapsible `<details>` with monospace `ls -la` block
7. **RunControls** (`src/components/RunControls.tsx`) — topic input + START button → `POST /api/runs` with `{topic, mode:'live'}` → set `runId` in state.
8. **PlanApprovalModal** (Radix Dialog) — opens on `research.plan_proposed`; textarea pre-filled with `plan_md`; "Approve" / "Approve with edits" → `POST /api/runs/:id/plan-approval` with `{modifications?: textarea_value_if_changed}`.
9. **DiffView (CENTERPIECE)** (`src/components/DiffView.tsx`):
   - Left column: `state.draftMd` rendered with current Write token highlighted
   - Right column: `state.rewriteMd` with inline `VoiceDiff` highlights — green inserts, red strikethroughs, hover-reveal `reason` tooltip
   - Verify mode: red flash on the discrepancy span, fade to green 1.2s after resolution
10. **VerifyOverlay** (`src/components/VerifyOverlay.tsx`) — slides in from right on `verify.discrepancy`; shows `original_claim` vs `drift_text` + source URL + resolution badge. Auto-collapses after 4s.
11. **MultiplexBoard** (`src/components/MultiplexBoard.tsx`) — 2 cards:
    - TTS: `<audio controls src={result_url}>` once `multiplex.job_completed` for `tts` fires
    - Carousel: 3 thumbnail squares (4:5); click to enlarge (simple overlay, no lightbox lib)
    - Drop Radio/Veo cards entirely
12. **ProofBeat** (`src/components/ProofBeat.tsx`) — on `run.completed`, render iframe to `import.meta.env.VITE_PROOF_URL`; if env var absent, hide.
13. **Visual identity:** sage + amber + gold dark palette already shipped at `caee391`/`23fe61c`. Use existing tokens. DO NOT re-theme.
14. **Local smoke test:** `npm run dev`, start a run, verify SSE delivers events and components react.

## DROP completely
- Council View 6-panel right rail (use header dots instead)
- Per-stage thought expansion modal
- Tier 2 multiplex cards (Radio + Veo)
- Lightbox component
- Tests / Storybook
- Lint cleanup
- Auto-cache-fallback button (backend handles transparently)
- ESLint / TS strict-mode polish — `// @ts-ignore` and move on

## Cadence
- Commit + push every 15 min: `front: <what you did>`
- If you hit a contract gap, leave a `// SPEC-QUESTION:` comment + keep going
- Pull `git pull --rebase` before each commit

## Acceptance (must pass by 4:15pm)
- [x] `npm run dev` boots; opens on localhost:5173 against backend on :3000 — boots on 5180 (5173 busy), backend deferred
- [ ] ScoutPanel renders ≥3 candidates (live or cached fallback) — empty state correct; backend pending
- [ ] Start a run → run_id appears in URL or state within 500ms — wired, backend pending
- [ ] Plan modal opens within 60s of start; approve closes it — wired, backend pending
- [ ] DiffView renders ≥6 voice diffs visibly highlighted — wired, backend pending
- [ ] VerifyOverlay slides in once + resolves — wired, backend pending
- [ ] MultiplexBoard plays TTS + shows 3 carousel thumbs — wired, backend pending
- [x] Whole demo plays end-to-end without crash — verified at empty state; backend-dependent paths still pending

## Hard stop
**4:15pm PDT.** Whatever works ships. Don't keep building.

GO.
