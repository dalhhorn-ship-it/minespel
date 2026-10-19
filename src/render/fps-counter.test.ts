// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { WARMUP_MS, computeFrameStats, createFpsCounter, isFpsEnabled, noFpsCounter } from './fps-counter';

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
    expect(s.shareWithin34).toBeCloseTo(0.34);
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
    for (let i = 0; i <= 400; i++) c.frame(i * 16, i === 0 ? 0 : 0.016);
    expect(parent.textContent).toContain('fps');
    c.dispose();
    expect(parent.childElementCount).toBe(0);
  });
  it('ignores the warm up and covers the whole session', () => {
    const c = createFpsCounter('?fps=1', document.createElement('div'));
    let t = 0;
    c.frame(t, 0);
    while (t < WARMUP_MS) c.frame((t += 100), 0.1); // slow startup frames, not counted
    expect(c.stats().frames).toBe(0);
    for (let i = 0; i < 2000; i++) c.frame((t += 16), 0.016);
    expect(c.stats().frames).toBe(2000); // more than any ring buffer
  });
  it('a steady 30 fps counts as smooth', () => {
    const c = createFpsCounter('?fps=1', document.createElement('div'));
    let t = 0;
    c.frame(t, 0);
    for (let i = 0; i < 300; i++) c.frame((t += 1000 / 30), 1 / 30);
    const s = c.stats();
    expect(s.shareWithin34).toBe(1);
    expect(s.fps).toBeCloseTo(30, 0);
  });
  it('a pause is skipped, not counted as one huge frame', () => {
    const c = createFpsCounter('?fps=1', document.createElement('div'));
    let t = 0;
    c.frame(t, 0);
    c.frame((t = WARMUP_MS + 16), 0.016);
    c.frame((t += 16), 0.016); // counted
    c.frame((t += 60000), 0); // came back from a pause
    c.frame((t += 16), 0.016); // counted
    const s = c.stats();
    expect(s.frames).toBe(2);
    expect(s.worst).toBe(16);
    expect(s.over200).toBe(0);
  });
});
