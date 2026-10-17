// Drives the play timer in the running app (PRD 4.4). The pure rules live in core/timers.ts.
// It listens to visibility, focus, pagehide, the screen guard and the open screen, counts only time the
// heartbeat accepts (AC113), saves the time left and the play time per day, and tells the break flow at 0.
import { dayKey, type Clock } from '../core/clock';
import {
  HEARTBEAT_INTERVAL_MS,
  createHeartbeat,
  createPlayTimer,
  isTickTime,
  timerMatrix,
  type Countdown,
  type Heartbeat,
} from '../core/timers';
import type { GuardState } from '../platform/screen-guard';
import type { SaveQueue } from '../storage/save-queue';
import type { Records } from '../storage/records';
import type { StatsRecord, TimersRecord } from '../storage/schema';
import type { Game } from '../game/game';
import { createCountdownView } from '../ui/countdown';
import { createBreakFlow, type BreakFlow } from './break-flow';
import type { AppEnv } from './app-env';
import type { Screens } from './screens';

export interface TimerSettings {
  breakEveryMinutes: number;
  breakWarningEnabled: boolean;
}

export interface TimerDriverOptions {
  clock: Clock;
  screens: Pick<Screens, 'current' | 'subscribe'>;
  guard: { subscribe(listener: (state: GuardState) => void): () => void };
  settings: TimerSettings;
  /** The saved `timers` record. */
  saved?: TimersRecord;
  /** The saved `stats` record. It is changed in place and saved. */
  stats?: StatsRecord;
  /** Without a queue the timer runs but nothing is saved. */
  queue?: Pick<SaveQueue, 'register' | 'markDirty' | 'flushNow'> | null;
  /** Called after every tick and when the time or setting changes. */
  onChange?: (remainingMs: number, warn: boolean) => void;
  /** A soft tick: once per second in the last 10 seconds when warnings are on. */
  onTick?: () => void;
  /** The play timer reached 0. Everything is already saved. */
  onExpire: () => void;
  doc?: Document;
  win?: Window;
  /** How often the heartbeat ticks. Default 250 ms. */
  intervalMs?: number;
  setInterval?: (fn: () => void, ms: number) => unknown;
  clearInterval?: (handle: unknown) => void;
}

export interface TimerDriver {
  start(): void;
  stop(): void;
  remainingMs(): number;
  /** True while the play timer is counting down. */
  isCounting(): boolean;
  /** A full play timer again (after a break). */
  restart(): void;
  applySettings(settings: TimerSettings): void;
}

export function createTimerDriver(options: TimerDriverOptions): TimerDriver {
  const { clock, screens, guard, queue } = options;
  const doc = options.doc ?? document;
  const win = options.win ?? window;
  const intervalMs = options.intervalMs ?? Math.min(250, HEARTBEAT_INTERVAL_MS);
  const setIv = options.setInterval ?? ((fn, ms) => setInterval(fn, ms));
  const clearIv = options.clearInterval ?? ((h) => clearInterval(h as ReturnType<typeof setInterval>));
  const stats: StatsRecord = options.stats ?? { playMsPerDay: {} };
  const examMsLeft = options.saved?.examMsLeft ?? null;

  let settings = { ...options.settings };
  let play: Countdown = createPlayTimer(settings.breakEveryMinutes, options.saved?.playMsLeft ?? null);
  const beat: Heartbeat = createHeartbeat(clock);
  let guardState: GuardState = { portrait: false, tooSmall: false };
  let pageHidden = false;
  let focused = true;
  let counting = false;
  let timerHandle: unknown = null;
  let unsubs: Array<() => void> = [];
  let countedSinceDirty = 0;
  let lastTickSec = -1;
  let started = false;

  const warn = () => settings.breakWarningEnabled;
  const emit = () => options.onChange?.(play.remainingMs(), warn());
  const dirty = () => {
    queue?.markDirty('timers');
    queue?.markDirty('stats');
  };

  function situationRuns(): boolean {
    const visible = !pageHidden && focused && doc.visibilityState !== 'hidden';
    return timerMatrix({ screen: screens.current(), portrait: guardState.portrait, tooSmall: guardState.tooSmall, visible }).play && !play.expired();
  }

  function refresh() {
    if (!started) return;
    const now = situationRuns();
    if (now === counting) return;
    counting = now;
    beat.reset();
    if (now) beat.tick(); // primes the heartbeat: the next tick counts the time since now
    else dirty();
  }

  function expire() {
    counting = false;
    beat.reset();
    dirty();
    emit();
    // Save first, then tell the break flow (AC26). A failed save never blocks the break.
    void queue?.flushNow();
    options.onExpire();
  }

  function tick() {
    if (!counting) return;
    const ms = beat.tick();
    if (ms > 0) {
      const day = dayKey(clock.now());
      stats.playMsPerDay[day] = (stats.playMsPerDay[day] ?? 0) + ms;
      const hit = play.advance(ms);
      countedSinceDirty += ms;
      if (countedSinceDirty >= 1000) {
        countedSinceDirty = 0;
        dirty();
      }
      if (hit) {
        expire();
        return;
      }
      const left = play.remainingMs();
      if (warn() && isTickTime(left)) {
        const sec = Math.ceil(left / 1000);
        if (sec !== lastTickSec) {
          lastTickSec = sec;
          options.onTick?.();
        }
      }
    }
    emit();
  }

  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') {
      pageHidden = true;
      dirty();
    } else {
      pageHidden = false;
    }
    refresh();
  };
  const onPageHide = () => {
    pageHidden = true;
    dirty();
    refresh();
  };
  const onPageShow = () => {
    pageHidden = false;
    refresh();
  };
  const onBlur = () => {
    focused = false;
    refresh();
  };
  const onFocus = () => {
    focused = true;
    refresh();
  };

  return {
    start() {
      if (started) return;
      started = true;
      queue?.register('timers', () => ({ playMsLeft: play.remainingMs(), examMsLeft }));
      queue?.register('stats', () => stats);
      unsubs = [guard.subscribe((g) => { guardState = g; refresh(); }), screens.subscribe(() => refresh())];
      // Capture, so the time left is marked dirty before the save queue flushes on hide.
      doc.addEventListener('visibilitychange', onVisibility, true);
      win.addEventListener('pagehide', onPageHide, true);
      win.addEventListener('pageshow', onPageShow);
      win.addEventListener('blur', onBlur);
      win.addEventListener('focus', onFocus);
      pageHidden = doc.visibilityState === 'hidden';
      timerHandle = setIv(tick, intervalMs);
      refresh();
      emit();
      if (play.expired()) expire(); // closed during a break: the break comes back
    },
    stop() {
      if (!started) return;
      started = false;
      counting = false;
      clearIv(timerHandle);
      for (const u of unsubs) u();
      unsubs = [];
      doc.removeEventListener('visibilitychange', onVisibility, true);
      win.removeEventListener('pagehide', onPageHide, true);
      win.removeEventListener('pageshow', onPageShow);
      win.removeEventListener('blur', onBlur);
      win.removeEventListener('focus', onFocus);
    },
    remainingMs: () => play.remainingMs(),
    isCounting: () => counting,
    restart() {
      play.reset();
      lastTickSec = -1;
      countedSinceDirty = 0;
      dirty();
      emit();
      refresh();
    },
    applySettings(next) {
      const minutesChanged = next.breakEveryMinutes !== settings.breakEveryMinutes;
      settings = { ...next };
      if (minutesChanged) {
        play = createPlayTimer(settings.breakEveryMinutes);
        lastTickSec = -1;
        dirty();
        refresh();
      }
      emit();
    },
  };
}

/** Loads settings, timers and stats, then makes the driver. Falls back to defaults when the storage cannot be read. */
export async function loadTimerInputs(records: Records | null): Promise<{ settings: TimerSettings; saved: TimersRecord; stats: StatsRecord; sound: { enabled: boolean; volume: number } }> {
  const fallback = { settings: { breakEveryMinutes: 5, breakWarningEnabled: true }, saved: { playMsLeft: null, examMsLeft: null }, stats: { playMsPerDay: {} }, sound: { enabled: true, volume: 1 } };
  if (!records) return fallback;
  try {
    const [s, saved, stats] = await Promise.all([records.get('settings'), records.get('timers'), records.get('stats')]);
    return {
      settings: { breakEveryMinutes: s.breakEveryMinutes, breakWarningEnabled: s.breakWarningEnabled },
      saved,
      stats: { playMsPerDay: stats.playMsPerDay ?? {} },
      sound: { enabled: s.soundEffectsEnabled, volume: s.volume },
    };
  } catch {
    return fallback;
  }
}

export interface PlayTimerDeps {
  game: Pick<Game, 'pause' | 'resume' | 'hud'>;
  screens: Screens;
  guard: { subscribe(listener: (state: GuardState) => void): () => void };
  /** Storage, the one Sound and the clock. */
  env: AppEnv;
  /** True when the kid (or a test) asked for a pause: after the break the world stays paused. */
  wantsPause?: () => boolean;
}

export interface PlayTimer {
  driver: TimerDriver;
  breakFlow: BreakFlow;
}

/** Wires the countdown in the HUD, the tick sound, the timer driver and the break stub. Call after the save has loaded. */
export async function startPlayTimer(deps: PlayTimerDeps): Promise<PlayTimer> {
  const { env } = deps;
  const inputs = await loadTimerInputs(env.records);
  // The app wide Sound follows the saved settings (AC99).
  const sound = env.sound;
  sound.setEnabled(inputs.sound.enabled);
  sound.setVolume(inputs.sound.volume);
  const view = createCountdownView(deps.game.hud.countdownSlot);
  let driver: TimerDriver | null = null;
  const breakFlow = createBreakFlow({
    screens: deps.screens,
    pauseWorld: () => deps.game.pause(),
    resumeWorld: () => {
      if (!deps.wantsPause?.()) deps.game.resume();
    },
    restartTimer: () => driver?.restart(),
    env,
  });
  driver = createTimerDriver({
    clock: env.clock,
    screens: deps.screens,
    guard: deps.guard,
    settings: inputs.settings,
    saved: inputs.saved,
    stats: inputs.stats,
    queue: env.queue,
    onChange: (ms, warn) => view.update(ms, warn),
    onTick: () => sound.play('tick'),
    onExpire: () => breakFlow.start(),
  });
  driver.start();
  return { driver, breakFlow };
}
