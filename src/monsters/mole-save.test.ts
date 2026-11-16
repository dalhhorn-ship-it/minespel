import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { checkMoles, readMoles } from './mole-save';

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
