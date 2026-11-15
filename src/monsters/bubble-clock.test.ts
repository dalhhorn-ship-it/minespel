import { describe, expect, it, vi } from 'vitest';
import { createBubbleClock } from './bubble-clock';
import { AFTER_BREAK_MS, BUBBLE_EVERY_MS, SPOT_RETRY_MS } from './monster-types';

const run = { canRun: true, remainingPlayMs: 240_000 };

/** Advances in 1 s steps, returns the first ms the clock said "show", or null. */
function until(clock: ReturnType<typeof createBubbleClock>, ms: number, rules = run): number | null {
  for (let t = 1000; t <= ms; t += 1000) if (clock.advance(1000, rules)) return t;
  return null;
}

describe('bubble clock (v18)', () => {
  it('AC211: due after 10 minutes of play time (plus or minus 1 s)', () => {
    const c = createBubbleClock();
    const t = until(c, BUBBLE_EVERY_MS + 5000);
    expect(t).not.toBeNull();
    expect(Math.abs((t as number) - BUBBLE_EVERY_MS)).toBeLessThanOrEqual(1000);
  });
  it('AC211: the clock does not move when it may not run', () => {
    const c = createBubbleClock({ initialMs: 5000 });
    expect(until(c, 2 * BUBBLE_EVERY_MS, { ...run, canRun: false })).toBeNull();
    expect(c.ms()).toBe(5000);
  });
  it('AC211: when the rule turns true the clock runs on from where it stood', () => {
    const c = createBubbleClock();
    until(c, 100_000);
    expect(c.ms()).toBe(100_000);
    until(c, 100_000, { ...run, canRun: false });
    expect(c.ms()).toBe(100_000);
    const t = until(c, BUBBLE_EVERY_MS);
    expect(t).toBe(BUBBLE_EVERY_MS - 100_000);
  });
  it('AC212: a break due in under 60 s holds it, then 30 s after the break it shows', () => {
    const c = createBubbleClock({ initialMs: BUBBLE_EVERY_MS - 1000 });
    const near = { canRun: true, remainingPlayMs: 59_000 };
    expect(until(c, 120_000, near)).toBeNull();
    expect(c.isDue()).toBe(true);
    c.breakFinished();
    const t = until(c, 60_000, { canRun: true, remainingPlayMs: 10_000 });
    expect(Math.abs((t as number) - AFTER_BREAK_MS)).toBeLessThanOrEqual(1000);
  });
  it('AC212: a break due in exactly 60 s does not hold it', () => {
    const c = createBubbleClock({ initialMs: BUBBLE_EVERY_MS - 1000 });
    expect(c.advance(1000, { canRun: true, remainingPlayMs: 60_000 })).toBe(true);
  });
  it('AC213: no spot, try again every 5 s of play time', () => {
    const c = createBubbleClock({ initialMs: BUBBLE_EVERY_MS - 1000 });
    expect(c.advance(1000, run)).toBe(true);
    c.noSpot();
    let at = 0;
    let tries = 0;
    for (let t = 1000; t <= 20_000; t += 1000) {
      if (c.advance(1000, run)) {
        tries++;
        at = t;
        c.noSpot();
      }
    }
    expect(tries).toBe(4);
    expect(at).toBe(4 * SPOT_RETRY_MS);
  });
  it('AC211: shown sets the clock to 0, saves at once, and the next bubble is 10 minutes later', () => {
    const save = vi.fn();
    const c = createBubbleClock({ initialMs: BUBBLE_EVERY_MS - 1000, save });
    expect(c.advance(1000, run)).toBe(true);
    c.shown();
    expect(c.ms()).toBe(0);
    expect(save).toHaveBeenLastCalledWith(0);
    expect(c.isDue()).toBe(false);
    expect(until(c, BUBBLE_EVERY_MS + 1000)).toBe(BUBBLE_EVERY_MS);
  });
  it('AC211: saves at most once per whole second of clock time', () => {
    const save = vi.fn();
    const c = createBubbleClock({ save });
    for (let i = 0; i < 10; i++) c.advance(100, run);
    expect(save).toHaveBeenCalledTimes(1);
    c.advance(100, run);
    expect(save).toHaveBeenCalledTimes(1);
    c.advance(1000, run);
    expect(save).toHaveBeenCalledTimes(2);
  });
  it('AC211: load and set clamp the clock to 0 to 10 minutes', () => {
    const c = createBubbleClock({ initialMs: 99_999_999 });
    expect(c.ms()).toBe(BUBBLE_EVERY_MS);
    c.set(-5, false);
    expect(c.ms()).toBe(0);
  });
});
