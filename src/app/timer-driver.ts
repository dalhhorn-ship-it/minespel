// Timer driver (T41, AC21..AC25, AC37, AC94, AC113).
// Connects the 1-second heartbeat, visibility/focus events, screen-guard, and screen manager
// to `timerMatrix`, the play countdown, the HUD countdown view, and persistent stores.

import { createSerialQueue } from '../core/serial-queue';
import { today, type Clock } from '../core/clock';
import {
  createExamTimer,
  createHeartbeat,
  createPlayTimer,
  HEARTBEAT_INTERVAL_MS,
  isTickTime,
  timerMatrix,
  type Countdown,
  type ScreenKind,
} from '../core/timers';
import { registerHook } from '../dev/e2e-hooks';
import type { GuardState, ScreenGuard } from '../platform/screen-guard';
import type { Records } from '../storage/records';
import type { Sound } from '../audio/sound';
import type { CountdownView } from '../ui/countdown';
import type { ScreenManager } from './screens';

export interface TimerDriverOptions {
  clock: Clock;
  screens: Pick<ScreenManager, 'current' | 'subscribe'>;
  guard: Pick<ScreenGuard, 'state' | 'subscribe'>;
  records: Pick<Records, 'get' | 'put' | 'update'>;
  sound?: Pick<Sound, 'play'>;
  countdownView?: CountdownView;
  initialBreakEveryMinutes: number;
  initialPlayMsLeft: number | null;
  initialWarningEnabled: boolean;
  onBreakDue: () => void;
  win?: Window;
  doc?: Document;
  /** Set false in unit tests to drive steps manually without setInterval. */
  autoStartInterval?: boolean;
}

export interface TimerDriver {
  remainingPlayMs(): number;
  setPlayRemainingMs(ms: number): void;
  /** Advance play countdown directly by `ms` (regardless of heartbeat gap) when play timer can run, or force when `force` is true. */
  advancePlayMs(ms: number, force?: boolean): void;
  resetPlayTimer(breakEveryMinutes?: number): void;
  setBreakEveryMinutes(minutes: number): void;
  setBreakWarningEnabled(enabled: boolean): void;
  isPlayRunning(): boolean;
  /**
   * Start the exam countdown (v2, AC66, AC112). `limitMinutes` null means no limit: there is no
   * countdown and `remainingExamMs()` is null. `savedMs` is `timers.examMsLeft` when resuming.
   * It counts only on screen `exam` (never while the parent layer is open, in portrait, in a too
   * small window or in the background), is saved to `timers.examMsLeft` every tick, and never
   * moves the play timer. `onExpire` runs once when it reaches 0 (also at once if `savedMs` <= 0).
   * `onTick` gets the time left after every change (for the exam screen).
   */
  startExamTimer(
    limitMinutes: number | null,
    savedMs: number | null,
    onExpire: () => void,
    onTick?: (msLeft: number) => void,
  ): void;
  /** The last answer is given or the exam was stopped: the exam timer is gone and the saved time is cleared. */
  stopExamTimer(): void;
  /** Time left on the exam countdown, or null when there is none. */
  remainingExamMs(): number | null;
  /** Advance the exam countdown by `ms` when it can run, or always when `force` is true. */
  advanceExamMs(ms: number, force?: boolean): void;
  isExamRunning(): boolean;
  /** Run one heartbeat check. */
  step(): void;
  /** Wait for any pending store writes to settle. */
  flush(): Promise<void>;
  destroy(): void;
}

export function createTimerDriver(options: TimerDriverOptions): TimerDriver {
  const win = options.win ?? (typeof window !== 'undefined' ? window : undefined);
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : undefined);

  let breakEveryMinutes = Math.max(1, options.initialBreakEveryMinutes);
  let warningEnabled = options.initialWarningEnabled;
  let playTimer: Countdown = createPlayTimer(breakEveryMinutes, options.initialPlayMsLeft);
  const heartbeat = createHeartbeat(options.clock);
  let examTimer: Countdown | null = null;
  let examFinished = false;
  let examExpiredFired = false;
  let onExamExpire: () => void = () => undefined;
  let onExamTick: ((ms: number) => void) | undefined;

  let screen: ScreenKind = options.screens.current();
  let guardState: GuardState = options.guard.state();
  let pageVisible = doc ? doc.visibilityState !== 'hidden' : true;
  let lastTickSecond: number | null = null;
  let breakTriggeredForCycle = false;
  const writes = createSerialQueue();
  let pendingWrite: Promise<void> = Promise.resolve();

  function enqueueWrite(fn: () => Promise<unknown>) {
    // Write errors are ignored (the db may be closed).
    pendingWrite = writes.run(fn);
  }

  options.countdownView?.setWarningEnabled(warningEnabled);
  options.countdownView?.update(playTimer.remainingMs());

  function runs() {
    return timerMatrix({
      screen,
      portrait: guardState.portrait,
      tooSmall: guardState.tooSmall,
      visible: pageVisible,
      examFinished,
    });
  }

  function isPlayRunning(): boolean {
    return runs().play;
  }

  function isExamRunning(): boolean {
    return examTimer !== null && !examTimer.expired() && runs().exam;
  }

  function anyRunning(): boolean {
    return isPlayRunning() || isExamRunning();
  }

  function persistExamMs(ms: number | null) {
    enqueueWrite(() => options.records.update('timers', (curr) => ({ ...curr, examMsLeft: ms })));
  }

  function applyElapsedExamMs(deltaMs: number) {
    if (!examTimer || deltaMs <= 0 || examTimer.expired()) return;
    const justExpired = examTimer.advance(deltaMs);
    const after = examTimer.remainingMs();
    persistExamMs(after);
    onExamTick?.(after);
    if ((justExpired || after <= 0) && !examExpiredFired) {
      examExpiredFired = true;
      onExamExpire();
    }
  }

  function persistPlayMs(ms: number) {
    enqueueWrite(() => options.records.update('timers', (curr) => ({ ...curr, playMsLeft: ms })));
  }

  function recordPlayTime(ms: number) {
    if (ms <= 0) return;
    const day = today(options.clock);
    enqueueWrite(() =>
      options.records.update('stats', (curr) => ({
        ...curr,
        playMsPerDay: {
          ...curr.playMsPerDay,
          [day]: (curr.playMsPerDay[day] ?? 0) + ms,
        },
      })),
    );
  }

  function applyElapsedPlayMs(deltaMs: number) {
    if (deltaMs <= 0) return;
    const before = playTimer.remainingMs();
    if (before <= 0) return;
    const counted = Math.min(before, deltaMs);
    const justExpired = playTimer.advance(deltaMs);
    const after = playTimer.remainingMs();
    options.countdownView?.update(after);
    persistPlayMs(after);
    recordPlayTime(counted);

    if (warningEnabled && isTickTime(after)) {
      const sec = Math.ceil(after / 1000);
      if (sec !== lastTickSecond) {
        lastTickSecond = sec;
        options.sound?.play('tick');
      }
    }

    if ((justExpired || after <= 0) && !breakTriggeredForCycle) {
      breakTriggeredForCycle = true;
      lastTickSecond = null;
      options.onBreakDue();
    }
  }

  function step() {
    const playRuns = isPlayRunning();
    const examRuns = isExamRunning();
    if (!playRuns && !examRuns) {
      heartbeat.reset();
      return;
    }
    const delta = heartbeat.tick();
    if (delta > 0) {
      if (playRuns) applyElapsedPlayMs(delta);
      if (examRuns) applyElapsedExamMs(delta);
    }
  }

  const unsubScreen = options.screens.subscribe((next) => {
    if (next !== screen) {
      screen = next;
      heartbeat.reset();
      if (anyRunning()) {
        heartbeat.tick();
      }
    }
  });

  const unsubGuard = options.guard.subscribe((next) => {
    if (next.portrait !== guardState.portrait || next.tooSmall !== guardState.tooSmall) {
      guardState = next;
      heartbeat.reset();
      if (anyRunning()) {
        heartbeat.tick();
      }
    }
  });

  const onVisibilityOrFocus = () => {
    const nextVisible = doc ? doc.visibilityState !== 'hidden' : true;
    if (nextVisible !== pageVisible) {
      pageVisible = nextVisible;
      heartbeat.reset();
      if (anyRunning()) {
        heartbeat.tick();
      }
    }
  };
  const onBlur = () => {
    pageVisible = false;
    heartbeat.reset();
  };
  const onFocus = () => {
    pageVisible = doc ? doc.visibilityState !== 'hidden' : true;
    heartbeat.reset();
    if (anyRunning()) {
      heartbeat.tick();
    }
  };

  doc?.addEventListener('visibilitychange', onVisibilityOrFocus);
  win?.addEventListener('pagehide', onBlur);
  win?.addEventListener('pageshow', onFocus);
  win?.addEventListener('blur', onBlur);
  win?.addEventListener('focus', onFocus);

  // Prime the heartbeat if play is currently running.
  if (anyRunning()) {
    heartbeat.tick();
  }

  const intervalId =
    options.autoStartInterval !== false && win
      ? win.setInterval(step, HEARTBEAT_INTERVAL_MS)
      : null;

  const driver: TimerDriver = {
    remainingPlayMs: () => playTimer.remainingMs(),
    setPlayRemainingMs(ms) {
      const clamped = Math.max(0, Math.min(playTimer.totalMs, ms));
      playTimer.reset(clamped);
      breakTriggeredForCycle = clamped <= 0;
      lastTickSecond = null;
      options.countdownView?.update(playTimer.remainingMs());
      persistPlayMs(playTimer.remainingMs());
      if (clamped <= 0) {
        options.onBreakDue();
      }
    },
    advancePlayMs(ms, force = false) {
      if (!force && !isPlayRunning()) return;
      applyElapsedPlayMs(ms);
    },
    resetPlayTimer(minutes) {
      if (minutes !== undefined) {
        breakEveryMinutes = Math.max(1, minutes);
      }
      playTimer = createPlayTimer(breakEveryMinutes, null);
      breakTriggeredForCycle = false;
      lastTickSecond = null;
      heartbeat.reset();
      if (anyRunning()) {
        heartbeat.tick();
      }
      options.countdownView?.update(playTimer.remainingMs());
      persistPlayMs(playTimer.remainingMs());
    },
    setBreakEveryMinutes(minutes) {
      breakEveryMinutes = Math.max(1, minutes);
      const newTotal = breakEveryMinutes * 60_000;
      const clamped = Math.min(playTimer.remainingMs(), newTotal);
      playTimer = createPlayTimer(breakEveryMinutes, clamped);
      options.countdownView?.update(playTimer.remainingMs());
      persistPlayMs(playTimer.remainingMs());
    },
    setBreakWarningEnabled(enabled) {
      warningEnabled = enabled;
      options.countdownView?.setWarningEnabled(enabled);
    },
    isPlayRunning,
    startExamTimer(limitMinutes, savedMs, onExpire, onTick) {
      examTimer = createExamTimer(limitMinutes, savedMs);
      examFinished = false;
      examExpiredFired = false;
      onExamExpire = onExpire;
      onExamTick = onTick;
      heartbeat.reset();
      if (!examTimer) {
        persistExamMs(null);
        return;
      }
      persistExamMs(examTimer.remainingMs());
      onExamTick?.(examTimer.remainingMs());
      if (examTimer.expired()) {
        examExpiredFired = true;
        onExpire();
        return;
      }
      if (anyRunning()) heartbeat.tick();
    },
    stopExamTimer() {
      examTimer = null;
      examFinished = true;
      examExpiredFired = true;
      onExamTick = undefined;
      heartbeat.reset();
      persistExamMs(null);
    },
    remainingExamMs: () => (examTimer ? examTimer.remainingMs() : null),
    advanceExamMs(ms, force = false) {
      if (!examTimer) return;
      if (!force && !isExamRunning()) return;
      applyElapsedExamMs(ms);
    },
    isExamRunning,
    step,
    flush: async () => {
      await pendingWrite;
    },
    destroy() {
      if (intervalId !== null && win) {
        win.clearInterval(intervalId);
      }
      unsubScreen();
      unsubGuard();
      doc?.removeEventListener('visibilitychange', onVisibilityOrFocus);
      win?.removeEventListener('pagehide', onBlur);
      win?.removeEventListener('pageshow', onFocus);
      win?.removeEventListener('blur', onBlur);
      win?.removeEventListener('focus', onFocus);
    },
  };

  if (__E2E__) {
    registerHook('remainingPlayMs', () => driver.remainingPlayMs());
    registerHook('setPlayRemainingMs', (ms: number) => driver.setPlayRemainingMs(ms));
    registerHook('advancePlayMs', (ms: number, force = false) => driver.advancePlayMs(ms, force));
    registerHook('resetPlayTimer', (m?: number) => driver.resetPlayTimer(m));
    registerHook('isPlayRunning', () => driver.isPlayRunning());
    registerHook('remainingExamMs', () => driver.remainingExamMs());
    registerHook('advanceExamMs', (ms: number, force = false) => driver.advanceExamMs(ms, force));
    registerHook('stepTimer', () => driver.step());
  }

  return driver;
}
