import { beforeAll, describe, expect, it } from 'vitest';
import { buildMoleMap, GY, OVERHANG_X, WALL1_X, Z } from '../../tests/fixtures/maps/mole-map';
import { STEEN } from '../world/blocks';
import type { World } from '../world/world';
import { findMolePath } from './mole-path';
import type { Cell } from './monster-types';
import { followPath, type Walker } from './path-follow';

let world: World;
beforeAll(() => {
  world = buildMoleMap();
});

const OPTS = { headroom: 1 };

describe('the path follower (v16, AC248)', () => {
  it('AC248: every step of a walk is a path cell in order', () => {
    const from = { x: WALL1_X - 4, y: GY, z: Z };
    const path = findMolePath(world, from, [{ x: WALL1_X + 4, y: GY, z: Z }], { headroom: 1 }) as Cell[];
    const left = path.map((c) => ({ ...c }));
    const w: Walker = { x: from.x + 0.5, y: GY, z: from.z + 0.5, heading: 0 };
    const seen: Cell[] = [];
    for (let i = 0; i < 400; i++) {
      const r = followPath(world, w, left, 0.05, 1, OPTS);
      const c = { x: Math.floor(w.x), y: Math.round(w.y), z: Math.floor(w.z) };
      if (seen.length === 0 || JSON.stringify(seen.at(-1)) !== JSON.stringify(c)) seen.push(c);
      if (r === 'arrived') break;
    }
    // The cells he stood in, in order, are the path cells in order (the hop up comes at the edge).
    let k = 0;
    for (const c of seen) {
      while (k < path.length && JSON.stringify(path[k]) !== JSON.stringify(c)) k++;
      expect(k).toBeLessThan(path.length);
    }
    expect(w.x).toBeCloseTo(WALL1_X + 4.5);
    expect(w.y).toBe(GY);
  });

  it('AC248: 1 block per second, plus or minus 20 percent, over 5 s', () => {
    const path: Cell[] = [];
    for (let x = 2; x <= 20; x++) path.push({ x, y: GY, z: 3 });
    const w: Walker = { x: 2.5, y: GY, z: 3.5, heading: 0 };
    for (let i = 0; i < 100; i++) followPath(world, w, path, 0.05, 1, OPTS);
    expect(w.x - 2.5).toBeGreaterThan(5 * 0.8);
    expect(w.x - 2.5).toBeLessThan(5 * 1.2);
    expect(w.z).toBeCloseTo(3.5);
  });

  it('AC248: a cell that became solid makes it ask for a new search', () => {
    const w2 = buildMoleMap();
    const path: Cell[] = [{ x: 4, y: GY, z: 3 }, { x: 5, y: GY, z: 3 }, { x: 6, y: GY, z: 3 }];
    const w: Walker = { x: 3.5, y: GY, z: 3.5, heading: 0 };
    expect(followPath(w2, w, path, 0.3, 1, OPTS)).toBe('moving');
    w2.set(5, GY, 3, STEEN);
    w2.set(5, GY + 1, 3, STEEN);
    expect(followPath(w2, w, path, 1, 1, OPTS)).toBe('replan');
  });

  it('a step into a cell within 1 block of the kid waits', () => {
    const path: Cell[] = [{ x: 6, y: GY, z: 3 }];
    const w: Walker = { x: 5.5, y: GY, z: 3.5, heading: 0 };
    expect(followPath(world, w, path, 1, 1, { headroom: 1, kid: { x: 7, y: GY, z: 3 } })).toBe('wait');
    expect(w.x).toBe(5.5);
  });

  it('through the gap under the overhang, y follows the floor', () => {
    const from = { x: OVERHANG_X - 2, y: GY, z: Z };
    const path = findMolePath(world, from, [{ x: OVERHANG_X + 2, y: GY, z: Z }], { headroom: 1 }) as Cell[];
    const w: Walker = { x: from.x + 0.5, y: GY, z: Z + 0.5, heading: 0 };
    for (let i = 0; i < 200 && followPath(world, w, path, 0.05, 1, OPTS) !== 'arrived'; i++) expect(w.y).toBe(GY);
    expect(w.x).toBeCloseTo(OVERHANG_X + 2.5);
  });
});
