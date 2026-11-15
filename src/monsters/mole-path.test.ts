import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildMoleMap, CLIFF_X, GY, LAVA_X, OVERHANG_X, PEN1, PEN2, PIT, STEP2_X, WALL1_X, WATER_X, Z, box, ring,
} from '../../tests/fixtures/maps/mole-map';
import { STEEN } from '../world/blocks';
import type { World } from '../world/world';
import { findMolePath, isStandCell, lastSearchCells } from './mole-path';
import { SEARCH_LAYERS, SEARCH_SIDE, type Cell } from './monster-types';

let world: World;
beforeAll(() => {
  world = buildMoleMap();
});

const find = (from: Cell, to: Cell, headroom = 1, avoid?: Cell): Cell[] | null =>
  findMolePath(world, from, [to], { headroom, avoid });

/** Every step of a path is one column away and at most 1 up or 3 down. */
function validSteps(path: Cell[]): boolean {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1] as Cell;
    const b = path[i] as Cell;
    if (Math.abs(a.x - b.x) + Math.abs(a.z - b.z) !== 1 || b.y - a.y > 1 || a.y - b.y > 3) return false;
  }
  return true;
}

describe('the mole path search (v16, AC248)', () => {
  it('AC248: a path over the wall 1 high', () => {
    const path = find({ x: WALL1_X - 5, y: GY, z: Z }, { x: WALL1_X + 5, y: GY, z: Z });
    expect(path).not.toBeNull();
    expect(path?.[0]).toEqual({ x: WALL1_X - 5, y: GY, z: Z });
    expect(path?.at(-1)).toEqual({ x: WALL1_X + 5, y: GY, z: Z });
    expect(path?.some((c) => c.x === WALL1_X && c.y === GY + 1)).toBe(true);
    expect(validSteps(path as Cell[])).toBe(true);
  });

  it('AC248: through the gap 1 high under the overhang, and headroom 2 refuses it', () => {
    const from = { x: OVERHANG_X - 4, y: GY, z: Z };
    const to = { x: OVERHANG_X + 4, y: GY, z: Z };
    const path = find(from, to);
    expect(path).not.toBeNull();
    expect(path?.some((c) => c.x === OVERHANG_X && c.y === GY && c.z === Z)).toBe(true);
    expect(find(from, to, 2)).toBeNull();
  });

  it('AC248: down the pit of 3', () => {
    const path = find({ x: PIT.x0 - 3, y: GY, z: PIT.z0 + 1 }, { x: PIT.x0 + 1, y: GY - 3, z: PIT.z0 + 1 });
    expect(path).not.toBeNull();
    expect(path?.at(-1)?.y).toBe(GY - 3);
    expect(validSteps(path as Cell[])).toBe(true);
  });

  it('AC248: none into the closed pen 2 high', () => {
    const from = { x: PEN2.x0 - 6, y: GY, z: PEN2.z0 + 2 };
    expect(find(from, { x: PEN2.x0 + 2, y: GY, z: PEN2.z0 + 2 })).toBeNull();
  });

  it('AC249: a pen 1 high is stepped over', () => {
    const from = { x: PEN1.x0 - 6, y: GY, z: PEN1.z0 + 2 };
    const path = find(from, { x: PEN1.x0 + 2, y: GY, z: PEN1.z0 + 2 });
    expect(path).not.toBeNull();
    expect(path?.some((c) => c.y === GY + 1)).toBe(true);
  });

  it('AC248: none up the step of 2', () => {
    expect(find({ x: STEP2_X - 5, y: GY, z: Z }, { x: STEP2_X + 1, y: GY + 2, z: Z })).toBeNull();
    expect(find({ x: STEP2_X - 5, y: GY, z: Z }, { x: STEP2_X + 5, y: GY, z: Z })).toBeNull();
  });

  it('AC248: none down the cliff of 4', () => {
    expect(find({ x: CLIFF_X + 2, y: GY + 4, z: Z }, { x: CLIFF_X - 5, y: GY, z: Z })).toBeNull();
  });

  it('a gap in the fence lets him through, a fence 2 high with a hole does not close', () => {
    const w = buildMoleMap();
    box(w, PEN2.x0 - 1, PEN2.x0 - 1, PEN2.z0 + 2, PEN2.z0 + 2, GY, GY + 1, 0);
    const path = findMolePath(w, { x: PEN2.x0 - 6, y: GY, z: PEN2.z0 + 2 }, [{ x: PEN2.x0 + 2, y: GY, z: PEN2.z0 + 2 }], { headroom: 1 });
    expect(path).not.toBeNull();
    // A knight (headroom 2) fits through a hole 2 high.
    expect(findMolePath(w, { x: PEN2.x0 - 6, y: GY, z: PEN2.z0 + 2 }, [{ x: PEN2.x0 + 2, y: GY, z: PEN2.z0 + 2 }], { headroom: 2 })).not.toBeNull();
  });

  it('no walking over lava or water, and no standing on them', () => {
    expect(find({ x: LAVA_X - 3, y: GY, z: Z }, { x: LAVA_X + 6, y: GY, z: Z })).toBeNull();
    expect(find({ x: WATER_X - 3, y: GY, z: Z }, { x: WATER_X + 6, y: GY, z: Z })).toBeNull();
    expect(isStandCell(world, LAVA_X + 1, GY, Z, 1)).toBe(false);
    expect(isStandCell(world, WATER_X + 1, GY, Z, 1)).toBe(false);
    expect(isStandCell(world, 5, GY, Z, 1)).toBe(true);
  });

  it('a wall closing him in is the same as a pen', () => {
    const w = buildMoleMap();
    ring(w, { x0: 10, x1: 10, z0: 60, z1: 60 }, 2);
    expect(findMolePath(w, { x: 10, y: GY, z: 60 }, [{ x: 10, y: GY, z: 70 }], { headroom: 1 })).toBeNull();
    expect(findMolePath(w, { x: 10, y: GY, z: 60 }, [{ x: 10, y: GY, z: 60 }], { headroom: 1 })).toHaveLength(1);
  });

  it('AC252: avoid keeps every cell within 1 block of the kid', () => {
    const kid = { x: 30, y: GY, z: Z };
    const path = find({ x: 26, y: GY, z: Z }, { x: 34, y: GY, z: Z }, 1, kid);
    expect(path).not.toBeNull();
    for (const c of path as Cell[]) expect(Math.max(Math.abs(c.x - kid.x), Math.abs(c.z - kid.z))).toBeGreaterThan(1);
  });

  it('AC248: a search never looks at more than 49 x 49 x 17 cells, and is deterministic', () => {
    const cap = SEARCH_SIDE * SEARCH_SIDE * SEARCH_LAYERS;
    expect(cap).toBe(40_817);
    // An open field with no reachable goal visits the whole box layer.
    expect(find({ x: 80, y: GY, z: 30 }, { x: 80, y: GY + 5, z: 30 })).toBeNull();
    expect(lastSearchCells).toBeGreaterThan(1000);
    expect(lastSearchCells).toBeLessThanOrEqual(cap);
    const a = find({ x: 5, y: GY, z: 5 }, { x: 30, y: GY, z: 30 });
    const b = find({ x: 5, y: GY, z: 5 }, { x: 30, y: GY, z: 30 });
    expect(a).toEqual(b);
  });

  it('a goal outside the box is not found, and a cell that became solid is refused', () => {
    expect(find({ x: 5, y: GY, z: 5 }, { x: 5 + 30, y: GY, z: 5 })).toBeNull();
    const w = buildMoleMap();
    w.set(8, GY, 5, STEEN);
    w.set(8, GY + 1, 5, STEEN);
    const p = findMolePath(w, { x: 5, y: GY, z: 5 }, [{ x: 11, y: GY, z: 5 }], { headroom: 1 });
    expect(p?.some((c) => c.x === 8 && c.z === 5)).toBe(false);
  });
});
