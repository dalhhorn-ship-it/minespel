// Exam flow stub for M2 (T43; full implementation in M3 T51).

import type { SessionState as StoredSessionRecord } from '../storage/session-store';

export interface ExamFlow {
  isActive(): boolean;
  resumeExam?(saved: StoredSessionRecord): Promise<void>;
  destroy(): void;
}

export function createExamFlow(): ExamFlow {
  return {
    isActive: () => false,
    async resumeExam() {
      /* implemented in M3 T51 */
    },
    destroy() {
      /* no-op in M2 */
    },
  };
}
