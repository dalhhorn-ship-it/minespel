import { describe, expect, it } from 'vitest';
import { BLADEREN, BOOMSTAM, GRAS } from './blocks';
import {
  LEGACY_CELL_COUNT, LEGACY_HEIGHT, LEGACY_SEED, LEGACY_SIZE, LEGACY_START_SPOT, generateLegacyTerrain, legacyCellIndex,
  stampVillages,
} from './terrain-legacy';
import { START_SPOT, generateTerrain } from './terrain';
import { LEGACY_VILLAGE_SITES, VILLAGE_SITES, houseCells, inRegion, siteRegion } from './village-layout';

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
  return LEGACY_VILLAGE_SITES.some((s) => inRegion(siteRegion(s), x, z));
}

describe('legacy terrain (the 0.7.0 generator, V15a)', () => {
  it('has the legacy size 64 x 64 x 64', () => {
    expect([LEGACY_SIZE, LEGACY_HEIGHT, LEGACY_CELL_COUNT]).toEqual([64, 64, 262144]);
    expect(legacyCellIndex(1, 2, 3)).toBe((2 * 64 + 3) * 64 + 1);
  });

  it('AC179: version 1 is the 0.4.0 world cell for cell (snapshot hash taken before v11)', () => {
    const v1 = generateLegacyTerrain(LEGACY_SEED, 1);
    expect(v1.length).toBe(LEGACY_CELL_COUNT);
    // Never update this number: it is the same hash as in terrain.test.ts.
    expect(hash(v1)).toBe('da5e5cb8');
  });

  it('AC179: the version 1 random stream is untouched (same block counts as 0.4.0)', () => {
    const counts: Record<number, number> = {};
    for (const b of generateLegacyTerrain(LEGACY_SEED, 1)) counts[b] = (counts[b] ?? 0) + 1;
    expect(counts).toEqual({ 0: 214328, 1: 3861, 2: 7734, 3: 27956, 4: 1820, 5: 687, 6: 124, 8: 1533, 17: 4096, 18: 4, 27: 1 });
  });

  it('AC178: version 2 is the same every time and differs from version 1', () => {
    const a = generateLegacyTerrain(LEGACY_SEED, 2);
    expect(a).toEqual(generateLegacyTerrain(LEGACY_SEED, 2));
    expect(hash(a)).toBe(hash(generateLegacyTerrain(LEGACY_SEED, 2)));
    expect(a).not.toEqual(generateLegacyTerrain(LEGACY_SEED, 1));
  });

  it('hands out copies of the cached version 2 world', () => {
    const a = generateLegacyTerrain(LEGACY_SEED, 2);
    const before = hash(a);
    a.fill(9);
    expect(hash(generateLegacyTerrain(LEGACY_SEED, 2))).toBe(before);
  });

  it('terrain.ts still gives the same worlds and start spot (same values, still 64)', () => {
    expect(generateTerrain(LEGACY_SEED, 1)).toEqual(generateLegacyTerrain(LEGACY_SEED, 1));
    expect(generateTerrain()).toEqual(generateLegacyTerrain(LEGACY_SEED, 2));
    expect(START_SPOT).toEqual(LEGACY_START_SPOT);
    expect(VILLAGE_SITES).toBe(LEGACY_VILLAGE_SITES);
  });

  it('AC178: version 1 and version 2 are the same in every cell outside the three village sites', () => {
    const v1 = generateLegacyTerrain(LEGACY_SEED, 1);
    const v2 = generateLegacyTerrain(LEGACY_SEED, 2);
    let outside = 0;
    let inside = 0;
    for (let y = 0; y < LEGACY_HEIGHT; y++)
      for (let z = 0; z < LEGACY_SIZE; z++)
        for (let x = 0; x < LEGACY_SIZE; x++) {
          const i = legacyCellIndex(x, y, z);
          if (v1[i] === v2[i]) continue;
          if (inAnySite(x, z)) inside++;
          else outside++;
        }
    expect(outside).toBe(0);
    expect(inside).toBeGreaterThan(0);
  });

  it('AC178: version 2 is version 1 plus the stamp, and stamping twice changes nothing', () => {
    const stamped = generateLegacyTerrain(LEGACY_SEED, 1);
    stampVillages(stamped, LEGACY_VILLAGE_SITES);
    expect(stamped).toEqual(generateLegacyTerrain(LEGACY_SEED, 2));
    stampVillages(stamped, LEGACY_VILLAGE_SITES);
    expect(stamped).toEqual(generateLegacyTerrain(LEGACY_SEED, 2));
  });

  it('AC178: each site is flat grass at padY, no tree inside, houses on top', () => {
    const v2 = generateLegacyTerrain(LEGACY_SEED, 2);
    for (const site of LEGACY_VILLAGE_SITES) {
      const r = siteRegion(site);
      const house = new Set(houseCells(site).map((c) => legacyCellIndex(c.x, c.y, c.z)));
      for (let z = r.z0; z <= r.z1; z++)
        for (let x = r.x0; x <= r.x1; x++) {
          expect(v2[legacyCellIndex(x, site.padY, z)]).toBe(GRAS);
          for (let y = site.padY + 1; y < LEGACY_HEIGHT; y++) {
            const i = legacyCellIndex(x, y, z);
            const b = v2[i];
            expect(b === BLADEREN).toBe(false);
            if (b === BOOMSTAM) expect(house.has(i)).toBe(true);
            if (!house.has(i)) expect(b).toBe(0);
          }
        }
      for (const c of houseCells(site)) expect(v2[legacyCellIndex(c.x, c.y, c.z)]).toBe(c.id);
    }
  });
});
