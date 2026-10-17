// Play timer, exam timer, heartbeat gap rule and the timer matrix (PRD 4.4). All pure.

import type { Clock } from './clock';

/** A gap bigger than this between two heartbeats is not counted (AC113). */
export const MAX_HEARTBEAT_GAP_MS = 5000;
export const HEARTBEAT_INTERVAL_MS = 1000;

export type ScreenKind = 'world' | 'kid-overlay' | 'learn' | 'exam' | 'parent';

export interface TimerSituation {
  screen: ScreenKind;
  /** "Draai je iPad" is showing. */
  portrait: boolean;
  /** Window too small is showing. */
  tooSmall: boolean;
  /** Page is visible and focused. False for background, lock, Control Center. */
  visible: boolean;
  /** Exam only: the last answer is given, so the exam timer is done. */
  examFinished?: boolean;
}

export interface TimerRuns {
  play: boolean;
  exam: boolean;
}

/** The timer matrix from PRD 4.4. */
export function timerMatrix(s: TimerSituation): TimerRuns {
  if (!s.visible || s.portrait || s.tooSmall || s.screen === 'parent') {
    return { play: false, exam: false };
  }
  switch (s.screen) {
    case 'world':
      return { play: true, exam: false };
    case 'exam':
      return { play: false, exam: !s.examFinished };
    default:
      return { play: false, exam: false };
  }
}

/**
 * Heartbeat gap rule. Call `tick()` every second and on visibility events.
 * It returns the milliseconds to count: 0 for the first tick, after `reset()`,
 * and when the gap is over 5 seconds or the clock went back.
 */
export interface Heartbeat {
  tick(): number;
  /** Forget the last tick (page hidden or screen changed). The next tick counts 0. */
  reset(): void;
}

export function createHeartbeat(clock: Clock, maxGapMs = MAX_HEARTBEAT_GAP_MS): Heartbeat {
  let last: number | null = null;
  return {
    tick() {
      const now = clock.now();
      const prev = last;
      last = now;
      if (prev === null) return 0;
      const gap = now - prev;
      if (gap < 0 || gap > maxGapMs) return 0;
      return gap;
    },
    reset() {
      last = null;
    },
  };
}

/** A countdown that only moves when told how much time to count. */
export interface Countdown {
  readonly totalMs: number;
  remainingMs(): number;
  /** Count down by `ms` (ignored if not positive). Returns true when it has just reached 0. */
  advance(ms: number): boolean;
  expired(): boolean;
  /** Start over with a full timer, or with the given time (clamped to 0..total). */
  reset(remainingMs?: number): void;
}

export function createCountdown(totalMs: number, remainingMs: number = totalMs): Countdown {
  const clampTo = (v: number): number => Math.min(totalMs, Math.max(0, Number.isFinite(v) ? v : totalMs));
  let left = clampTo(remainingMs);
  return {
    totalMs,
    remainingMs: () => left,
    advance(ms) {
      if (left <= 0 || !(ms > 0)) return false;
      left = Math.max(0, left - ms);
      return left === 0;
    },
    expired: () => left <= 0,
    reset(v) {
      left = clampTo(v ?? totalMs);
    },
  };
}

/** Play timer from the setting "Leerpauze elke X minuten". `saved` is `timers.playMsLeft`. */
export function createPlayTimer(breakEveryMinutes: number, saved: number | null = null): Countdown {
  const total = Math.max(1, breakEveryMinutes) * 60_000;
  return createCountdown(total, saved ?? total);
}

/** Exam timer. `limitMinutes` null means no limit: returns null. `saved` is `timers.examMsLeft`. */
export function createExamTimer(limitMinutes: number | null, saved: number | null = null): Countdown | null {
  if (limitMinutes === null || !(limitMinutes > 0)) return null;
  const total = limitMinutes * 60_000;
  return createCountdown(total, saved ?? total);
}

/** "4:12" for the HUD. Rounds up so it shows 0:00 only at zero. */
export function formatCountdown(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Text for the play HUD, e.g. "Leerpauze over 4:12". */
export function playTimerLabel(ms: number): string {
  return `Leerpauze over ${formatCountdown(ms)}`;
}

/** Last 30 seconds: the countdown grows and pulses. */
export function isWarning(ms: number): boolean {
  return ms > 0 && ms <= 30_000;
}

/** Last 10 seconds: soft tick. */
export function isTickTime(ms: number): boolean {
  return ms > 0 && ms <= 10_000;
}
