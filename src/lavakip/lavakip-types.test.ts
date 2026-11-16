import { describe, expect, it } from 'vitest';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { checkLavakip } from './lavakip-types';

const ok = (raw: unknown) => checkLavakip(raw, WORLD_SIZE, WORLD_HEIGHT);
const spot = { x: 10, y: 12, z: 10 };

describe('checkLavakip (AC318)', () => {
  it('accepts the default, a bought bar with a spot and a bought bar with no spot', () => {
    expect(ok({ bought: false, spot: null, carried: 0 })).toBe(true);
    expect(ok({ bought: true, spot, carried: 10 })).toBe(true);
    expect(ok({ bought: true, spot: null, carried: 3 })).toBe(true);
  });
  it('refuses carried 11, -1 and 1.5, and a carried that is not a number', () => {
    for (const carried of [11, -1, 1.5, '3', null, NaN]) expect(ok({ bought: true, spot, carried })).toBe(false);
  });
  it('refuses a spot outside the world, a spot that is not whole data, and a spot with bought false', () => {
    expect(ok({ bought: true, spot: { x: WORLD_SIZE + 1, y: 12, z: 10 }, carried: 0 })).toBe(false);
    expect(ok({ bought: true, spot: { x: 10, y: -1, z: 10 }, carried: 0 })).toBe(false);
    expect(ok({ bought: true, spot: { x: 10, y: 12 }, carried: 0 })).toBe(false);
    expect(ok({ bought: false, spot, carried: 0 })).toBe(false);
  });
  it('refuses a bought that is not a boolean and anything that is not an object', () => {
    expect(ok({ bought: 1, spot: null, carried: 0 })).toBe(false);
    for (const raw of [null, undefined, 5, 'x', []]) expect(ok(raw)).toBe(false);
  });
});
