import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { AIR, GRAS, LAVA, STEEN, WATER } from '../world/blocks';
import { START_SPOT, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { VILLAGE_SITES, inRegion, siteRegion } from '../world/village-layout';
import { World } from '../world/world';
import { BAR_FOOTPRINT, findHomeSpot, findSpotInFront, isFreeSpot } from './bar-spot';

/** A flat test world: grass at y 9, air above, in the middle of the real size. */
function flat(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) for (let z = 0; z < WORLD_SIZE; z++) for (let y = 1; y < WORLD_HEIGHT; y++) w.set(x, y, z, y < 10 ? STEEN : y === 10 ? GRAS : AIR);
  return w;
}
const pose = (x: number, z: number, yaw = 0) => ({ x, y: 11 + 1.6, z, yaw, pitch: 0 });

describe('free spot (AC311, AC312)', () => {
  it('AC311: 2 x 3 columns at one height with 3 air cells above is free', () => {
    const w = flat();
    expect(BAR_FOOTPRINT).toEqual({ x: 2, z: 3 });
    expect(isFreeSpot(w, { x: 20, y: 11, z: 20 })).toBe(true);
  });
  it('AC311: one raised column, a block in the 3 cells above, water or lava breaks it', () => {
    const w = flat();
    w.set(21, 11, 22, STEEN);
    expect(isFreeSpot(w, { x: 20, y: 11, z: 20 })).toBe(false);
    w.set(21, 11, 22, AIR);
    w.set(20, 13, 21, STEEN);
    expect(isFreeSpot(w, { x: 20, y: 11, z: 20 })).toBe(false);
    w.set(20, 13, 21, AIR);
    w.set(20, 10, 20, WATER);
    expect(isFreeSpot(w, { x: 20, y: 11, z: 20 })).toBe(false);
    w.set(20, 10, 20, LAVA);
    expect(isFreeSpot(w, { x: 20, y: 11, z: 20 })).toBe(false);
    expect(isFreeSpot(w, { x: -1, y: 11, z: 20 })).toBe(false);
    expect(isFreeSpot(w, { x: WORLD_SIZE - 1, y: 11, z: 20 })).toBe(false);
  });
  it('AC311: never in a village site', () => {
    const w = flat();
    const r = siteRegion(VILLAGE_SITES[0]!);
    expect(inRegion(r, r.x0, r.z0)).toBe(true);
    expect(isFreeSpot(w, { x: r.x0, y: 11, z: r.z0 })).toBe(false);
  });
});

describe('home spot (AC311, AC318)', () => {
  it('AC311: 5 to 12 from the start spot for 20 seeds, and the same seed gives the same spot', () => {
    const w = new World();
    for (let seed = 1; seed <= 20; seed++) {
      const s = findHomeSpot(w, START_SPOT, createRng(seed));
      expect(s).not.toBeNull();
      expect(isFreeSpot(w, s!)).toBe(true);
      const corner = Math.hypot(s!.x - START_SPOT.x, s!.z - START_SPOT.z);
      const mid = Math.hypot(s!.x + 1 - START_SPOT.x, s!.z + 1.5 - START_SPOT.z);
      for (const d of [corner, mid]) {
        expect(d).toBeGreaterThanOrEqual(5);
        expect(d).toBeLessThanOrEqual(12);
      }
      expect(findHomeSpot(w, START_SPOT, createRng(seed))).toEqual(s);
    }
  });
  it('AC318: with no room in 5 to 12 it takes the nearest free spot outside', () => {
    const w = flat();
    // Make a pond 15 blocks wide around the start so no spot fits near.
    for (let x = 0; x < WORLD_SIZE; x++) for (let z = 0; z < WORLD_SIZE; z++) if (Math.hypot(x - 100, z - 100) <= 15) w.set(x, 10, z, WATER);
    const s = findHomeSpot(w, { x: 100, y: 11, z: 100 }, createRng(3));
    expect(s).not.toBeNull();
    expect(Math.hypot(s!.x + 1 - 100, s!.z + 1.5 - 100)).toBeGreaterThan(12);
    expect(Math.hypot(s!.x + 1 - 100, s!.z + 1.5 - 100)).toBeLessThan(20);
  });
});

describe('spot in front of the kid (AC312)', () => {
  it('AC312: 2 to 5 blocks in front on flat ground', () => {
    const w = flat();
    for (const yaw of [0, 1, 2.5, -1.2]) {
      const s = findSpotInFront(w, pose(100, 100, yaw));
      expect(s).not.toBeNull();
      expect(isFreeSpot(w, s!)).toBe(true);
      const d = Math.hypot(s!.x - 100, s!.z - 100);
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(5);
    }
  });
  it('AC312: a tunnel 1 block wide gives no spot in front', () => {
    const w = flat();
    // A 1 wide tunnel along z at x 100, 2 high, under a stone roof; the kid stands inside.
    for (let z = 90; z <= 120; z++) for (let x = 95; x <= 105; x++) for (let y = 11; y <= 13; y++) w.set(x, y, z, STEEN);
    for (let z = 90; z <= 120; z++) for (let y = 11; y <= 12; y++) w.set(100, y, z, AIR);
    expect(findSpotInFront(w, pose(100.5, 100.5, 0))).toBeNull();
  });
});
