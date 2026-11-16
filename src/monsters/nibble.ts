// Which cells Klodder may nibble (v18 V18b, decision 132, AC215). Pure rules on the hidden cell overlay.
import { AIR, LAVA, OERSTEEN, VUUR, WATER, isSolid } from '../world/blocks';
import type { Box } from '../world/build';
import { WORLD_HEIGHT } from '../world/terrain';
import { inRegion, siteRegion, VILLAGE_SITES } from '../world/village-layout';
import type { World } from '../world/world';
import type { KlodderState, MonsterContext } from './monster-types';

/** At most this many cells at a time (decision 132). */
export const MAX_NIBBLES = 20;
/** One nibble per 4 seconds of loop time. */
export const NIBBLE_GAP_MS = 4000;
/** A cell must have no kid changed cell within this many blocks along each axis. */
export const KID_FREE_RADIUS = 3;
/** How far from Klodder he looks for a cell, in blocks. */
export const NIBBLE_SEARCH = 9;
const TRIES = 40;

const EPS = 1e-3;
export function boxesOverlap(a: Box, b: Box): boolean {
  return a[0] < b[3] - EPS && a[3] > b[0] + EPS && a[1] < b[4] - EPS && a[4] > b[1] + EPS && a[2] < b[5] - EPS && a[5] > b[2] + EPS;
}

/** The box of one cell, grown by `by` blocks on every side. */
export function cellBox(x: number, y: number, z: number, by = 0): Box {
  return [x - by, y - by, z - by, x + 1 + by, y + 1 + by, z + 1 + by];
}

export function inAnyVillage(x: number, z: number): boolean {
  for (const site of VILLAGE_SITES) if (inRegion(siteRegion(site), x, z)) return true;
  return false;
}

/** True when the cell and every cell within 3 along each axis is as in the start world (343 lookups). */
export function farFromKidChanges(world: World, x: number, y: number, z: number): boolean {
  const r = KID_FREE_RADIUS;
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dy = -r; dy <= r; dy++) {
        if (!world.isUnchanged(x + dx, y + dy, z + dz)) return false;
      }
    }
  }
  return true;
}

/** Every rule of AC215 for one cell. `k` is checked so he never takes the ground from under his own feet. */
export function canNibble(ctx: MonsterContext, x: number, y: number, z: number, k?: Pick<KlodderState, 'x' | 'z'>): boolean {
  const { world } = ctx;
  if (!world.inBounds(x, y, z)) return false;
  const id = world.get(x, y, z);
  if (id === AIR || id === OERSTEEN || id === WATER || id === LAVA || id === VUUR || !isSolid(id)) return false;
  if (world.get(x, y + 1, z) !== AIR) return false;
  if (inAnyVillage(x, z)) return false;
  if (k && Math.abs(k.x - (x + 0.5)) < 0.95 && Math.abs(k.z - (z + 0.5)) < 0.95) return false;
  const near = cellBox(x, y, z, 1);
  if (boxesOverlap(near, ctx.kidBox)) return false;
  if (ctx.occupied(near)) return false;
  return farFromKidChanges(world, x, y, z);
}

/** A random eligible cell near Klodder, or null. The cell is the ground block with air above it. */
export function pickNibbleCell(k: KlodderState, ctx: MonsterContext): { x: number; y: number; z: number } | null {
  const { world, rng } = ctx;
  for (let i = 0; i < TRIES; i++) {
    const x = Math.floor(k.x + (rng.next() * 2 - 1) * NIBBLE_SEARCH);
    const z = Math.floor(k.z + (rng.next() * 2 - 1) * NIBBLE_SEARCH);
    if (!world.inBounds(x, 0, z)) continue;
    let y = Math.min(Math.floor(k.y) + 3, WORLD_HEIGHT - 2);
    const low = Math.max(1, Math.floor(k.y) - 6);
    while (y >= low && world.get(x, y, z) === AIR) y--;
    if (y < low) continue;
    if (canNibble(ctx, x, y, z, k)) return { x, y, z };
  }
  return null;
}
