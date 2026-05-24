// Lifted from the original App.tsx body — full dashboard at /demo.
import { useState } from "react";
import type { Candidate } from "@timbre/shared/contracts";
import { AppShell } from "../AppShell";
import { ScoutPanel } from "../components/ScoutPanel";
import { DemoHero } from "../components/DemoHero";
import { RunControls } from "../components/RunControls";
import { DiffView } from "../components/DiffView";
import { ActivityFeed } from "../components/ActivityFeed";
import { MultiplexBoard } from "../components/MultiplexBoard";
import { PlanApprovalModal } from "../components/PlanApprovalModal";
import { VoiceProfileModal } from "../components/VoiceProfileModal";
import { StyleProfilePanel } from "../components/StyleProfilePanel";
import { VerifyOverlay } from "../components/VerifyOverlay";
import { EditableDraft } from "../components/EditableDraft";
import { ProofBeat } from "../components/ProofBeat";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { useRunStateMachine } from "../hooks/useRunStateMachine";
import { useScoutState } from "../hooks/useScoutState";
import { startRun } from "../api/runs";

function getDemoFlags() {
  if (typeof window === "undefined") return { demoCached: false, cacheFixture: undefined as string | undefined };
  const params = new URLSearchParams(window.location.search);
  return {
    demoCached: params.get("demo") === "cached",
    cacheFixture: params.get("cache_fixture") ?? undefined,
  };
}

interface DemoPageProps {
  // "cached" = locked surface, single play button, no live API entry points.
  //   Used at /app/ — the URL judges hit. Can't break.
  // "live" = full playground: Scout candidates clickable, live Gemini API
  //   picker, advanced controls, refine inputs. At /app/live for iteration.
  mode?: "cached" | "live";
}

export default function DemoPage({ mode = "live" }: DemoPageProps) {
  const isCachedOnly = mode === "cached";
  const [runId, setRunId] = useState<string | null>(null);
  const flags = getDemoFlags();
  const { state, beat, connected: runConnected, reset } = useRunStateMachine(runId, {
    demoCached: flags.demoCached,
    cacheFixture: flags.cacheFixture,
  });
  const { scoutState, connected: scoutConnected, scanning: scoutScanning } = useScoutState();

  const handleReset = () => {
    reset();
    setRunId(null);
  };

  // Click a Scout candidate → start live run with that title as the topic.
  const handleCandidateClick = async (c: Candidate) => {
    if (runId) return; // already running
    try {
      const resp = await startRun({
        topic: c.title,
        candidate_id: c.id,
        mode: "live",
      });
      setRunId(resp.run_id);
    } catch (err) {
      console.error("Failed to start from Scout candidate", err);
    }
  };

  return (
    <AppShell
      state={state}
      scoutConnected={scoutConnected}
      runConnected={runConnected}
      onReset={runId ? handleReset : undefined}
      leftPanel={
        <>
          <ErrorBoundary label="ScoutPanel">
            <ScoutPanel
              scoutState={scoutState}
              // Cached mode: candidates are read-only (no live-run kick off)
              onCandidateClick={!runId && !isCachedOnly ? handleCandidateClick : undefined}
              scanning={scoutScanning}
            />
          </ErrorBoundary>
          <ErrorBoundary label="StyleProfilePanel">
            <StyleProfilePanel
              overrideProfile={state.voiceGate?.approved ? state.voiceGate.profile : null}
              edited={state.voiceGate?.edited ?? false}
            />
          </ErrorBoundary>
        </>
      }
      centerContent={
        !runId ? (
          // Pre-run: editorial hero, no card chrome, horizontal padding scales
          <div className="px-6 md:px-12 min-h-full flex flex-col">
            <ErrorBoundary label="DemoHero">
              <DemoHero onRunStarted={setRunId} cachedOnly={isCachedOnly} />
            </ErrorBoundary>
            {!isCachedOnly && (
              <p className="mt-6 font-mono text-[10px] text-[color:var(--color-ink-mute)]">
                ↻ Locked cached demo is at <a href="/app/" className="text-[color:var(--color-sage)] hover:underline">/app/</a>
              </p>
            )}
            {isCachedOnly && (
              <p className="mt-6 font-mono text-[10px] text-[color:var(--color-ink-mute)]">
                ⚡ Live API playground (Scout candidates, real Gemini calls):{" "}
                <a href="/app/live" className="text-[color:var(--color-sage)] hover:underline">/app/live</a>
              </p>
            )}
          </div>
        ) : (
          // Running: dashboard layout — each panel wrapped so any single crash
          // (e.g. EditableDraft's fetch erroring at run.completed) stays
          // contained and doesn't blank the whole center.
          <div className="p-6 flex flex-col gap-6 min-h-full">
            {/* RunControls only on live page — hides the topic input + LIVE
                toggle from the locked cached demo so judges can't switch modes. */}
            {!isCachedOnly && (
              <ErrorBoundary label="RunControls">
                <RunControls onRunStarted={setRunId} runId={runId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary label="DiffView">
              <DiffView state={state} />
            </ErrorBoundary>
            <ErrorBoundary label="ActivityFeed">
              <ActivityFeed state={state} />
            </ErrorBoundary>
            {state.completed && (
              <ErrorBoundary label="EditableDraft">
                <EditableDraft state={state} runId={runId} />
              </ErrorBoundary>
            )}
            <ErrorBoundary label="MultiplexBoard">
              <MultiplexBoard state={state} />
            </ErrorBoundary>
            {beat === "proof" && (
              <ErrorBoundary label="ProofBeat">
                <ProofBeat />
              </ErrorBoundary>
            )}
          </div>
        )
      }
      overlays={
        <>
          <ErrorBoundary label="PlanApprovalModal">
            <PlanApprovalModal state={state} runId={runId} />
          </ErrorBoundary>
          <ErrorBoundary label="VoiceProfileModal">
            <VoiceProfileModal state={state} runId={runId} />
          </ErrorBoundary>
          <ErrorBoundary label="VerifyOverlay">
            <VerifyOverlay state={state} />
          </ErrorBoundary>
        </>
      }
    />
  );
}
