import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RunState } from "../state/runStateTypes";
import { approvePlan } from "../api/runs";

interface PlanApprovalModalProps {
  state: RunState;
  runId: string | null;
}

export function PlanApprovalModal({ state, runId }: PlanApprovalModalProps) {
  const open = Boolean(state.plan && !state.plan.approved);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync textarea to incoming plan_md when it first arrives.
  useEffect(() => {
    if (state.plan?.md && !draft) setDraft(state.plan.md);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plan?.md]);

  const handleApprove = async (withEdits: boolean) => {
    if (!runId || !state.plan) return;
    setSubmitting(true);
    setError(null);
    try {
      const modifications = withEdits && draft !== state.plan.md ? draft : undefined;
      await approvePlan(runId, modifications ? { modifications } : {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(40rem,calc(100vw-2rem))] max-h-[80vh] bg-[color:var(--color-bg)] border border-[color:var(--color-hairline)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="px-6 pt-5 pb-3 border-b border-[color:var(--color-hairline)]">
            <Dialog.Title className="font-[family-name:var(--font-display)] text-xl font-medium text-[color:var(--color-ink)]">
              Research plan
            </Dialog.Title>
            <Dialog.Description className="font-[family-name:var(--font-sans)] text-sm text-[color:var(--color-ink-dim)] mt-1">
              Approve as-is, or edit and approve with changes. The agent will execute against your final version.
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[16rem] bg-[color:var(--color-surface)] border border-[color:var(--color-hairline)] rounded-lg p-3 text-sm font-[family-name:var(--font-mono)] text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-sage)]/50 resize-y"
              placeholder="Plan markdown will appear here…"
              disabled={submitting}
            />
            {error && (
              <p className="mt-2 text-[11px] font-[family-name:var(--font-mono)] text-[color:var(--color-danger)]">
                {error}
              </p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[color:var(--color-hairline)] flex items-center justify-end gap-3">
            <button
              onClick={() => handleApprove(false)}
              disabled={submitting}
              className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wider px-3 py-1.5 rounded text-[color:var(--color-ink-dim)] hover:text-[color:var(--color-ink)] transition disabled:opacity-50"
            >
              Approve as written
            </button>
            <button
              onClick={() => handleApprove(true)}
              disabled={submitting || draft.trim() === ""}
              className="font-[family-name:var(--font-display)] font-medium text-sm px-4 py-1.5 rounded-md bg-[color:var(--color-amber)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-amber-hot)] transition disabled:opacity-50"
            >
              {submitting ? "Approving…" : "Approve with edits"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
