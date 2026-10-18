// Timer driver (T41, AC21..AC25, AC37, AC94, AC113).
// Connects the 1-second heartbeat, visibility/focus events, screen-guard, and screen manager
// to `timerMatrix`, the play countdown, the HUD countdown view, and persistent stores.

import { today, type Clock } from '../core/clock';
import {
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

  let screen: ScreenKind = options.screens.current();
  let guardState: GuardState = options.guard.state();
  let pageVisible = doc ? doc.visibilityState !== 'hidden' : true;
  let lastTickSecond: number | null = null;
  let breakTriggeredForCycle = false;
  let pendingWrite: Promise<unknown> = Promise.resolve();

  function enqueueWrite(fn: () => Promise<unknown>) {
    pendingWrite = pendingWrite.then(fn).catch(() => {
      /* ignore write errors if db closed */
    });
  }

  options.countdownView?.setWarningEnabled(warningEnabled);
  options.countdownView?.update(playTimer.remainingMs());

  function isPlayRunning(): boolean {
    const runs = timerMatrix({
      screen,
      portrait: guardState.portrait,
      tooSmall: guardState.tooSmall,
      visible: pageVisible,
    });
    return runs.play;
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
    if (!isPlayRunning()) {
      heartbeat.reset();
      return;
    }
    const delta = heartbeat.tick();
    if (delta > 0) {
      applyElapsedPlayMs(delta);
    }
  }

  const unsubScreen = options.screens.subscribe((next) => {
    if (next !== screen) {
      screen = next;
      heartbeat.reset();
      if (isPlayRunning()) {
        heartbeat.tick();
      }
    }
  });

  const unsubGuard = options.guard.subscribe((next) => {
    if (next.portrait !== guardState.portrait || next.tooSmall !== guardState.tooSmall) {
      guardState = next;
      heartbeat.reset();
      if (isPlayRunning()) {
        heartbeat.tick();
      }
    }
  });

  const onVisibilityOrFocus = () => {
    const nextVisible = doc ? doc.visibilityState !== 'hidden' : true;
    if (nextVisible !== pageVisible) {
      pageVisible = nextVisible;
      heartbeat.reset();
      if (isPlayRunning()) {
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
    if (isPlayRunning()) {
      heartbeat.tick();
    }
  };

  doc?.addEventListener('visibilitychange', onVisibilityOrFocus);
  win?.addEventListener('pagehide', onBlur);
  win?.addEventListener('pageshow', onFocus);
  win?.addEventListener('blur', onBlur);
  win?.addEventListener('focus', onFocus);

  // Prime the heartbeat if play is currently running.
  if (isPlayRunning()) {
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
      if (isPlayRunning()) {
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
    registerHook('stepTimer', () => driver.step());
  }

  return driver;
}
