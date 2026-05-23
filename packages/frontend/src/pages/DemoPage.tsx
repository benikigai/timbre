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
import { VerifyOverlay } from "../components/VerifyOverlay";
import { EditableDraft } from "../components/EditableDraft";
import { ProofBeat } from "../components/ProofBeat";
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

export default function DemoPage() {
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
        <ScoutPanel
          scoutState={scoutState}
          onCandidateClick={!runId ? handleCandidateClick : undefined}
          scanning={scoutScanning}
        />
      }
      centerContent={
        !runId ? (
          // Pre-run: editorial hero, no card chrome, horizontal padding scales
          <div className="px-6 md:px-12 min-h-full flex flex-col">
            <DemoHero onRunStarted={setRunId} />
          </div>
        ) : (
          // Running: dashboard layout
          <div className="p-6 flex flex-col gap-6 min-h-full">
            <RunControls onRunStarted={setRunId} runId={runId} />
            <DiffView state={state} />
            <ActivityFeed state={state} />
            {state.completed && <EditableDraft state={state} />}
            <MultiplexBoard state={state} />
            {beat === "proof" && <ProofBeat />}
          </div>
        )
      }
      overlays={<><PlanApprovalModal state={state} runId={runId} /><VerifyOverlay state={state} /></>}
    />
  );
}
