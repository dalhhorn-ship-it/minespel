import { describe, expect, it } from 'vitest';
import { applyFirstTry, dueDayFor, isItemDue, isMastered, nextBox } from './srs';

const TODAY = '2026-10-17';

describe('srs', () => {
  it('AC40: new item right goes to box 2, due next calendar day', () => {
    expect(applyFirstTry(0, true, TODAY)).toEqual({ box: 2, due: '2026-10-18' });
  });

  it('AC42: boxes 2,3,4,5 right go to 3,4,5,5 due in 3,7,21,21 days', () => {
    expect(applyFirstTry(2, true, TODAY)).toEqual({ box: 3, due: '2026-10-20' });
    expect(applyFirstTry(3, true, TODAY)).toEqual({ box: 4, due: '2026-10-24' });
    expect(applyFirstTry(4, true, TODAY)).toEqual({ box: 5, due: '2026-11-07' });
    expect(applyFirstTry(5, true, TODAY)).toEqual({ box: 5, due: '2026-11-07' });
  });

  it('box 1 right goes to box 2', () => {
    expect(nextBox(1, true)).toBe(2);
  });

  it('AC41 and AC148: first try wrong goes to box 1, due today (next break)', () => {
    for (const box of [0, 1, 2, 3, 4, 5]) {
      expect(applyFirstTry(box, false, TODAY)).toEqual({ box: 1, due: TODAY });
    }
  });

  it('counts calendar days over month and year ends', () => {
    expect(dueDayFor(5, '2026-12-20')).toBe('2027-01-10');
  });

  it('mastered at box 4 and 5', () => {
    expect([0, 1, 2, 3].some(isMastered)).toBe(false);
    expect(isMastered(4) && isMastered(5)).toBe(true);
  });

  it('due from 00:00 of the due day, evening to morning counts', () => {
    const item = { box: 2, due: '2026-10-18' };
    expect(isItemDue(item, '2026-10-17')).toBe(false);
    expect(isItemDue(item, '2026-10-18')).toBe(true);
    expect(isItemDue(item, '2026-10-19')).toBe(true);
  });

  it('AC118: clock set back 3 days keeps due items due and changes nothing stored', () => {
    const item = { box: 3, due: TODAY };
    const before = { ...item };
    expect(isItemDue(item, '2026-10-14', TODAY)).toBe(true);
    expect(item).toEqual(before);
  });

  it('never seen items (box 0) are not due', () => {
    expect(isItemDue({ box: 0, due: '2000-01-01' }, TODAY)).toBe(false);
  });
});
