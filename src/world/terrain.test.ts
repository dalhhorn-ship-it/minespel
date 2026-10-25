import { describe, expect, it } from 'vitest';
import { BLADEREN, BOOMSTAM, GRAS } from './blocks';
import { CELL_COUNT, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain, stampVillages } from './terrain';
import { VILLAGE_SITES, houseCells, inRegion, siteRegion } from './village-layout';

/** FNV-1a over every cell. */
function hash(blocks: Uint8Array): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < blocks.length; i++) {
    h ^= blocks[i] ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}

function inAnySite(x: number, z: number): boolean {
  return VILLAGE_SITES.some((s) => inRegion(siteRegion(s), x, z));
}

describe('terrain versions (v11)', () => {
  it('AC179: version 1 is the 0.4.0 world cell for cell (snapshot hash taken before v11)', () => {
    const v1 = generateTerrain(WORLD_SEED, 1);
    expect(v1.length).toBe(CELL_COUNT);
    // Taken from the 0.4.0 generator. If this fails, an rng call or a rule in the version 1 path moved:
    // every old save would silently change. Never update this number.
    expect(hash(v1)).toBe('da5e5cb8');
  });

  it('AC179: the version 1 random stream is untouched (same block counts as 0.4.0)', () => {
    const counts: Record<number, number> = {};
    for (const b of generateTerrain(WORLD_SEED, 1)) counts[b] = (counts[b] ?? 0) + 1;
    expect(counts).toEqual({ 0: 214328, 1: 3861, 2: 7734, 3: 27956, 4: 1820, 5: 687, 6: 124, 8: 1533, 17: 4096, 18: 4, 27: 1 });
  });

  it('AC178: a new world is version 2, the same every time', () => {
    expect(generateTerrain()).toEqual(generateTerrain(WORLD_SEED, 2));
    expect(hash(generateTerrain())).toBe(hash(generateTerrain(WORLD_SEED, 2)));
    expect(generateTerrain()).not.toEqual(generateTerrain(WORLD_SEED, 1));
  });

  it('AC178: version 1 and version 2 are the same in every cell outside the three village sites', () => {
    const v1 = generateTerrain(WORLD_SEED, 1);
    const v2 = generateTerrain(WORLD_SEED, 2);
    let outside = 0;
    let inside = 0;
    for (let y = 0; y < WORLD_HEIGHT; y++)
      for (let z = 0; z < WORLD_SIZE; z++)
        for (let x = 0; x < WORLD_SIZE; x++) {
          const i = cellIndex(x, y, z);
          if (v1[i] === v2[i]) continue;
          if (inAnySite(x, z)) inside++;
          else outside++;
        }
    expect(outside).toBe(0);
    expect(inside).toBeGreaterThan(0);
  });

  it('AC178: version 2 is version 1 plus the stamp, with no random numbers in the stamp', () => {
    const stamped = generateTerrain(WORLD_SEED, 1);
    stampVillages(stamped, VILLAGE_SITES);
    expect(stamped).toEqual(generateTerrain(WORLD_SEED, 2));
    // Stamping twice gives the same world.
    stampVillages(stamped, VILLAGE_SITES);
    expect(stamped).toEqual(generateTerrain(WORLD_SEED, 2));
  });

  it('AC178: each site is flat grass at padY, no tree inside, houses on top', () => {
    const v2 = generateTerrain();
    for (const site of VILLAGE_SITES) {
      const r = siteRegion(site);
      const house = new Set(houseCells(site).map((c) => cellIndex(c.x, c.y, c.z)));
      for (let z = r.z0; z <= r.z1; z++)
        for (let x = r.x0; x <= r.x1; x++) {
          expect(v2[cellIndex(x, site.padY, z)]).toBe(GRAS);
          for (let y = site.padY + 1; y < WORLD_HEIGHT; y++) {
            const i = cellIndex(x, y, z);
            const b = v2[i];
            expect(b === BLADEREN).toBe(false);
            if (b === BOOMSTAM) expect(house.has(i)).toBe(true);
            if (!house.has(i)) expect(b).toBe(0);
          }
        }
      for (const c of houseCells(site)) expect(v2[cellIndex(c.x, c.y, c.z)]).toBe(c.id);
    }
  });
});
