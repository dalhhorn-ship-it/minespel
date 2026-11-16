import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { checkMoles, readMoles, sameMoles, toSavedMole } from './mole-save';

const ok = (raw: unknown) => checkMoles(raw, WORLD_SIZE, WORLD_HEIGHT);
const caught = (x = 10) => ({ x, y: 12, z: 10, state: 'caught' });

describe('checkMoles (AC299)', () => {
  it('accepts a missing list, an empty list, 3 caught plus 1 free and an away mole with its time', () => {
    expect(ok(undefined)).toBe(true);
    expect(ok([])).toBe(true);
    expect(ok([caught(1), caught(2), caught(3), { x: 5, y: 12, z: 5, state: 'free' }])).toBe(true);
    expect(ok([{ x: 5, y: 12, z: 5, state: 'away', awayMs: 0 }, { x: 5, y: 12, z: 5, state: 'away' }].slice(0, 1))).toBe(true);
    expect(ok([{ x: 5, y: 12, z: 5, state: 'away', awayMs: 90_000 }])).toBe(true);
  });
  it('refuses 5 moles, two that are free or away, a bad state and a list that is not an array', () => {
    expect(ok([caught(1), caught(2), caught(3), caught(4), caught(5)])).toBe(false);
    expect(ok([{ x: 5, y: 12, z: 5, state: 'free' }, { x: 6, y: 12, z: 5, state: 'away', awayMs: 5 }])).toBe(false);
    expect(ok([{ x: 5, y: 12, z: 5, state: 'out' }])).toBe(false);
    expect(ok({})).toBe(false);
    expect(ok(null)).toBe(false);
  });
  it('refuses a spot outside the world or not finite', () => {
    expect(ok([{ ...caught(), z: WORLD_SIZE + 1 }])).toBe(false);
    expect(ok([{ ...caught(), x: -1 }])).toBe(false);
    expect(ok([{ ...caught(), y: Infinity }])).toBe(false);
    expect(ok([{ x: 1, y: 1, state: 'caught' }])).toBe(false);
  });
  it('refuses awayMs on a mole that is not away and awayMs of -1, 90 001 or 1.5', () => {
    expect(ok([{ ...caught(), awayMs: 1000 }])).toBe(false);
    for (const awayMs of [-1, 90_001, 1.5, '5']) expect(ok([{ x: 5, y: 12, z: 5, state: 'away', awayMs }])).toBe(false);
  });
});

describe('readMoles', () => {
  it('gives clean copies, drops bad rows and keeps at most 4 and one that is not caught', () => {
    expect(readMoles({})).toEqual([]);
    expect(readMoles({ moles: 'x' })).toEqual([]);
    const out = readMoles({
      moles: [caught(1), { x: 'a', y: 1, z: 1, state: 'caught' }, { x: 5, y: 12, z: 5, state: 'away', awayMs: 500_000 },
        { x: 6, y: 12, z: 5, state: 'free' }, caught(2), caught(3), caught(4)],
    });
    expect(out).toEqual([caught(1), { x: 5, y: 12, z: 5, state: 'away', awayMs: 90_000 }, caught(2), caught(3)]);
  });
  it('an away mole with no time left value reads as 60 seconds', () => {
    expect(readMoles({ moles: [{ x: 5, y: 12, z: 5, state: 'away' }] })).toEqual([{ x: 5, y: 12, z: 5, state: 'away', awayMs: 60_000 }]);
  });
});

describe('toSavedMole and sameMoles (AC299, AC335)', () => {
  const base = { caught: false, dove: null, x: 10.123, y: 12, z: 20.456, awayMs: 0 };
  it('AC299: a caught and a free mole keep their spot, a rumble is never saved', () => {
    expect(toSavedMole({ ...base, phase: 'out', caught: true }, 12)).toEqual({ x: 10.12, y: 12, z: 20.46, state: 'caught' });
    expect(toSavedMole({ ...base, phase: 'out' }, 12)).toEqual({ x: 10.12, y: 12, z: 20.46, state: 'free' });
    expect(toSavedMole({ ...base, phase: 'rumble' }, 12)).toBeNull();
  });
  it('AC335: an away mole (also one still sinking) keeps where he dove and a whole away time from 0 to 90 000', () => {
    const dove = { x: 3.5, z: 4.5 };
    expect(toSavedMole({ ...base, phase: 'away', dove, awayMs: 40_000.4 }, 11)).toEqual({ x: 3.5, y: 11, z: 4.5, state: 'away', awayMs: 40_000 });
    expect(toSavedMole({ ...base, phase: 'leaving', dove, awayMs: 75_000 }, 11)?.state).toBe('away');
    expect(toSavedMole({ ...base, phase: 'away', dove, awayMs: -5 }, 11)?.awayMs).toBe(0);
    expect(toSavedMole({ ...base, phase: 'away', dove, awayMs: 99_999 }, 11)?.awayMs).toBe(90_000);
    expect(toSavedMole({ ...base, phase: 'leaving' }, 11)).toBeNull();
  });
  it('AC299: what the writer makes passes the backup check and reads back the same', () => {
    const rows = [
      toSavedMole({ ...base, phase: 'out', caught: true }, 12),
      toSavedMole({ ...base, phase: 'away', dove: { x: 3.5, z: 4.5 }, awayMs: 40_000 }, 11),
    ];
    expect(ok(rows)).toBe(true);
    expect(readMoles({ moles: rows })).toEqual(rows);
  });
  it('sameMoles compares rows, with a tolerance for the away time', () => {
    const a = [{ x: 1, y: 2, z: 3, state: 'away' as const, awayMs: 40_000 }];
    expect(sameMoles(a, [{ ...a[0]!, awayMs: 39_000 }])).toBe(false);
    expect(sameMoles(a, [{ ...a[0]!, awayMs: 39_000 }], 2500)).toBe(true);
    expect(sameMoles(a, [{ ...a[0]!, state: 'caught' as const }])).toBe(false);
    expect(sameMoles(a, [])).toBe(false);
  });
});
