// At boot: continue a running break or exam from the session store (AC37, AC44).
import type { SessionStore } from '../storage/session-store';
import type { AppEnv } from './app-env';
import { resumeExam } from './exam-flow';

export type ResumeResult = 'break' | 'exam' | 'none';

/**
 * Looks in the session store. A saved break reopens on the question it was on. A broken or
 * unreadable record is ignored, so the world always opens.
 */
export async function resumeRunningSession(
  sessions: Pick<SessionStore, 'load'> | null,
  env: AppEnv,
): Promise<ResumeResult> {
  if (!sessions) return 'none';
  let saved;
  try {
    saved = await sessions.load();
  } catch {
    return 'none';
  }
  if (!saved) return 'none';
  if (saved.kind === 'break') {
    env.breaks.start(); // finds the saved break itself
    return 'break';
  }
  return resumeExam(saved, env) ? 'exam' : 'none';
}
