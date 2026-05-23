// Gate for the post-plan, pre-Write voice-profile verification.
// Mirrors planApproval.ts — orchestrator awaits a pending promise per run_id;
// POST /api/runs/:id/voice-profile-approval resolves it with optional
// per-run overrides to the voice DNA.

import type { VoiceProfile } from "@timbre/shared";

export interface VoiceProfileApprovalResult {
  // The user-edited profile (or original if no edits).
  approved_profile: VoiceProfile;
}

interface PendingApproval {
  resolve: (result: VoiceProfileApprovalResult) => void;
  reject: (err: Error) => void;
}

const pending = new Map<string, PendingApproval>();

export function registerVoicePending(
  runId: string,
): Promise<VoiceProfileApprovalResult> {
  return new Promise((resolve, reject) => {
    pending.set(runId, {
      resolve: (result) => {
        pending.delete(runId);
        resolve(result);
      },
      reject: (err) => {
        pending.delete(runId);
        reject(err);
      },
    });
  });
}

export function approveVoicePending(
  runId: string,
  approvedProfile: VoiceProfile,
): boolean {
  const p = pending.get(runId);
  if (!p) return false;
  p.resolve({ approved_profile: approvedProfile });
  return true;
}

export function hasVoicePending(runId: string): boolean {
  return pending.has(runId);
}

// In-memory store of per-run voice-profile overrides — used by Refine later.
const overrides = new Map<string, VoiceProfile>();

export function setRunVoiceProfile(runId: string, profile: VoiceProfile): void {
  overrides.set(runId, profile);
}

export function getRunVoiceProfile(runId: string): VoiceProfile | undefined {
  return overrides.get(runId);
}
