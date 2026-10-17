import { describe, expect, it } from 'vitest';
import { addDays, createFakeClock, dayKey, daysBetween, effectiveDay, isDue, today } from './clock';

const local = (y: number, m: number, d: number, h = 12, min = 0): number => new Date(y, m - 1, d, h, min).getTime();

describe('clock', () => {
  it('fake clock moves only when told, and can go back', () => {
    const c = createFakeClock(1000);
    expect(c.now()).toBe(1000);
    c.advance(500);
    expect(c.now()).toBe(1500);
    c.set(10);
    expect(c.now()).toBe(10);
  });

  it('dayKey uses the local calendar day', () => {
    expect(dayKey(local(2026, 10, 17, 0, 0))).toBe('2026-10-17');
    expect(dayKey(local(2026, 10, 17, 23, 59))).toBe('2026-10-17');
    expect(dayKey(local(2026, 10, 18, 0, 1))).toBe('2026-10-18');
    expect(today(createFakeClock(local(2026, 1, 5)))).toBe('2026-01-05');
  });

  it('changes day across midnight', () => {
    const c = createFakeClock(local(2026, 12, 31, 23, 59));
    const before = today(c);
    c.advance(2 * 60_000);
    expect(before).toBe('2026-12-31');
    expect(today(c)).toBe('2027-01-01');
  });

  it('daysBetween and addDays work over months, leap days and DST', () => {
    expect(daysBetween('2026-10-17', '2026-10-20')).toBe(3);
    expect(daysBetween('2026-10-20', '2026-10-17')).toBe(-3);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-17', 0)).toBe('2026-10-17');
  });

  it('rejects a bad day key', () => {
    expect(() => daysBetween('nope', '2026-01-01')).toThrow();
  });

  it('an item due today stays due when the clock is set back 3 days (AC118)', () => {
    const due = '2026-10-17';
    const lastSeen = '2026-10-17';
    const clockDay = addDays(lastSeen, -3);
    expect(isDue(due, clockDay)).toBe(false);
    expect(isDue(due, effectiveDay(clockDay, lastSeen))).toBe(true);
    expect(due).toBe('2026-10-17');
  });

  it('effectiveDay follows the clock when it moves forward or nothing was seen', () => {
    expect(effectiveDay('2026-10-18', '2026-10-17')).toBe('2026-10-18');
    expect(effectiveDay('2026-10-18', null)).toBe('2026-10-18');
    expect(effectiveDay('2026-10-18', undefined)).toBe('2026-10-18');
  });
});
