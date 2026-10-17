import { describe, expect, it } from 'vitest';
import { BABY_SCALE, EGG_HATCH_SECONDS, GROW_SECONDS, createEgg, growthScale, hatchSpot, hatchTimeLeft, stepEgg } from './egg';

describe('egg', () => {
  it('hatches after 5 seconds of play, not before', () => {
    const e = createEgg('compy', false, 1, 2, 3);
    expect(EGG_HATCH_SECONDS).toBe(5);
    for (let i = 0; i < 299; i++) expect(stepEgg(e, 1 / 60)).toBe(false);
    expect(hatchTimeLeft(e)).toBeGreaterThan(0);
    let hatched = false;
    for (let i = 0; i < 3; i++) hatched = stepEgg(e, 1 / 60);
    expect(hatched).toBe(true);
  });

  it('timing does not depend on the frame rate', () => {
    for (const fps of [20, 30, 60, 120]) {
      const e = createEgg('compy', false, 0, 0, 0);
      let t = 0;
      while (!stepEgg(e, 1 / fps)) t += 1 / fps;
      expect(t).toBeGreaterThan(5 - 2 / fps);
      expect(t).toBeLessThan(5 + 0.001);
    }
  });

  it('ignores zero, negative and bad dt, and keeps saved progress', () => {
    const e = createEgg('triceratops', true, 0, 0, 0, 3);
    stepEgg(e, 0); stepEgg(e, -1); stepEgg(e, NaN);
    expect(hatchTimeLeft(e)).toBe(2);
    expect(hatchSpot(e)).toEqual({ kind: 'triceratops', golden: true, x: 0, y: 0, z: 0 });
  });

  it('grows from baby to full in 2 seconds', () => {
    expect(GROW_SECONDS).toBe(2);
    expect(growthScale(0)).toBe(BABY_SCALE);
    expect(growthScale(1)).toBeCloseTo((1 + BABY_SCALE) / 2);
    expect(growthScale(2)).toBe(1);
    expect(growthScale(10)).toBe(1);
  });
});
