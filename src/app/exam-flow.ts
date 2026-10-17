// Exam flow STUB (T43). T51a builds the real exam. Until then a saved exam session is left alone,
// so nothing is lost when the exam comes along.
import type { SessionState } from '../storage/session-store';

/** Called at boot when the session store holds a running exam. Returns true when it took over. */
export function resumeExam(_state: SessionState): boolean {
  void _state;
  return false;
}
