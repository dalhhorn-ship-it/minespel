// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { createFakeClock } from '../core/clock';
import { openDb } from '../storage/db';
import { createRecords } from '../storage/records';
import { createCountdownView } from '../ui/countdown';
import { createScreenManager } from './screens';
import { createTimerDriver } from './timer-driver';

describe('timer driver (T41)', () => {
  it('ticks down in world, stops on overlays/parent/portrait, plays tick in last 10s, and calls onBreakDue at 0', async () => {
    const db = await openDb({ name: `timer-driver-${Math.random()}` });
    try {
      const records = createRecords(db);
      const clock = createFakeClock(new Date('2026-10-17T12:00:00Z').getTime());
      const host = document.createElement('div');
      const screens = createScreenManager({ host });

      let guardState = { portrait: false, tooSmall: false };
      const guardListeners = new Set<(s: { portrait: boolean; tooSmall: boolean }) => void>();
      const guard = {
        state: () => guardState,
        subscribe(fn: (s: { portrait: boolean; tooSmall: boolean }) => void) {
          guardListeners.add(fn);
          fn(guardState);
          return () => guardListeners.delete(fn);
        },
      };

      const playSound = vi.fn();
      const onBreakDue = vi.fn();
      const countdownView = createCountdownView({ initialMs: 12_000, warningEnabled: true });

      const driver = createTimerDriver({
        clock,
        screens,
        guard,
        records,
        sound: { play: playSound },
        countdownView,
        initialBreakEveryMinutes: 5,
        initialPlayMsLeft: 12_000,
        initialWarningEnabled: true,
        onBreakDue,
        autoStartInterval: false,
      });

      expect(driver.remainingPlayMs()).toBe(12_000);
      expect(countdownView.getText()).toBe('Leerpauze over 0:12');

      // Advance 2 seconds in world -> 10s left -> tick sound plays
      clock.advance(1000);
      driver.step();
      clock.advance(1000);
      driver.step();
      expect(driver.remainingPlayMs()).toBe(10_000);
      expect(playSound).toHaveBeenCalledWith('tick');

      // Open pause overlay -> timer must not advance
      screens.showKidOverlay(document.createElement('div'));
      clock.advance(1000);
      driver.step();
      expect(driver.remainingPlayMs()).toBe(10_000);

      // Return to world, then portrait overlay -> timer must not advance
      screens.showWorld();
      guardState = { portrait: true, tooSmall: false };
      for (const l of guardListeners) l(guardState);
      clock.advance(1000);
      driver.step();
      expect(driver.remainingPlayMs()).toBe(10_000);

      // Landscape again -> advance to 0 in 1s steps
      guardState = { portrait: false, tooSmall: false };
      for (const l of guardListeners) l(guardState);
      for (let i = 0; i < 10; i++) {
        clock.advance(1000);
        driver.step();
      }
      expect(driver.remainingPlayMs()).toBe(0);
      expect(onBreakDue).toHaveBeenCalledTimes(1);

      await driver.flush();
      const savedTimers = await records.get('timers');
      expect(savedTimers.playMsLeft).toBe(0);
      const savedStats = await records.get('stats');
      expect(Object.values(savedStats.playMsPerDay)[0]).toBe(12_000);

      driver.destroy();
    } finally {
      db.close();
    }
  });

  describe('exam timer (v2, AC66, AC112)', () => {
    async function setup() {
      const db = await openDb({ name: `timer-exam-${Math.random()}` });
      const records = createRecords(db);
      const clock = createFakeClock(new Date('2026-10-19T12:00:00Z').getTime());
      const screens = createScreenManager({ host: document.createElement('div') });
      let guardState = { portrait: false, tooSmall: false };
      const listeners = new Set<(s: { portrait: boolean; tooSmall: boolean }) => void>();
      const guard = {
        state: () => guardState,
        subscribe(fn: (s: { portrait: boolean; tooSmall: boolean }) => void) {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
      };
      const setGuard = (g: { portrait: boolean; tooSmall: boolean }) => {
        guardState = g;
        for (const l of listeners) l(g);
      };
      const onBreakDue = vi.fn();
      const driver = createTimerDriver({
        clock,
        screens,
        guard,
        records,
        initialBreakEveryMinutes: 5,
        initialPlayMsLeft: null,
        initialWarningEnabled: false,
        onBreakDue,
        autoStartInterval: false,
      });
      const tick = (ms = 1000) => {
        clock.advance(ms);
        driver.step();
      };
      return { db, records, clock, screens, driver, setGuard, onBreakDue, tick };
    }

    it('runs only on screen exam, never moves the play timer, and saves every tick', async () => {
      const t = await setup();
      try {
        const onExpire = vi.fn();
        const onTick = vi.fn();
        t.screens.showWorld();
        t.driver.startExamTimer(30, null, onExpire, onTick);
        expect(t.driver.remainingExamMs()).toBe(30 * 60_000);
        // world: exam does not run, play does
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(30 * 60_000);
        const playBefore = t.driver.remainingPlayMs();

        t.screens.showExam(document.createElement('div'));
        expect(t.driver.isExamRunning()).toBe(true);
        t.tick();
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(30 * 60_000 - 2000);
        expect(t.driver.remainingPlayMs()).toBe(playBefore);
        expect(onTick).toHaveBeenLastCalledWith(30 * 60_000 - 2000);
        await t.driver.flush();
        expect((await t.records.get('timers')).examMsLeft).toBe(30 * 60_000 - 2000);
        expect(t.onBreakDue).not.toHaveBeenCalled();
        expect(onExpire).not.toHaveBeenCalled();
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });

    it('stops for the parent layer, portrait, too small and hidden (AC112)', async () => {
      const t = await setup();
      try {
        t.screens.showExam(document.createElement('div'));
        t.driver.startExamTimer(30, null, vi.fn());
        const full = 30 * 60_000;
        t.tick();
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 2000);

        t.screens.showParent(document.createElement('div'));
        t.tick();
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 2000);
        t.screens.showParent(null);

        t.setGuard({ portrait: true, tooSmall: false });
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 2000);
        t.setGuard({ portrait: false, tooSmall: true });
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 2000);
        t.setGuard({ portrait: false, tooSmall: false });

        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 2000);
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(full - 3000);
        // advanceExamMs obeys the matrix unless forced
        t.setGuard({ portrait: true, tooSmall: false });
        t.driver.advanceExamMs(5000);
        expect(t.driver.remainingExamMs()).toBe(full - 3000);
        t.driver.advanceExamMs(5000, true);
        expect(t.driver.remainingExamMs()).toBe(full - 8000);
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });

    it('resumes from the saved time and calls onExpire once at zero', async () => {
      const t = await setup();
      try {
        const onExpire = vi.fn();
        t.screens.showExam(document.createElement('div'));
        t.driver.startExamTimer(30, 3000, onExpire);
        expect(t.driver.remainingExamMs()).toBe(3000);
        t.tick();
        t.tick();
        t.tick();
        expect(t.driver.remainingExamMs()).toBe(0);
        expect(onExpire).toHaveBeenCalledTimes(1);
        t.tick();
        expect(onExpire).toHaveBeenCalledTimes(1);
        expect(t.driver.isExamRunning()).toBe(false);
        await t.driver.flush();
        expect((await t.records.get('timers')).examMsLeft).toBe(0);
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });

    it('stopExamTimer at the last answer freezes and clears it', async () => {
      const t = await setup();
      try {
        const onExpire = vi.fn();
        t.screens.showExam(document.createElement('div'));
        t.driver.startExamTimer(1, null, onExpire);
        t.tick();
        t.driver.stopExamTimer();
        expect(t.driver.remainingExamMs()).toBeNull();
        expect(t.driver.isExamRunning()).toBe(false);
        for (let i = 0; i < 70; i++) t.tick();
        expect(onExpire).not.toHaveBeenCalled();
        await t.driver.flush();
        expect((await t.records.get('timers')).examMsLeft).toBeNull();
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });

    it('a null limit means no countdown', async () => {
      const t = await setup();
      try {
        t.screens.showExam(document.createElement('div'));
        t.driver.startExamTimer(null, null, vi.fn());
        expect(t.driver.remainingExamMs()).toBeNull();
        expect(t.driver.isExamRunning()).toBe(false);
        t.tick();
        expect(t.driver.remainingExamMs()).toBeNull();
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });

    it('expires at once when resumed with no time left', async () => {
      const t = await setup();
      try {
        const onExpire = vi.fn();
        t.screens.showExam(document.createElement('div'));
        t.driver.startExamTimer(30, 0, onExpire);
        expect(onExpire).toHaveBeenCalledTimes(1);
      } finally {
        t.driver.destroy();
        t.db.close();
      }
    });
  });
});
