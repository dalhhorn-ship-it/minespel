import { describe, expect, it } from 'vitest';
import { NEAR_NAMES, NEAR_RECIPES, NEAR_SPECS } from './near-recipes';
import { SOUND_NAMES, SOUND_SPECS } from './sound';

/** Renders a recipe on a recording context: the end of the last tone, the loudest gain and the notes started. */
function render(name: (typeof NEAR_NAMES)[number]) {
  let end = 0;
  let peak = 0;
  let notes = 0;
  const p = () => ({
    setValueAtTime: (v: number) => void (peak = Math.max(peak, v)),
    linearRampToValueAtTime: (v: number) => void (peak = Math.max(peak, v)),
    exponentialRampToValueAtTime: () => undefined,
  });
  const ctx = {
    createGain: () => ({ gain: p(), connect: () => undefined }),
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
      connect: () => undefined,
      start: () => void (notes += 1),
      stop: (t: number) => void (end = Math.max(end, t - 0.02)),
    }),
  };
  NEAR_RECIPES[name](ctx as unknown as AudioContext, {} as AudioNode, 0);
  return { end, peak, notes };
}

describe('near sound recipes (AC322)', () => {
  it('AC322: each recipe lasts under 1.5 s and peaks at its row, at or below 0.8', () => {
    for (const n of NEAR_NAMES) {
      const r = render(n);
      expect(r.end, `${n} seconds`).toBeLessThan(1.5);
      expect(r.end, `${n} row seconds`).toBeCloseTo(NEAR_SPECS[n].seconds, 1);
      expect(r.peak, `${n} peak`).toBeCloseTo(NEAR_SPECS[n].peak, 2);
      expect(r.peak).toBeLessThanOrEqual(0.8);
    }
  });
  it('AC322: the peaks are 0.2, 0.2, 0.2, 0.1, 0.12 and 0.15', () => {
    expect(NEAR_NAMES.map((n) => NEAR_SPECS[n].peak)).toEqual([0.2, 0.2, 0.2, 0.1, 0.12, 0.15]);
  });
  it('AC322: the rows match SOUND_SPECS and the names are sounds', () => {
    for (const n of NEAR_NAMES) {
      expect(SOUND_NAMES).toContain(n);
      expect(SOUND_SPECS[n]).toEqual(NEAR_SPECS[n]);
    }
  });
  it('AC322: no name holds growl, scream or roar', () => {
    for (const n of NEAR_NAMES) expect(n).not.toMatch(/growl|scream|roar/i);
  });
  it('AC322: deuntje has 3 notes', () => {
    expect(render('deuntje').notes).toBe(3);
  });
});
