// The bubble clock (v18, AC211, AC212, AC213): pure state, no timers. The monster system feeds it play time.
// Rules (decisions 132 and 135): it moves only when `canRun` (bubble on, a knight or 30 points, nothing out).
// At 10 minutes it is due. A break due in under 60 s of play time holds it until the break ends, then 30 s of play
// time. No valid spot: try again every 5 s of play time. When a bubble shows the clock is 0 again.
import { AFTER_BREAK_MS, BUBBLE_EVERY_MS, BREAK_NEAR_MS, SPOT_RETRY_MS } from './monster-types';

export interface ClockRules {
  /** Bubble switch on, and a knight owned or at least 30 points, and nothing out. */
  canRun: boolean;
  /** Play time until the next break, from the timer driver. */
  remainingPlayMs: number;
}

export interface BubbleClock {
  /** Counts `ms` of play time. True when the system should try to show the bubble now. */
  advance(ms: number, rules: ClockRules): boolean;
  /** A learning break finished. */
  breakFinished(): void;
  /** The bubble shows: the clock is 0 and saved at once. */
  shown(): void;
  /** No valid spot: wait `SPOT_RETRY_MS` of play time. */
  noSpot(): void;
  /** Sets the clock (hook, load). Clears every wait. */
  set(ms: number, persist?: boolean): void;
  ms(): number;
  isDue(): boolean;
}

export interface BubbleClockOptions {
  initialMs?: number;
  /** Saves the clock. At most once per whole second of clock time, and at once on `shown` and `set`. */
  save?: (ms: number) => void;
}

const clampMs = (ms: number) => (Number.isFinite(ms) ? Math.min(BUBBLE_EVERY_MS, Math.max(0, ms)) : 0);

export function createBubbleClock(options: BubbleClockOptions = {}): BubbleClock {
  let ms = clampMs(options.initialMs ?? 0);
  let due = false;
  let holdForBreak = false;
  let afterBreakMs: number | null = null;
  let retryMs = 0;
  let savedSecond = Math.floor(ms / 1000);

  function save(force: boolean) {
    const sec = Math.floor(ms / 1000);
    if (!force && sec === savedSecond) return;
    savedSecond = sec;
    options.save?.(ms);
  }

  return {
    advance(delta, rules) {
      if (!rules.canRun || !(delta > 0)) return false;
      if (!due) {
        ms = Math.min(BUBBLE_EVERY_MS, ms + delta);
        save(false);
        if (ms < BUBBLE_EVERY_MS) return false;
        due = true;
        retryMs = 0;
        if (rules.remainingPlayMs < BREAK_NEAR_MS) {
          holdForBreak = true;
          return false;
        }
        return true;
      }
      if (holdForBreak) return false;
      if (afterBreakMs !== null) {
        afterBreakMs += delta;
        if (afterBreakMs < AFTER_BREAK_MS) return false;
        afterBreakMs = null;
        return true;
      }
      retryMs -= delta;
      return retryMs <= 0;
    },
    breakFinished() {
      if (due && holdForBreak) {
        holdForBreak = false;
        afterBreakMs = 0;
      }
    },
    shown() {
      ms = 0;
      due = false;
      holdForBreak = false;
      afterBreakMs = null;
      retryMs = 0;
      save(true);
    },
    noSpot() {
      retryMs = SPOT_RETRY_MS;
    },
    set(next, persist = true) {
      ms = clampMs(next);
      due = false;
      holdForBreak = false;
      afterBreakMs = null;
      retryMs = 0;
      if (persist) save(true);
      else savedSecond = Math.floor(ms / 1000);
    },
    ms: () => ms,
    isDue: () => due,
  };
}
