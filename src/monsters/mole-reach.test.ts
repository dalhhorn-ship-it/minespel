import { describe, expect, it } from 'vitest';
import { box, FLOOR, GY, ring } from '../../tests/fixtures/maps/mole-map';
import { AIR, STEEN } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { checkReach, lastReachColumns, nearReach, REACH_LIMIT, type ReachBox } from './mole-reach';

function flat(): World {
  const w = new World();
  const last = WORLD_SIZE - 1;
  box(w, 0, last, 0, last, 0, FLOOR, STEEN);
  box(w, 0, last, 0, last, GY, WORLD_HEIGHT - 1, AIR);
  return w;
}

const here = (x: number, z: number) => ({ x, y: GY, z });
const out = (): ReachBox => ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0 });

describe('the pen check (v22, AC296)', () => {
  it('AC296: pens 3 x 3 and 6 x 6 inside a wall 2 high catch him with at most 36 columns', () => {
    for (const side of [3, 6]) {
      const w = flat();
      ring(w, { x0: 50, x1: 49 + side, z0: 50, z1: 49 + side }, 2);
      expect(checkReach(w, here(50, 50), out())).toBe(true);
      expect(lastReachColumns).toBe(side * side);
      expect(lastReachColumns).toBeLessThanOrEqual(36);
    }
  });

  it('AC296: a pen of 6 x 7 is free and the flood stops at 37 columns', () => {
    const w = flat();
    ring(w, { x0: 50, x1: 55, z0: 50, z1: 56 }, 2);
    expect(checkReach(w, here(50, 50), out())).toBe(false);
    expect(lastReachColumns).toBe(REACH_LIMIT);
  });

  it('AC296: a wall only 1 high never catches him, and never more than 37 columns are looked at', () => {
    const w = flat();
    ring(w, { x0: 50, x1: 52, z0: 50, z1: 52 }, 1);
    expect(checkReach(w, here(51, 51), out())).toBe(false);
    expect(lastReachColumns).toBeLessThanOrEqual(37);
  });

  it('AC296: open ground is free and a block change next to the pen is seen, far away is not', () => {
    const w = flat();
    ring(w, { x0: 50, x1: 52, z0: 50, z1: 52 }, 2);
    const b = out();
    expect(checkReach(w, here(51, 51), b)).toBe(true);
    expect(nearReach(b, 49, 51)).toBe(true);
    expect(nearReach(b, 48, 51)).toBe(false);
    // Mining one wall block (both levels) lets him out.
    w.set(49, GY, 51, AIR);
    w.set(49, GY + 1, 51, AIR);
    expect(checkReach(w, here(51, 51), out())).toBe(false);
    expect(checkReach(flat(), here(10, 10), out())).toBe(false);
  });

  it('AC296: a pen with a step inside still counts columns, not cells', () => {
    const w = flat();
    ring(w, { x0: 50, x1: 54, z0: 50, z1: 54 }, 2);
    w.set(52, GY, 52, STEEN);
    expect(checkReach(w, here(50, 50), out())).toBe(true);
    expect(lastReachColumns).toBeLessThanOrEqual(25);
  });
});
