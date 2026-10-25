import { describe, expect, it } from 'vitest';
import { RARE_BLOCKS, isPlaceable, isSolid } from './blocks';
import { START_SPOT, WORLD_SIZE } from './terrain';
import { HOUSE_TEMPLATES, SITE_MARGIN, VILLAGE_SITES, houseCells, inRegion, siteHasHouses, siteRegion } from './village-layout';

// The obsidiaan gate floor in front of the start spot (terrain.ts, CR2), plus its flanking stones.
const MID = Math.floor(WORLD_SIZE / 2);
const GATE = Array.from({ length: 6 }, (_, k) => ({ x: MID - 2 + k + 0.5, z: MID + 3 + 0.5 }));

describe('village layout (v11)', () => {
  it('AC178: 3 fixed sites, each with 2 or 3 houses, villager homes 3, 3 and 2', () => {
    expect(VILLAGE_SITES).toHaveLength(3);
    for (const s of VILLAGE_SITES) expect([2, 3]).toContain(s.houses.length);
    expect(VILLAGE_SITES.map((s) => s.homes.length)).toEqual([3, 3, 2]);
    expect(new Set(VILLAGE_SITES.map((s) => s.id)).size).toBe(3);
  });

  it('AC178: houses use only existing building blocks, never a rare block', () => {
    for (const t of Object.values(HOUSE_TEMPLATES)) {
      for (const c of t.cells) {
        expect(c.id).toBeLessThan(34);
        expect(RARE_BLOCKS).not.toContain(c.id);
        expect(isPlaceable(c.id)).toBe(true);
        expect(isSolid(c.id)).toBe(true);
      }
    }
  });

  it('AC178: no house block within 10 blocks of the start spot or the obsidiaan gate', () => {
    for (const s of VILLAGE_SITES) {
      for (const c of houseCells(s)) {
        const cx = c.x + 0.5;
        const cz = c.z + 0.5;
        expect(Math.hypot(cx - START_SPOT.x, cz - START_SPOT.z)).toBeGreaterThan(10);
        for (const g of GATE) expect(Math.hypot(cx - g.x, cz - g.z)).toBeGreaterThan(10);
      }
    }
  });

  it('AC178: houses lie inside their rectangle, sites stay inside the world and never overlap', () => {
    const regions = VILLAGE_SITES.map(siteRegion);
    for (const [k, s] of VILLAGE_SITES.entries()) {
      const r = regions[k]!;
      expect(r.x0).toBe(s.x0 - SITE_MARGIN);
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.z0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThan(WORLD_SIZE);
      expect(r.z1).toBeLessThan(WORLD_SIZE);
      for (const c of houseCells(s)) {
        expect(c.x >= s.x0 && c.x <= s.x1 && c.z >= s.z0 && c.z <= s.z1).toBe(true);
      }
      const cells = houseCells(s).map((c) => `${c.x},${c.y},${c.z}`);
      expect(new Set(cells).size).toBe(cells.length);
      for (const [j, other] of regions.entries()) {
        if (j === k) continue;
        const overlap = !(r.x1 < other.x0 || other.x1 < r.x0 || r.z1 < other.z0 || other.z1 < r.z0);
        expect(overlap).toBe(false);
      }
    }
  });

  it('AC178: every villager home is on the pad in its own site and not inside a house', () => {
    for (const s of VILLAGE_SITES) {
      const house = new Set(houseCells(s).map((c) => `${c.x},${c.y},${c.z}`));
      for (const h of s.homes) {
        expect(inRegion({ x0: s.x0, z0: s.z0, x1: s.x1, z1: s.z1 }, Math.floor(h.x), Math.floor(h.z))).toBe(true);
        expect(h.y).toBe(s.padY + 1);
        expect(house.has(`${Math.floor(h.x)},${h.y},${Math.floor(h.z)}`)).toBe(false);
        expect(house.has(`${Math.floor(h.x)},${h.y + 1},${Math.floor(h.z)}`)).toBe(false);
      }
    }
  });

  it('AC179: siteHasHouses is true with the houses and false without', () => {
    const s = VILLAGE_SITES[0]!;
    const ids = new Map(houseCells(s).map((c) => [`${c.x},${c.y},${c.z}`, c.id]));
    expect(siteHasHouses((x, y, z) => ids.get(`${x},${y},${z}`) ?? 0, s)).toBe(true);
    expect(siteHasHouses(() => 0, s)).toBe(false);
  });
});
