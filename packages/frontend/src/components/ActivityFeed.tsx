// ActivityFeed — surfaces every agent interaction across all stages as a
// chronological stream. Pulled from RunState (which the reducer populates
// from raw SSE events). One item per: thought / tool call / citation /
// chart / voice diff / discrepancy / multiplex job.
//
// Ordering: stage progression (curate → research → write → voice → verify →
// multiplex), then within-stage append order. Tracks have stable colors so
// the feed feels organized as it fills.

import type { RunState } from "../state/runStateTypes";
import type { Candidate, StageId, VoiceDiff, Discrepancy } from "@timbre/shared/contracts";

interface ActivityFeedProps {
  state: RunState;
}

type ItemKind =
  | "thought"
  | "tool_call"
  | "citation"
  | "chart"
  | "voice_diff"
  | "discrepancy"
  | "multiplex_job"
  | "stage_complete";

interface ActivityItem {
  key: string;
  stage: Exclude<StageId, "scout"> | "multiplex";
  kind: ItemKind;
  // Render payload — typed loosely so we can pass anything per kind.
  data: unknown;
}

const STAGE_ORDER: Array<Exclude<StageId, "scout">> = [
  "curate",
  "research",
  "write",
  "voice",
  "verify",
  "multiplex",
];

const STAGE_LABEL: Record<Exclude<StageId, "scout">, string> = {
  curate: "Curate",
  research: "Research",
  write: "Write",
  voice: "Voice",
  verify: "Verify",
  multiplex: "Multiplex",
};

// Accent color per stage — uses palette tokens.
const STAGE_ACCENT: Record<Exclude<StageId, "scout">, string> = {
  curate: "text-[color:var(--color-sage)] border-[color:var(--color-sage)]/30",
  research: "text-[color:var(--color-amber)] border-[color:var(--color-amber)]/30",
  write: "text-[color:var(--color-gold)] border-[color:var(--color-gold)]/30",
  voice: "text-[color:var(--color-amber-hot)] border-[color:var(--color-amber-hot)]/30",
  verify: "text-[color:var(--color-warn)] border-[color:var(--color-warn)]/30",
  multiplex: "text-[color:var(--color-sage-deep)] border-[color:var(--color-sage-deep)]/30",
};

function buildItems(state: RunState): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const stage of STAGE_ORDER) {
    // 1. thoughts (includes formatted tool_call lines per reducer)
    const thoughts = state.thoughts[stage];
    thoughts.forEach((t, i) => {
      const isToolCall = t.startsWith("↳ tool:");
      items.push({
        key: `${stage}-thought-${i}`,
        stage,
        kind: isToolCall ? "tool_call" : "thought",
        data: t,
      });
    });
    // 2. citations for this stage
    state.citations
      .filter((c) => c.stage === stage)
      .forEach((c, i) => {
        items.push({
          key: `${stage}-cit-${i}`,
          stage,
          kind: "citation",
          data: c,
        });
      });
    // 3. charts for this stage (only research per api-contracts)
    if (stage === "research") {
      state.charts.forEach((c, i) => {
        items.push({ key: `${stage}-chart-${i}`, stage, kind: "chart", data: c });
      });
    }
    // 4. voice diffs (stage = voice)
    if (stage === "voice") {
      state.diffs.forEach((d, i) => {
        items.push({ key: `voice-diff-${i}`, stage, kind: "voice_diff", data: d });
      });
    }
    // 5. discrepancies (stage = verify)
    if (stage === "verify") {
      state.discrepancies.forEach((d, i) => {
        items.push({ key: `verify-disc-${i}`, stage, kind: "discrepancy", data: d });
      });
    }
    // 6. multiplex jobs (stage = multiplex)
    if (stage === "multiplex") {
      Object.entries(state.multiplexJobs).forEach(([job, st]) => {
        items.push({
          key: `mx-${job}`,
          stage,
          kind: "multiplex_job",
          data: { job, ...st },
        });
      });
    }
    // 7. stage complete marker (if done)
    if (state.stages[stage].status === "done") {
      items.push({
        key: `${stage}-done`,
        stage,
        kind: "stage_complete",
        data: state.stages[stage],
      });
    }
  }
  return items;
}

function StageBadge({ stage }: { stage: ActivityItem["stage"] }) {
  return (
    <span
      className={`shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STAGE_ACCENT[stage as Exclude<StageId, "scout">]}`}
    >
      {STAGE_LABEL[stage as Exclude<StageId, "scout">]}
    </span>
  );
}

function ItemRow({ item }: { item: ActivityItem }) {
  const badge = <StageBadge stage={item.stage} />;
  switch (item.kind) {
    case "thought": {
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <span className="text-[color:var(--color-ink-dim)] text-sm leading-relaxed">
            <span className="text-[color:var(--color-ink-mute)]">▸ </span>
            {item.data as string}
          </span>
        </div>
      );
    }
    case "tool_call": {
      const raw = item.data as string; // "↳ tool: google_search({\"query\":\"...\"})"
      const m = raw.match(/^↳ tool: (\w+)\(([\s\S]*)\)$/);
      const tool = m?.[1] ?? "tool";
      const argsStr = m?.[2] ?? "";
      let pretty = argsStr;
      try {
        const parsed = JSON.parse(argsStr) as Record<string, unknown>;
        const k = Object.keys(parsed)[0];
        if (k) pretty = String(parsed[k]);
      } catch {
        /* fallthrough */
      }
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-[11px] text-[color:var(--color-sage)]">
              tool · {tool}
            </span>
            <span className="text-[color:var(--color-ink)] text-sm font-mono break-all">
              {pretty}
            </span>
          </div>
        </div>
      );
    }
    case "citation": {
      const c = item.data as { url: string; title?: string; snippet?: string };
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-[11px] text-[color:var(--color-amber)]">
              cited
            </span>
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--color-ink)] text-sm hover:text-[color:var(--color-amber)] underline-offset-2 hover:underline"
            >
              {c.title ?? c.url}
            </a>
            {c.snippet && (
              <span className="text-[color:var(--color-ink-mute)] text-xs leading-relaxed line-clamp-2">
                {c.snippet}
              </span>
            )}
          </div>
        </div>
      );
    }
    case "chart": {
      const c = item.data as { caption: string; data_b64: string; mime_type: string };
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="font-mono text-[11px] text-[color:var(--color-amber)]">
              chart generated
            </span>
            {c.caption && (
              <span className="text-[color:var(--color-ink-dim)] text-sm">
                {c.caption}
              </span>
            )}
            {c.data_b64 && (
              <img
                src={`data:${c.mime_type};base64,${c.data_b64}`}
                alt={c.caption}
                className="max-w-xs rounded border border-[color:var(--color-hairline)]"
              />
            )}
          </div>
        </div>
      );
    }
    case "voice_diff": {
      const d = item.data as VoiceDiff;
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-[11px] text-[color:var(--color-amber-hot)]">
              diff · {d.op}
            </span>
            {d.original_text && (
              <span className="text-sm line-through text-[color:var(--color-danger)]/70 leading-relaxed">
                {d.original_text}
              </span>
            )}
            {d.rewritten_text && (
              <span className="text-sm text-[color:var(--color-good)] leading-relaxed">
                {d.rewritten_text}
              </span>
            )}
            <span className="text-[11px] text-[color:var(--color-ink-mute)] italic">
              {d.reason}
            </span>
          </div>
        </div>
      );
    }
    case "discrepancy": {
      const d = item.data as Discrepancy;
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-[11px] text-[color:var(--color-warn)]">
              drift detected · {d.resolution}
            </span>
            <span className="text-sm text-[color:var(--color-ink-dim)]">
              <strong className="text-[color:var(--color-ink)]">claim:</strong>{" "}
              {d.original_claim}
            </span>
            <span className="text-sm">
              <strong className="text-[color:var(--color-danger)]">drift:</strong>{" "}
              <span className="line-through text-[color:var(--color-danger)]/70">
                {d.drift_text}
              </span>
            </span>
            <span className="text-sm">
              <strong className="text-[color:var(--color-good)]">corrected to:</strong>{" "}
              <span className="text-[color:var(--color-good)]">{d.final_text}</span>
            </span>
            {d.sources[0] && (
              <a
                href={d.sources[0].url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[color:var(--color-ink-mute)] hover:text-[color:var(--color-amber)] underline-offset-2 hover:underline"
              >
                source: {new URL(d.sources[0].url).hostname}
              </a>
            )}
          </div>
        </div>
      );
    }
    case "multiplex_job": {
      const d = item.data as { job: string; status: string; url?: string };
      const dot =
        d.status === "done"
          ? "bg-[color:var(--color-good)]"
          : d.status === "failed"
          ? "bg-[color:var(--color-danger)]"
          : "bg-[color:var(--color-amber)]";
      return (
        <div className="flex gap-3 items-start">
          {badge}
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span className="font-mono text-[11px] text-[color:var(--color-ink-dim)]">
              {d.job} · {d.status}
            </span>
            {d.url && (
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[color:var(--color-amber)] hover:underline"
              >
                open ↗
              </a>
            )}
          </div>
        </div>
      );
    }
    case "stage_complete":
      return (
        <div className="flex gap-3 items-center pl-2 border-l border-[color:var(--color-good)]/30">
          {badge}
          <span className="text-[11px] text-[color:var(--color-good)] font-mono">
            ✓ stage complete
          </span>
        </div>
      );
  }
}

export function ActivityFeed({ state }: ActivityFeedProps) {
  const items = buildItems(state);
  if (!state.runId) return null;
  return (
    <div className="rounded-2xl bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] backdrop-blur-md flex flex-col min-h-[200px]">
      <div className="flex items-baseline justify-between px-5 py-3 border-b border-[color:var(--color-hairline)]">
        <h3 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
          Show your work
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-ink-mute)]">
          {items.length} interaction{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[60vh] px-5 py-4 flex flex-col gap-3">
        {items.length === 0 ? (
          <span className="text-[color:var(--color-ink-mute)] text-sm italic">
            Waiting for the first interaction…
          </span>
        ) : (
          items.map((item) => <ItemRow key={item.key} item={item} />)
        )}
      </div>
    </div>
  );
}

// Silence unused-import warning in case Candidate is needed later for thought
// content type narrowing.
export type _CandidateUnused = Candidate;
