// Lifted from the original App.tsx body — full dashboard at /demo.
import { useState } from "react";
import { AppShell } from "../AppShell";
import { ScoutPanel } from "../components/ScoutPanel";
import { DemoHero } from "../components/DemoHero";
import { RunControls } from "../components/RunControls";
import { DiffView } from "../components/DiffView";
import { ActivityFeed } from "../components/ActivityFeed";
import { MultiplexBoard } from "../components/MultiplexBoard";
import { PlanApprovalModal } from "../components/PlanApprovalModal";
import { VerifyOverlay } from "../components/VerifyOverlay";
import { ProofBeat } from "../components/ProofBeat";
import { useRunStateMachine } from "../hooks/useRunStateMachine";
import { useScoutState } from "../hooks/useScoutState";

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
  const { state, beat, connected: runConnected } = useRunStateMachine(runId, {
    demoCached: flags.demoCached,
    cacheFixture: flags.cacheFixture,
  });
  const { scoutState, connected: scoutConnected } = useScoutState();

  return (
    <AppShell
      state={state}
      scoutConnected={scoutConnected}
      runConnected={runConnected}
      leftPanel={<ScoutPanel scoutState={scoutState} />}
      centerContent={
        <div className="p-6 flex flex-col gap-6 min-h-full">
          {!runId ? (
            <DemoHero onRunStarted={setRunId} />
          ) : (
            <>
              <RunControls onRunStarted={setRunId} runId={runId} />
              <DiffView state={state} />
              <ActivityFeed state={state} />
              <MultiplexBoard state={state} />
              {beat === "proof" && <ProofBeat />}
            </>
          )}
        </div>
      }
      overlays={
        <>
          <PlanApprovalModal state={state} runId={runId} />
          <VerifyOverlay state={state} />
        </>
      }
    />
  );
}
