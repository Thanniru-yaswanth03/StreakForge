import type {
  SubmissionState,
  StateTransitionLog,
  DetectedSubmission
} from './types';

// Valid transitions mapping
export const ALLOWED_TRANSITIONS: Record<SubmissionState, SubmissionState[]> = {
  DETECTED: ['VALIDATING', 'FAILED'],
  VALIDATING: ['ACCEPTED', 'REJECTED', 'FAILED'],
  ACCEPTED: ['SOURCE_RETRIEVAL_PENDING', 'EXPORT_PENDING', 'FAILED'],
  REJECTED: ['FAILED'], // Rejected submissions do not export, but can be archived locally
  SOURCE_RETRIEVAL_PENDING: ['SOURCE_RETRIEVED', 'FAILED'],
  SOURCE_RETRIEVED: ['EXPORT_PENDING', 'FAILED'],
  EXPORT_PENDING: ['EXPORTING', 'SYNCED', 'FAILED'], // SYNCED if already registered as duplicate
  EXPORTING: ['SYNCED', 'FAILED', 'RETRY_PENDING'],
  SYNCED: [], // Terminal success
  FAILED: ['RETRY_PENDING', 'VALIDATING'], // Can be retried manually or by alarm
  RETRY_PENDING: ['EXPORTING', 'FAILED']
};

export class SubmissionStateMachine {
  /**
   * Validates whether transition from currentState to targetState is permitted
   */
  public static canTransition(from: SubmissionState, to: SubmissionState): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Execute state transition on a submission, enforcing valid transition rules
   * and generating an immutable audit log entry.
   */
  public static transition(
    submission: DetectedSubmission,
    toState: SubmissionState,
    reason?: string,
    metadata?: Record<string, any>
  ): { submission: DetectedSubmission; log: StateTransitionLog } {
    const fromState = submission.state;

    if (!this.canTransition(fromState, toState)) {
      throw new Error(
        `Invalid submission state transition: Cannot move from ${fromState} to ${toState}.`
      );
    }

    // Guard: Verify code presence when transitioning to SOURCE_RETRIEVED
    if (toState === 'SOURCE_RETRIEVED') {
      if (!submission.code || submission.code.trim().length === 0) {
        throw new Error(
          'Guard check failed: Cannot transition to SOURCE_RETRIEVED with empty source code.'
        );
      }
    }

    // Guard: Verify verdict is Accepted when transitioning to ACCEPTED
    if (toState === 'ACCEPTED' && submission.verdict !== 'Accepted') {
      throw new Error(
        `Guard check failed: Submission verdict is "${submission.verdict}", cannot transition to ACCEPTED.`
      );
    }

    // Update submission state
    const updated: DetectedSubmission = {
      ...submission,
      state: toState
    };

    if (toState === 'FAILED' && reason) {
      updated.errorMessage = reason;
    }

    // Generate transition log
    const log: StateTransitionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      submissionId: submission.submissionId,
      fromState,
      toState,
      timestamp: new Date().toISOString(),
      reason,
      metadata
    };

    return { submission: updated, log };
  }

  /**
   * Persists a transition log to Chrome Local Storage
   */
  public static async recordLog(log: StateTransitionLog): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    try {
      const res = await chrome.storage.local.get('transitionLogs');
      const logs: StateTransitionLog[] = res.transitionLogs || [];
      logs.unshift(log);
      // Retain the last 200 transition logs
      await chrome.storage.local.set({ transitionLogs: logs.slice(0, 200) });
    } catch {
      // Best-effort logging
    }
  }
}

