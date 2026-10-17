import { describe, expect, it } from 'vitest';
import { computeFrameStats, createFpsCounter, isFpsEnabled, noFpsCounter } from './fps-counter';

describe('computeFrameStats', () => {
  it('handles no frames', () => {
    expect(computeFrameStats([]).frames).toBe(0);
  });
  it('computes p95, worst and fps', () => {
    const times = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100 ms
    const s = computeFrameStats(times);
    expect(s.p95).toBe(95);
    expect(s.worst).toBe(100);
    expect(s.frames).toBe(100);
    expect(s.shareWithin33).toBeCloseTo(0.33);
    expect(s.fps).toBeCloseTo(100000 / 5050);
  });
  it('counts frames over 200 ms and does not change the input', () => {
    const times = [16, 250, 16, 300];
    const s = computeFrameStats(times);
    expect(s.over200).toBe(2);
    expect(s.worst).toBe(300);
    expect(times).toEqual([16, 250, 16, 300]);
  });
  it('one slow frame in 20 stays out of the p95', () => {
    const times = [...Array.from({ length: 19 }, () => 16), 400];
    expect(computeFrameStats(times).p95).toBe(16);
  });
});

describe('fps counter', () => {
  it('is off without ?fps=1', () => {
    expect(isFpsEnabled('')).toBe(false);
    expect(isFpsEnabled('?fps=0')).toBe(false);
    expect(isFpsEnabled('?spike=1&fps=1')).toBe(true);
    const parent = document.createElement('div');
    expect(createFpsCounter('', parent)).toBe(noFpsCounter);
    expect(parent.childElementCount).toBe(0);
  });
  it('shows text and removes itself with ?fps=1', () => {
    const parent = document.createElement('div');
    const c = createFpsCounter('?fps=1', parent);
    expect(parent.childElementCount).toBe(1);
    for (let i = 0; i <= 60; i++) c.frame(i * 16);
    expect(parent.textContent).toContain('fps');
    expect(c.stats().frames).toBe(60);
    c.dispose();
    expect(parent.childElementCount).toBe(0);
  });
});
