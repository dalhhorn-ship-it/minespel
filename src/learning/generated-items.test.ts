import { describe, expect, it } from 'vitest';
import type { ProgressRecord } from '../storage/progress-store';
import { GENERATED_CAP, newSumExclude, savedSums, sumsToForget } from './generated-items';

const rec = (itemId: string, due: string, topic = 'optellen', moduleId = 'm', added?: number): ProgressRecord => ({
  moduleId, itemId, box: 1, due, level: 'M6', topic, skill: 's', seen: 1, ...(added === undefined ? {} : { added }),
});

describe('generated items', () => {
  it('lists saved sums of one topic, oldest added first, no added counts as oldest', () => {
    const list = [rec('b', '2026-10-01', 'optellen', 'm', 20), rec('a', '2026-10-09', 'optellen', 'm', 10), rec('n', '2026-10-05'), rec('x', '2026-10-01', 'aftrekken', 'm', 1), rec('o', '2026-10-01', 'optellen', 'other', 1)];
    expect(savedSums(list, 'm', 'optellen').map((r) => r.itemId)).toEqual(['n', 'a', 'b']);
  });

  it('AC63: excludes every saved sum and the extra ids', () => {
    const ex = newSumExclude([rec('a', '2026-10-01'), rec('x', '2026-10-01', 'aftrekken')], 'm', 'optellen', ['z']);
    expect([...ex].sort()).toEqual(['a', 'z']);
  });

  it('AC126: with more than 200 saved sums the oldest are forgotten, the 200 newest stay', () => {
    const day = (i: number) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`;
    const list = Array.from({ length: GENERATED_CAP + 5 }, (_, i) => rec(`optellen:${i}+1`, day(i), 'optellen', 'm', 100 + i));
    const gone = sumsToForget(list, 'm', 'optellen');
    expect(gone.map((r) => r.itemId)).toEqual(Array.from({ length: 5 }, (_, i) => `optellen:${i}+1`));
    expect(sumsToForget(list.slice(0, GENERATED_CAP), 'm', 'optellen')).toEqual([]);
    expect(sumsToForget(list, 'm', 'aftrekken')).toEqual([]);
  });

  it('AC126: newest by added stay even when they are due soon and the old ones are in far away boxes', () => {
    const old = Array.from({ length: GENERATED_CAP }, (_, i) => ({ ...rec(`old:${i}`, `2030-01-${String(1 + (i % 28)).padStart(2, '0')}`, 'optellen', 'm', 1000 + i), box: 5 }));
    const fresh = Array.from({ length: 7 }, (_, i) => rec(`new:${i}`, '2026-10-17', 'optellen', 'm', 5000 + i));
    const legacy = rec('legacy', '2031-01-01');
    const gone = sumsToForget([...old, legacy, ...fresh], 'm', 'optellen').map((r) => r.itemId);
    expect(gone).toEqual(['legacy', 'old:0', 'old:1', 'old:2', 'old:3', 'old:4', 'old:5', 'old:6']);
  });
});
