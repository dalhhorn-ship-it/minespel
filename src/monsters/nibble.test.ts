import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { AIR, LAVA, OERSTEEN, PLANKEN, STEEN, WATER } from '../world/blocks';
import type { Box } from '../world/build';
import { START_SPOT } from '../world/terrain';
import { inRegion, siteRegion, VILLAGE_SITES } from '../world/village-layout';
import { World } from '../world/world';
import { createKlodder, stepKlodder } from './klodder';
import type { MonsterContext } from './monster-types';
import { canNibble, MAX_NIBBLES, NIBBLE_GAP_MS } from './nibble';

function ground(world: World, x: number, z: number): number {
  let y = 60;
  while (y > 1 && world.get(x, y - 1, z) === AIR) y--;
  return y;
}

function makeCtx(world: World, kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }, occupied: (b: Box) => boolean = () => false) {
  const said: string[] = [];
  const played: string[] = [];
  const touched: string[] = [];
  const rng = createRng(7);
  const ctx = (dt: number): MonsterContext => ({
    world, rng, dt, kid,
    kidBox: [kid.x - 0.3, kid.y, kid.z - 0.3, kid.x + 0.3, kid.y + 1.8, kid.z + 0.3],
    occupied, knights: () => [], touch: (x, z) => touched.push(`${x},${z}`),
    say: (t) => said.push(t), play: (n) => played.push(n), markHintShown: () => {}, hintShown: () => false,
  });
  return { ctx, said, played, touched };
}

describe('Klodder nibbles (v18, AC215)', () => {
  it('AC215: 3 minutes on a seeded world with a kid hut and a village: every nibble follows every rule', () => {
    const world = new World();
    const site = VILLAGE_SITES[0]!;
    const region = siteRegion(site);
    // Start next to the village so it is in reach, and build a kid hut 4 blocks away from him.
    const sx = region.x0 - 3;
    const sz = Math.floor((region.z0 + region.z1) / 2);
    const startY = ground(world, sx, sz);
    const hut: { x: number; y: number; z: number }[] = [];
    const hx = sx - 5;
    const hz = sz;
    const hy = ground(world, hx, hz);
    for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) for (let dy = 0; dy < 3; dy++) {
      if (dx === 1 && dz === 1 && dy < 2) continue;
      world.set(hx + dx, hy + dy, hz + dz, PLANKEN);
      hut.push({ x: hx + dx, y: hy + dy, z: hz + dz });
    }
    const kid = { x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z };
    const { ctx } = makeCtx(world, kid);
    const k = createKlodder({ x: sx + 0.5, y: startY, z: sz + 0.5 });
    const seen = new Set<string>();
    const times: number[] = [];
    let t = 0;
    let total = 0;
    for (let i = 0; i < 1800; i++) {
      t += 100;
      stepKlodder(k, ctx(0.1));
      for (const c of world.hiddenCells()) {
        const key = `${c.x},${c.y},${c.z}`;
        if (seen.has(key)) continue;
        seen.add(key);
        times.push(t);
        total++;
        expect(world.isUnchanged(c.x, c.y, c.z)).toBe(true);
        expect(inRegion(region, c.x, c.z)).toBe(false);
        for (const s of VILLAGE_SITES) expect(inRegion(siteRegion(s), c.x, c.z)).toBe(false);
        for (const h of hut) expect(Math.max(Math.abs(h.x - c.x), Math.abs(h.y - c.y), Math.abs(h.z - c.z))).toBeGreaterThan(3);
      }
    }
    expect(total).toBeGreaterThan(3);
    expect(total).toBeLessThanOrEqual(MAX_NIBBLES);
    for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThanOrEqual(NIBBLE_GAP_MS - 100);
    expect(world.diff().length).toBe(hut.length);
  });

  it('AC215: after 20 nibbles he nibbles no more', () => {
    const world = new World();
    const { ctx } = makeCtx(world);
    const y = ground(world, 40, 20);
    const k = createKlodder({ x: 40.5, y, z: 20.5 });
    for (let i = 0; i < 2900; i++) stepKlodder(k, ctx(0.1));
    expect(k.nibbled).toBe(MAX_NIBBLES);
    expect(world.hiddenCount()).toBe(MAX_NIBBLES);
    for (let i = 0; i < 40; i++) stepKlodder(k, ctx(0.1));
    expect(k.nibbled).toBe(MAX_NIBBLES);
    expect(world.hiddenCount()).toBe(MAX_NIBBLES);
  });

  it('AC215: the cell rules one by one', () => {
    const world = new World();
    const x = 40;
    const z = 20;
    const y = ground(world, x, z) - 1;
    const { ctx } = makeCtx(world);
    expect(canNibble(ctx(0.1), x, y, z)).toBe(true);
    // Never air, oersteen, water or lava.
    for (const id of [OERSTEEN, WATER, LAVA]) {
      const w = new World();
      w.set(x, y, z, id);
      expect(canNibble(makeCtx(w).ctx(0.1), x, y, z)).toBe(false);
    }
    expect(canNibble(ctx(0.1), x, y + 1, z)).toBe(false);
    // No air above.
    const w2 = new World();
    w2.set(x, y + 1, z, STEEN);
    expect(canNibble(makeCtx(w2).ctx(0.1), x, y, z)).toBe(false);
    // A kid change 3 blocks away blocks it, 4 blocks away does not.
    const w3 = new World();
    w3.set(x + 3, y + 3, z, STEEN);
    expect(canNibble(makeCtx(w3).ctx(0.1), x, y, z)).toBe(false);
    const w4 = new World();
    w4.set(x + 4, y, z, STEEN);
    expect(canNibble(makeCtx(w4).ctx(0.1), x, y, z)).toBe(true);
    // The kid or an animal within 1 block.
    expect(canNibble(makeCtx(world, { x: x + 1.5, y: y + 1, z: z + 0.5 }).ctx(0.1), x, y, z)).toBe(false);
    expect(canNibble(makeCtx(world, undefined, () => true).ctx(0.1), x, y, z)).toBe(false);
    // A village cell.
    const s = VILLAGE_SITES[0]!;
    const vy = ground(world, s.x0, s.z0) - 1;
    expect(canNibble(ctx(0.1), s.x0, vy, s.z0)).toBe(false);
  });

  it('AC214: he walks at 1.5 blocks per second at most', () => {
    const world = new World();
    const { ctx } = makeCtx(world);
    const y = ground(world, 40, 20);
    const k = createKlodder({ x: 40.5, y, z: 20.5 });
    stepKlodder(k, ctx(0.1));
    let worst = 0;
    for (let i = 0; i < 100; i++) {
      const x0 = k.x;
      const z0 = k.z;
      stepKlodder(k, ctx(0.1));
      worst = Math.max(worst, Math.hypot(k.x - x0, k.z - z0) / 0.1);
    }
    expect(worst).toBeLessThanOrEqual(1.5 + 1e-6);
  });

  it('AC214: he says Hihihi! once; AC213 keeps away: the kid within 1 block makes him hop 3 to 5 blocks off', () => {
    const world = new World();
    const kid = { x: 40.5, y: ground(world, 40, 20), z: 20.5 };
    const h = makeCtx(world, kid);
    const k = createKlodder({ x: 41.2, y: kid.y, z: 20.5 });
    stepKlodder(k, h.ctx(0.1));
    stepKlodder(k, h.ctx(0.1));
    expect(h.said.filter((s) => s === 'Hihihi!')).toHaveLength(1);
    const d = Math.hypot(k.x - kid.x, k.z - kid.z);
    expect(d).toBeGreaterThanOrEqual(2.9);
    expect(d).toBeLessThanOrEqual(5.1);
  });

  it('AC219: a Klodder poked stands still, and tires at 5 minutes with "Ik ben moe" and every block back', () => {
    const world = new World();
    const { ctx, said } = makeCtx(world);
    const y = ground(world, 40, 20);
    const k = createKlodder({ x: 40.5, y, z: 20.5 });
    k.pokers = 1;
    stepKlodder(k, ctx(0.1));
    const x0 = k.x;
    for (let i = 0; i < 100; i++) stepKlodder(k, ctx(0.1));
    expect(k.x).toBe(x0);
    expect(k.nibbled).toBe(0);
    k.pokers = 0;
    let t = 10_100;
    let left: string | null = null;
    while (left === null && t < 330_000) {
      t += 100;
      left = stepKlodder(k, ctx(0.1));
      if (!k.tired) expect(left).toBeNull();
    }
    expect(left).toBe('left');
    expect(said).toContain('Ik ben moe');
    expect(world.hiddenCount()).toBe(0);
    expect(t).toBeGreaterThanOrEqual(300_000);
    expect(t).toBeLessThan(304_000);
  });

  it('AC314: a cell the context keeps out (the Lavakip-bar footprint and one block around it) is never nibbled', () => {
    const world = new World();
    const x = 40;
    const z = 20;
    const y = ground(world, x, z) - 1;
    const { ctx } = makeCtx(world);
    expect(canNibble(ctx(0.1), x, y, z)).toBe(true);
    const keep = (kx: number, _ky: number, kz: number) => kx === x && kz === z;
    expect(canNibble({ ...ctx(0.1), keepOut: keep }, x, y, z)).toBe(false);
    expect(canNibble({ ...ctx(0.1), keepOut: keep }, x + 1, y, z)).toBe(true);
  });
});
