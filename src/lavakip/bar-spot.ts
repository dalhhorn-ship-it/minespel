// Where the Lavakip-bar can stand (v23, decision 144). The footprint is 2 columns along x and 3 along z from `spot`
// (the air cell above the ground at the min corner). The rules: a free spot is
// 2 x 3 columns at one height with 3 air cells above each, never on water or lava or in a village site; the home
// spot is 5 to 12 from the start spot; the spot in front of the kid is 2 to 5 along his view.
import type { Rng } from '../core/rng';
import type { Point } from '../dinos/dino-ai';
import { WORLD_HEIGHT } from '../world/terrain';
import { AIR, LAVA, VUUR, WATER, isSolid } from '../world/blocks';
import { inRegion, siteRegion, VILLAGE_SITES } from '../world/village-layout';
import type { World } from '../world/world';
import type { LavakipSpot } from './lavakip-types';

/** The truck covers this many columns along x and z. */
export const BAR_FOOTPRINT = { x: 2, z: 3 } as const;

/** The eye and view of the kid: where he is and which way he looks. */
export interface ViewPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

const BAD_GROUND = new Set<number>([WATER, LAVA, VUUR]);
const ROOM_ABOVE = 3;

const inVillage = (x: number, z: number): boolean => {
  for (const site of VILLAGE_SITES) if (inRegion(siteRegion(site), x, z)) return true;
  return false;
};

/** True when the truck can stand with its min corner at `spot`: 2 x 3 columns on one height, 3 air above each. */
export function isFreeSpot(world: World, spot: LavakipSpot): boolean {
  const { x, y, z } = spot;
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z) || y < 1) return false;
  for (let dx = 0; dx < BAR_FOOTPRINT.x; dx++) {
    for (let dz = 0; dz < BAR_FOOTPRINT.z; dz++) {
      const cx = x + dx;
      const cz = z + dz;
      if (!world.inBounds(cx, y, cz) || !world.inBounds(cx, y + ROOM_ABOVE - 1, cz) || inVillage(cx, cz)) return false;
      const ground = world.get(cx, y - 1, cz);
      if (!isSolid(ground) || BAD_GROUND.has(ground)) return false;
      for (let a = 0; a < ROOM_ABOVE; a++) if (world.get(cx, y + a, cz) !== AIR) return false;
    }
  }
  return true;
}

/**
 * The air cell above the topmost solid cell of a column, scanning from `from` down to `to`, or -1. With `needAir` the
 * first cell must be air (a wall or a roof at that height gives -1), so a tunnel never puts the bar on its roof.
 */
function airAboveGround(world: World, x: number, z: number, from: number, to: number, needAir: boolean): number {
  const start = Math.min(from, WORLD_HEIGHT - 2);
  if (needAir && isSolid(world.get(x, start, z))) return -1;
  for (let y = start; y >= Math.max(to, 0); y--) {
    if (isSolid(world.get(x, y, z))) return y + 1;
  }
  return -1;
}

const dist = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
/** Distance from a point to the footprint: the min corner and the middle both count. */
const distances = (spot: LavakipSpot, px: number, pz: number): [number, number] => [
  dist(spot.x, spot.z, px, pz),
  dist(spot.x + BAR_FOOTPRINT.x / 2, spot.z + BAR_FOOTPRINT.z / 2, px, pz),
];

/** The free spot for the min corner (x, z), found by the ground of its first column, or null. */
function spotAt(world: World, x: number, z: number, from: number, to: number, needAir = false): LavakipSpot | null {
  const y = airAboveGround(world, x, z, from, to, needAir);
  if (y < 0) return null;
  const spot = { x, y, z };
  return isFreeSpot(world, spot) ? spot : null;
}

/**
 * The home spot: 5 to 12 from `start`, or the nearest one when none fits, or null. Seeded: the same rng gives the same
 * spot. The ring is tried in a random order, so several seeds give several places.
 */
export function findHomeSpot(world: World, start: Point, rng: Rng): LavakipSpot | null {
  const top = WORLD_HEIGHT - 2;
  const tries = 160;
  for (let i = 0; i < tries; i++) {
    const angle = rng.next() * Math.PI * 2;
    const r = 5 + rng.next() * 7;
    const x = Math.round(start.x + Math.cos(angle) * r - BAR_FOOTPRINT.x / 2);
    const z = Math.round(start.z + Math.sin(angle) * r - BAR_FOOTPRINT.z / 2);
    const spot = spotAt(world, x, z, top, 0);
    if (!spot) continue;
    const [a, b] = distances(spot, start.x, start.z);
    if (a >= 5 && a <= 12 && b >= 5 && b <= 12) return spot;
  }
  // None fits: the nearest free spot, scanning outwards.
  let best: LavakipSpot | null = null;
  let bestD = Infinity;
  const reach = 60;
  for (let dz = -reach; dz <= reach; dz++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const x = Math.floor(start.x) + dx;
      const z = Math.floor(start.z) + dz;
      const d = dist(x + BAR_FOOTPRINT.x / 2, z + BAR_FOOTPRINT.z / 2, start.x, start.z);
      if (d >= bestD) continue;
      const spot = spotAt(world, x, z, top, 0);
      if (!spot) continue;
      best = spot;
      bestD = d;
    }
  }
  return best;
}

const OFFSETS = [0, (20 * Math.PI) / 180, (-20 * Math.PI) / 180] as const;
const REACHES = [3.5, 4, 3, 4.5, 2.5, 5, 2] as const;

/** A free spot 2 to 5 blocks in front of the kid (yaw offsets 0, 20 and -20 degrees), or null. */
export function findSpotInFront(world: World, pose: ViewPose): LavakipSpot | null {
  const hint = Math.floor(pose.y);
  for (const off of OFFSETS) {
    const sx = Math.sin(pose.yaw + off);
    const sz = Math.cos(pose.yaw + off);
    for (const reach of REACHES) {
      const cx = pose.x + sx * reach;
      const cz = pose.z + sz * reach;
      const x = Math.round(cx - BAR_FOOTPRINT.x / 2);
      const z = Math.round(cz - BAR_FOOTPRINT.z / 2);
      const spot = spotAt(world, x, z, hint + 1, hint - 6, true);
      if (!spot) continue;
      const [a, b] = distances(spot, pose.x, pose.z);
      if (a >= 2 && a <= 5 && b >= 2 && b <= 5) return spot;
    }
  }
  return null;
}
