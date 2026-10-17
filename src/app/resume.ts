// Resumes an interrupted break or exam session at startup (T43, AC37).

import type { Records } from '../storage/records';
import type { SessionStore } from '../storage/session-store';
import { isPersistedBreakSession, type BreakFlow } from './break-flow';
import type { ExamFlow } from './exam-flow';

export interface ResumeOptions {
  sessionStore: SessionStore;
  records: Pick<Records, 'get'>;
  breakFlow: BreakFlow;
  examFlow?: ExamFlow;
}

export async function resumeSessionIfAny(
  options: ResumeOptions,
): Promise<'break' | 'exam' | null> {
  const saved = await options.sessionStore.load();
  if (saved) {
    if (saved.kind === 'break' && isPersistedBreakSession(saved)) {
      await options.breakFlow.resumeBreak(saved);
      return 'break';
    }
    if (saved.kind === 'exam' && options.examFlow?.resumeExam) {
      await options.examFlow.resumeExam(saved);
      return 'exam';
    }
    await options.sessionStore.clear();
  }

  const timers = await options.records.get('timers');
  if (timers.playMsLeft !== null && timers.playMsLeft <= 0) {
    await options.breakFlow.startBreak();
    return 'break';
  }

  return null;
}
