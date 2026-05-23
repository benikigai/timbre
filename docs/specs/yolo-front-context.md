# YOLO Front — Context Snapshot

**Started:** 2026-05-23 ~12:55 PDT
**Hard stop:** 16:15 PDT
**Branch:** main (front spec overrides /yolo branch convention)
**Status:** Execution in progress

## Already shipped before YOLO start
- Task 1 (install deps): zod, diff, @radix-ui/react-dialog, @timbre/shared file-dep — commit `6ab000c`
- Task 3 (useSSE generic hook): shipped as `hooks/useEventStream.ts` — commit `6ab000c`
- Task 4 (useScoutEvents + useRunEvents): commit `6ab000c`
- Task 5 (useReducer state machine): `state/runReducer.ts` + `state/runStateTypes.ts` + `hooks/useRunStateMachine.ts` — commit `6ab000c`
- Task 13 (visual identity): sage+amber tokens in `index.css` + `theme/tokens.ts` — commit `17d3848`
- Primitives shipped: `GlassPanel`, `PulsingDot`, `DiffSpan` — commit `17d3848`
- Contract drift from spec terminal committed on their behalf — commit `6bd6024`

## Remaining tasks (in execution order)
- Task 2: AppShell + Header (status dots collapse Council)
- Task 6: ScoutPanel + useScoutState hook
- Task 7: RunControls
- Task 8: PlanApprovalModal (Radix Dialog)
- Task 9: DiffView (centerpiece)
- Task 10: VerifyOverlay
- Task 11: MultiplexBoard (2 cards only — drop Radio/Veo)
- Task 12: ProofBeat (iframe if env var set)
- Task 14: Local smoke test

## Critical context
- The deployed site at usetimbre.ai is the static `public/index.html`, NOT the Vite app — so frontend breakage doesn't affect users.
- `vercel.json` still serves `public/`. After AppShell ships, update vercel.json to point at packages/frontend build (decide near end).
- Backend at localhost:3000 — back terminal owns. May or may not be reachable during local smoke test.
- Per spec: DROP Council right-rail, Tier 2 multiplex (Radio/Veo), tests/lint polish.
- Per spec: use existing sage+amber tokens. DO NOT re-theme.

## Open risks
- Old App.tsx + 4 components in components/ depend on old useSSE — will be moved to _legacy/ before AppShell rewrite.
- TS strict — `// @ts-ignore` is explicitly allowed per spec to move fast.
