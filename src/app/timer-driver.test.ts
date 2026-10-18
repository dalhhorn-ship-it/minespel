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
});
