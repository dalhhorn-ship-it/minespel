import { describe, expect, it, vi } from 'vitest';
import { DANCE_ANGLE, HOP_HEIGHT, SNACK_MS, snackStep, startSnack } from './snack';

function body() {
  return { snack: undefined as import('./snack').Snack | undefined, heading: 1.25, y: 10, vy: 0.5 };
}

describe('snack', () => {
  it('AC315: a snack lasts 3000 ms standing, then the heading and height are back', () => {
    const b = body();
    expect(startSnack(b)).toBe(true);
    let ms = 0;
    let standing = 0;
    while (snackStep(b, 1 / 60)) {
      ms += 1000 / 60;
      standing++;
    }
    expect(Math.abs(ms - 3000)).toBeLessThanOrEqual(500);
    expect(standing).toBeGreaterThan(150);
    expect(b.heading).toBe(1.25);
    expect(b.y).toBe(10);
    expect(b.snack).toBeUndefined();
  });

  it('AC315: he dances, turns left and right and hops, within the set size', () => {
    const b = body();
    startSnack(b);
    let minH = 9;
    let maxH = -9;
    let maxY = 0;
    while (snackStep(b, 1 / 60)) {
      minH = Math.min(minH, b.heading);
      maxH = Math.max(maxH, b.heading);
      maxY = Math.max(maxY, b.y);
    }
    expect(maxH).toBeGreaterThan(1.25 + DANCE_ANGLE * 0.9);
    expect(minH).toBeLessThan(1.25 - DANCE_ANGLE * 0.9);
    expect(maxH).toBeLessThanOrEqual(1.25 + DANCE_ANGLE + 1e-9);
    expect(maxY).toBeGreaterThan(10 + HOP_HEIGHT * 0.9);
    expect(maxY).toBeLessThanOrEqual(10 + HOP_HEIGHT + 1e-9);
  });

  it('AC317: it uses no rng', () => {
    const spy = vi.spyOn(Math, 'random');
    const b = body();
    startSnack(b);
    while (snackStep(b, 0.05)) {
      /* run */
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('AC319: with reduced motion there is no dance and no hop, he still stands 3 seconds', () => {
    const b = body();
    startSnack(b, true);
    let ms = 0;
    while (snackStep(b, 0.05)) {
      ms += 50;
      expect(b.heading).toBe(1.25);
      expect(b.y).toBe(10);
    }
    expect(Math.abs(ms - SNACK_MS)).toBeLessThanOrEqual(500);
  });

  it('a body with no snack is not touched and a second start keeps the first', () => {
    const b = body();
    expect(snackStep(b, 0.1)).toBe(false);
    expect(b.heading).toBe(1.25);
    startSnack(b);
    snackStep(b, 1);
    expect(startSnack(b)).toBe(false);
    expect(b.snack?.ms).toBeCloseTo(2000, 5);
  });

  it('a bad dt keeps standing and changes nothing', () => {
    const b = body();
    startSnack(b);
    expect(snackStep(b, Number.NaN)).toBe(true);
    expect(snackStep(b, -1)).toBe(true);
    expect(b.snack?.ms).toBe(SNACK_MS);
  });
});
