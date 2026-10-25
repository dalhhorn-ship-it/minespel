import { describe, expect, it } from 'vitest';
import { createRng, shuffle } from './rng';

describe('createRng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 50; i++) expect(a.next()).toBe(b.next());
  });

  it('gives a different sequence for another seed', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('stays in range', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const f = r.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = r.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
  });
});

describe('shuffle', () => {
  const list = [1, 2, 3, 4, 5, 6, 7, 8];

  it('gives a pinned order for seed 1', () => {
    expect(shuffle(list, createRng(1))).toEqual([3, 2, 7, 8, 5, 4, 1, 6]);
  });

  it('gives a pinned order for seed 2024', () => {
    expect(shuffle(list, createRng(2024))).toEqual([8, 1, 2, 3, 6, 4, 5, 7]);
  });

  it('keeps every element and never changes the input', () => {
    const input = [...list];
    const out = shuffle(input, createRng(5));
    expect(input).toEqual(list);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(list);
  });
});
