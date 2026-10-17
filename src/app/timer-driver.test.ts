import { describe, expect, it, vi } from 'vitest';
import { createFakeClock, dayKey } from '../core/clock';
import type { GuardState } from '../platform/screen-guard';
import { createScreens } from './screens';
import { createTimerDriver, type TimerDriverOptions } from './timer-driver';

function setup(extra: Partial<TimerDriverOptions> = {}) {
  const clock = createFakeClock(Date.UTC(2026, 9, 17, 12, 0, 0));
  const screens = createScreens(document.createElement('div'));
  let guardState: GuardState = { portrait: false, tooSmall: false };
  const guardListeners = new Set<(g: GuardState) => void>();
  const guard = {
    subscribe(l: (g: GuardState) => void) {
      guardListeners.add(l);
      l(guardState);
      return () => guardListeners.delete(l);
    },
  };
  const setGuard = (g: GuardState) => {
    guardState = g;
    for (const l of guardListeners) l(g);
  };
  const doc = new EventTarget() as unknown as Document & { visibilityState: string };
  (doc as { visibilityState: string }).visibilityState = 'visible';
  const win = new EventTarget() as unknown as Window;
  const handlers: Array<() => void> = [];
  const queue = { register: vi.fn(), markDirty: vi.fn(), flushNow: vi.fn(() => Promise.resolve()) };
  const onExpire = vi.fn();
  const onTick = vi.fn();
  const stats = { playMsPerDay: {} as Record<string, number> };
  const driver = createTimerDriver({
    clock, screens, guard, doc, win, queue, stats, onExpire, onTick,
    settings: { breakEveryMinutes: 5, breakWarningEnabled: true },
    setInterval: (fn) => { handlers.push(fn); return handlers.length; },
    clearInterval: () => {},
    ...extra,
  });
  driver.start();
  /** Moves the clock in 1 second steps with a heartbeat each. */
  const run = (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      clock.advance(1000);
      handlers[0]?.();
    }
  };
  const hide = (hidden: boolean) => {
    (doc as { visibilityState: string }).visibilityState = hidden ? 'hidden' : 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
  };
  return { clock, screens, setGuard, doc, win, driver, run, hide, queue, onExpire, onTick, stats, handlers };
}

describe('timer driver', () => {
  it('counts 60 seconds of play (AC22)', () => {
    const t = setup();
    t.run(60);
    expect(t.driver.remainingMs()).toBe(240_000);
    expect(t.stats.playMsPerDay[dayKey(t.clock.now())]).toBe(60_000);
  });

  it('stops for kid overlays, parent, portrait, too small and the background (AC23, AC108, AC112)', () => {
    const t = setup();
    t.run(10);
    for (const kind of ['kid-overlay', 'parent', 'learn', 'exam'] as const) {
      const close = t.screens.open(kind);
      t.run(10);
      close();
    }
    t.setGuard({ portrait: true, tooSmall: false });
    t.run(10);
    t.setGuard({ portrait: false, tooSmall: true });
    t.run(10);
    t.setGuard({ portrait: false, tooSmall: false });
    t.hide(true);
    t.run(10);
    t.hide(false);
    t.win.dispatchEvent(new Event('blur'));
    t.run(10);
    t.win.dispatchEvent(new Event('focus'));
    expect(t.driver.remainingMs()).toBe(290_000);
    t.run(5);
    expect(t.driver.remainingMs()).toBe(285_000);
  });

  it('does not count a 60 second jump between heartbeats (AC113)', () => {
    const t = setup();
    t.run(5);
    t.clock.advance(60_000);
    t.handlers[0]?.();
    expect(t.driver.remainingMs()).toBe(295_000);
  });

  it('resumes from a saved time and saves it (AC24)', () => {
    const t = setup({ saved: { playMsLeft: 150_000, examMsLeft: null } });
    expect(t.driver.remainingMs()).toBe(150_000);
    t.run(3);
    expect(t.queue.markDirty).toHaveBeenCalledWith('timers');
    const read = t.queue.register.mock.calls.find((c) => c[0] === 'timers')?.[1] as () => unknown;
    expect(read()).toEqual({ playMsLeft: 147_000, examMsLeft: null });
  });

  it('does not tick when warnings are off (AC25)', () => {
    const off = setup({ saved: { playMsLeft: 12_000, examMsLeft: null }, settings: { breakEveryMinutes: 5, breakWarningEnabled: false } });
    off.run(11);
    expect(off.onTick).not.toHaveBeenCalled();
  });

  it('does not tick before the last 10 seconds', () => {
    const t = setup({ saved: { playMsLeft: 12_000, examMsLeft: null } });
    t.run(1);
    expect(t.onTick).not.toHaveBeenCalled();
    t.run(1);
    expect(t.onTick).toHaveBeenCalledTimes(1);
  });

  it('counts the ticks in the last 10 seconds', () => {
    const t = setup({ saved: { playMsLeft: 10_000, examMsLeft: null } });
    t.run(9);
    expect(t.onTick).toHaveBeenCalledTimes(9);
  });

  it('saves and tells the break flow at 0, once (AC26)', () => {
    const t = setup({ saved: { playMsLeft: 3000, examMsLeft: null } });
    t.run(2);
    expect(t.onExpire).not.toHaveBeenCalled();
    t.run(1);
    expect(t.onExpire).toHaveBeenCalledTimes(1);
    expect(t.queue.flushNow).toHaveBeenCalled();
    expect(t.driver.remainingMs()).toBe(0);
    t.run(5);
    expect(t.onExpire).toHaveBeenCalledTimes(1);
  });

  it('a saved time of 0 brings the break back at start', () => {
    const t = setup({ saved: { playMsLeft: 0, examMsLeft: null } });
    expect(t.onExpire).toHaveBeenCalledTimes(1);
  });

  it('restart gives a full timer and counts again', () => {
    const t = setup({ saved: { playMsLeft: 1000, examMsLeft: null } });
    t.run(1);
    t.driver.restart();
    expect(t.driver.remainingMs()).toBe(300_000);
    t.run(2);
    expect(t.driver.remainingMs()).toBe(298_000);
  });

  it('a new break length starts a full timer of that length', () => {
    const t = setup();
    t.run(10);
    t.driver.applySettings({ breakEveryMinutes: 3, breakWarningEnabled: true });
    expect(t.driver.remainingMs()).toBe(180_000);
  });
});
