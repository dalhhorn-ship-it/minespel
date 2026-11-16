import { describe, expect, it } from 'vitest';
import { closeness, gainOf, NEAR_KINDS, panOf, pickVoices } from './near-mix';
import { targetAngle } from '../monsters/target-angle';

describe('near mix (V24b)', () => {
  it('AC323: Klodder at 2, 8, 14 and 25 gives 0.2, 0.141, 0.071 and 0', () => {
    const g = (d: number) => gainOf('giechel', closeness('klodder', d), 1);
    expect(g(2)).toBeCloseTo(0.2, 2);
    expect(g(8)).toBeCloseTo(0.141, 2);
    expect(g(14)).toBeCloseTo(0.071, 2);
    expect(g(25)).toBe(0);
  });

  it('AC323: Volume 40 scales every gain', () => {
    expect(gainOf('giechel', closeness('klodder', 8), 0.4)).toBeCloseTo(0.4 * 0.141, 2);
  });

  it('AC323: each kind has its own start and loudest distance', () => {
    expect(closeness('bubble', 16)).toBe(0);
    expect(closeness('bubble', 3)).toBe(1);
    expect(closeness('bar', 12)).toBe(0);
    expect(closeness('bar', 13)).toBe(0);
    expect(closeness('bar', 3)).toBe(1);
    expect(closeness('mole-caught', 8)).toBe(0);
    expect(closeness('mole-caught', 2)).toBe(1);
    expect(closeness('mole', 19.9)).toBeGreaterThan(0);
    expect(closeness('bubble', 9.5)).toBeCloseTo(0.5, 5);
    expect(closeness('klodder', Number.NaN)).toBe(0);
  });

  it('AC323: the beat interval is a fixed number per kind, not a function of distance', () => {
    expect(NEAR_KINDS.bubble.everyMs).toBe(1500);
    expect(NEAR_KINDS.klodder.everyMs).toBe(2500);
    expect(NEAR_KINDS.mole.everyMs).toBe(2000);
    expect(NEAR_KINDS['mole-caught'].everyMs).toBe(4000);
    expect(NEAR_KINDS.bar.everyMs).toBe(2000);
  });

  it('AC324: the top 2 by closeness take the voices', () => {
    const out: [number, number] = [-1, -1];
    pickVoices([0.3, 0.9, 0, 0.6], 4, [-1, -1], out);
    expect([...out].sort()).toEqual([1, 3]);
    pickVoices([0, 0, 0], 3, [-1, -1], out);
    expect(out).toEqual([-1, -1]);
  });

  it('AC324: a source keeps its voice, and a tie keeps the voice it had', () => {
    const out: [number, number] = [-1, -1];
    pickVoices([0.5, 0.8, 0.5], 3, [2, 1], out);
    expect(out).toEqual([2, 1]);
    pickVoices([0.5, 0.8, 0.5], 3, [-1, 1], out);
    expect(out[1]).toBe(1);
    pickVoices([0.5, 0.5, 0.5], 3, [1, -1], out);
    expect(out[0]).toBe(1);
  });

  it('AC324: a third source with more closeness takes a voice from the weakest', () => {
    const out: [number, number] = [-1, -1];
    pickVoices([0.4, 0.6, 0.9], 3, [0, 1], out);
    expect(out).toEqual([2, 1]);
  });

  it('AC325: pan is within 0.1 of 0 ahead and behind, -0.5 left, 0.5 right', () => {
    expect(Math.abs(panOf(0))).toBeLessThan(0.1);
    expect(Math.abs(panOf(180))).toBeLessThan(0.1);
    expect(panOf(-90)).toBeCloseTo(-0.5, 5);
    expect(panOf(90)).toBeCloseTo(0.5, 5);
  });

  it('AC325: the pan side matches targetAngle for a source 8 blocks to the left', () => {
    const pose = { x: 0, z: 0, yaw: 0 };
    expect(panOf(targetAngle(pose, { x: 8, z: 0 }))).toBeLessThan(0);
    expect(panOf(targetAngle(pose, { x: -8, z: 0 }))).toBeGreaterThan(0);
  });
});
