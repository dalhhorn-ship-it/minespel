import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { createDino, type DinoState } from '../dinos/dino-ai';
import { AIR, LAVA, STEEN, WATER } from '../world/blocks';
import { START_SPOT, WORLD_HEIGHT } from '../world/terrain';
import { World } from '../world/world';
import { findMoleSpawn, isMoleTarget } from './mole-wake';

const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
const dig = { x: Math.floor(kid.x), z: Math.floor(kid.z) };
const dino = (dx: number, dz: number): DinoState =>
  createDino({ kind: 'kip', golden: false, x: kid.x + dx, y: kid.y, z: kid.z + dz }, true);
const cheb = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));

function topOf(w: World, x: number, z: number): number {
  let y = WORLD_HEIGHT - 1;
  while (y > 0 && w.get(x, y, z) === AIR) y--;
  return y;
}

describe('findMoleSpawn (AC246)', () => {
  it('AC246: 20 seeded wakes with target animals follow every spot rule', () => {
    const world = new World();
    const animals = [dino(12, 0), dino(-10, 9), dino(0, -14)];
    for (let seed = 1; seed <= 20; seed++) {
      const spot = findMoleSpawn(world, kid, dig, animals, createRng(seed));
      expect(spot).not.toBeNull();
      const s = spot!;
      const col = { x: Math.floor(s.x), z: Math.floor(s.z) };
      expect(cheb(s, kid)).toBeGreaterThan(5);
      expect(cheb(col, dig)).toBeGreaterThan(1);
      expect(animals.some((a) => cheb(s, a) <= 16.5)).toBe(true);
      expect(s.y).toBe(topOf(world, col.x, col.z) + 1);
      const under = world.get(col.x, s.y - 1, col.z);
      expect([WATER, LAVA, AIR]).not.toContain(under);
      expect(world.isUnchanged(col.x, s.y, col.z)).toBe(true);
    }
  });
  it('AC246: no spot within 3 blocks of a changed cell', () => {
    const world = new World();
    const a = dino(12, 0);
    const base = findMoleSpawn(world, kid, dig, [a], createRng(3))!;
    const col = { x: Math.floor(base.x), z: Math.floor(base.z) };
    world.set(col.x + 3, base.y + 2, col.z - 3, STEEN);
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, kid, dig, [a], createRng(seed))!;
      const c = { x: Math.floor(s.x), z: Math.floor(s.z) };
      expect(Math.max(Math.abs(c.x - (col.x + 3)), Math.abs(c.z - (col.z - 3)), Math.abs(s.y - (base.y + 2)))).toBeGreaterThan(3);
    }
  });
  it('AC246: with no target animal the spot is 6 to 10 blocks from the kid', () => {
    const world = new World();
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, kid, dig, [], createRng(seed))!;
      expect(s).not.toBeNull();
      const d = cheb(s, kid);
      expect(d).toBeGreaterThanOrEqual(6);
      expect(d).toBeLessThanOrEqual(10);
    }
  });
  it('AC246: animals on Volg mij, called or running are no target', () => {
    const follow = dino(8, 0);
    follow.mode = 'follow';
    const called = dino(8, 0);
    called.called = 5;
    const fleeing = dino(8, 0);
    fleeing.flee = { x: 0, z: 0, left: 1, backX: 0, backZ: 0 } as never;
    expect([follow, called, fleeing].some(isMoleTarget)).toBe(false);
    expect(isMoleTarget(dino(8, 0))).toBe(true);
  });
  it('AC246: a seeded map where no spot fits gives null', () => {
    const world = new World();
    // One changed cell in the middle of every candidate area is not enough; change every column of the ring.
    const a = dino(0, 12);
    for (let x = dig.x - 40; x <= dig.x + 40; x++) {
      for (let z = dig.z - 40; z <= dig.z + 40; z++) {
        const y = topOf(world, x, z);
        if (y >= 0) world.set(x, y + 1, z, STEEN);
      }
    }
    expect(findMoleSpawn(world, kid, dig, [a], createRng(1))).toBeNull();
  });
  it('AC246: the shaft case, no spot within 5 of the kid or within 1 of the dig column', () => {
    const world = new World();
    for (let seed = 1; seed <= 20; seed++) {
      const s = findMoleSpawn(world, { ...kid, y: kid.y - 15 }, dig, [dino(2, 2)], createRng(seed))!;
      expect(cheb(s, kid)).toBeGreaterThan(5);
      expect(cheb({ x: Math.floor(s.x), z: Math.floor(s.z) }, dig)).toBeGreaterThan(1);
    }
  });
});
