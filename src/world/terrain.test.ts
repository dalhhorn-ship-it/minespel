import { describe, expect, it } from 'vitest';
import { BLADEREN, BOOMSTAM, GRAS } from './blocks';
import {
  CELL_COUNT, CURRENT_TERRAIN_VERSION, START_SPOT, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain,
} from './terrain';
import { LEGACY_START_SPOT } from './terrain-legacy';
import { MOVE, startWorld } from './terrain-v3';
import { LEGACY_VILLAGE_SITES, VILLAGE_SITES, houseCells, moveSite, siteRegion } from './village-layout';

/** Cell for cell equality. `toEqual` on 1.3 million cells is slow, and a failing `expect` would print them. */
function sameCells(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe('terrain.ts after the big world switch (v15)', () => {
  it('AC230: the world is 128 x 128 x 80 and the terrain version is 3', () => {
    expect(WORLD_SIZE).toBe(128);
    expect(WORLD_HEIGHT).toBe(80);
    expect(CELL_COUNT).toBe(128 * 80 * 128);
    expect(CURRENT_TERRAIN_VERSION).toBe(3);
    expect(cellIndex(1, 2, 3)).toBe((2 * 128 + 3) * 128 + 1);
  });

  it('AC230: generateTerrain gives a copy of the start world, the same every time, safe to write', () => {
    const a = generateTerrain();
    expect(a.length).toBe(CELL_COUNT);
    // Compared as bytes: toEqual on 1.3 million cells is slow.
    expect(sameCells(a, startWorld(WORLD_SEED))).toBe(true);
    expect(a === startWorld(WORLD_SEED)).toBe(false);
    a.fill(9);
    expect(sameCells(generateTerrain(), startWorld(WORLD_SEED))).toBe(true);
    expect(sameCells(generateTerrain(5), generateTerrain(6))).toBe(false);
  });

  it('AC230: the start spot is the 0.7.0 start spot moved into the middle', () => {
    expect(START_SPOT.x).toBe(64.5);
    expect(START_SPOT.z).toBe(64.5);
    expect(START_SPOT.y).toBe(LEGACY_START_SPOT.y + MOVE.y);
    expect(START_SPOT).toEqual({ x: LEGACY_START_SPOT.x + 32, y: LEGACY_START_SPOT.y + 10, z: LEGACY_START_SPOT.z + 32 });
    const w = startWorld(WORLD_SEED);
    expect(w[cellIndex(64, START_SPOT.y - 1, 64)]).not.toBe(0);
    expect(w[cellIndex(64, START_SPOT.y, 64)]).toBe(0);
  });

  it('AC178: VILLAGE_SITES are the legacy sites moved by 32, 10, 32', () => {
    expect(VILLAGE_SITES).toEqual(LEGACY_VILLAGE_SITES.map(moveSite));
    expect(VILLAGE_SITES.map((s) => s.x0)).toEqual(LEGACY_VILLAGE_SITES.map((s) => s.x0 + 32));
    expect(VILLAGE_SITES.map((s) => s.padY)).toEqual(LEGACY_VILLAGE_SITES.map((s) => s.padY + 10));
  });

  it('AC178: each moved site is flat grass at padY, no tree inside, houses on top, in the new world', () => {
    const v3 = generateTerrain();
    for (const site of VILLAGE_SITES) {
      const r = siteRegion(site);
      const house = new Set(houseCells(site).map((c) => cellIndex(c.x, c.y, c.z)));
      for (let z = r.z0; z <= r.z1; z++)
        for (let x = r.x0; x <= r.x1; x++) {
          expect(v3[cellIndex(x, site.padY, z)]).toBe(GRAS);
          for (let y = site.padY + 1; y < WORLD_HEIGHT; y++) {
            const i = cellIndex(x, y, z);
            const b = v3[i];
            expect(b === BLADEREN).toBe(false);
            if (b === BOOMSTAM) expect(house.has(i)).toBe(true);
            if (!house.has(i)) expect(b).toBe(0);
          }
        }
      for (const c of houseCells(site)) expect(v3[cellIndex(c.x, c.y, c.z)]).toBe(c.id);
    }
  });
});
