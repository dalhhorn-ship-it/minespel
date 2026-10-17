import { describe, expect, it } from 'vitest';
import type { ProgressRecord } from '../storage/progress-store';
import { GENERATED_CAP, newSumExclude, savedSums, sumsToForget } from './generated-items';

const rec = (itemId: string, due: string, topic = 'optellen', moduleId = 'm'): ProgressRecord => ({
  moduleId, itemId, box: 1, due, level: 'M6', topic, skill: 's', seen: 1,
});

describe('generated items', () => {
  it('lists saved sums of one topic, oldest due day first', () => {
    const list = [rec('b', '2026-10-02'), rec('a', '2026-10-01'), rec('x', '2026-10-01', 'aftrekken'), rec('o', '2026-10-01', 'optellen', 'other')];
    expect(savedSums(list, 'm', 'optellen').map((r) => r.itemId)).toEqual(['a', 'b']);
  });

  it('AC63: excludes every saved sum and the extra ids', () => {
    const ex = newSumExclude([rec('a', '2026-10-01'), rec('x', '2026-10-01', 'aftrekken')], 'm', 'optellen', ['z']);
    expect([...ex].sort()).toEqual(['a', 'z']);
  });

  it('AC126: with more than 200 saved sums the oldest are forgotten, the 200 newest stay', () => {
    const day = (i: number) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
    const list = Array.from({ length: GENERATED_CAP + 5 }, (_, i) => rec(`optellen:${i}+1`, day(i)));
    const gone = sumsToForget(list, 'm', 'optellen');
    expect(gone.map((r) => r.itemId)).toEqual(Array.from({ length: 5 }, (_, i) => `optellen:${i}+1`));
    expect(sumsToForget(list.slice(0, GENERATED_CAP), 'm', 'optellen')).toEqual([]);
    expect(sumsToForget(list, 'm', 'aftrekken')).toEqual([]);
  });
});
