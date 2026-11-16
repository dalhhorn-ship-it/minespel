// Where the mole comes up (v16, AC246). One pure function, unit tested on seeded worlds.
// "Not within N along x and z" reads as max(|dx|, |dz|) > N, measured from the column centre.
import { isCalled, type DinoState, type Point } from '../dinos/dino-ai';
import type { Rng } from '../core/rng';
import { shuffle } from '../core/rng';
import { AIR, BLADEREN, BOOMSTAM, LAVA, WATER } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import type { World } from '../world/world';

/** A spot must be within this many blocks of a target animal along x and z. */
export const SPAWN_NEAR_ANIMAL = 16;
/** Not within this many blocks of the kid. */
export const SPAWN_KID_MIN = 5;
/** With no target animal: 6 to 10 blocks from the kid along the larger axis. */
export const SPAWN_RING_MIN = 6;
export const SPAWN_RING_MAX = 10;
/** Every cell within this many blocks of the spot along each axis must be unchanged. */
export const SPAWN_CLEAN = 3;

/** A dino or chicken on Vrij rondlopen, not on a Dinofluit call and not running from a tease (AC246). */
export function isMoleTarget(a: DinoState): boolean {
  return a.mode === 'stay' && !isCalled(a) && !a.flee;
}

function cleanAround(world: World, x: number, y: number, z: number): boolean {
  for (let dx = -SPAWN_CLEAN; dx <= SPAWN_CLEAN; dx++) {
    for (let dy = -SPAWN_CLEAN; dy <= SPAWN_CLEAN; dy++) {
      for (let dz = -SPAWN_CLEAN; dz <= SPAWN_CLEAN; dz++) {
        if (!world.isUnchanged(x + dx, y + dy, z + dz)) return false;
      }
    }
  }
  return true;
}

/**
 * The feet centre where the mole comes up, or null when no spot fits. Candidates are the columns within 16 blocks of
 * a target animal (with none: the ring 6 to 10 blocks from the kid); a spot sits on the highest solid block with sky
 * above it, never on water, lava, leaves or a trunk, more than 5 from the kid and more than 1 from the dig column.
 * One fitting column is picked with the seeded `rng`.
 */
export function findMoleSpawn(
  world: World,
  kid: Point,
  digColumn: { x: number; z: number },
  animals: readonly DinoState[],
  rng: Rng,
): Point | null {
  const targets = animals.filter(isMoleTarget);
  const seen = new Set<number>();
  const cols: Array<{ x: number; z: number }> = [];
  const add = (x: number, z: number): void => {
    if (x < 0 || z < 0 || x >= WORLD_SIZE || z >= WORLD_SIZE) return;
    const key = x * WORLD_SIZE + z;
    if (seen.has(key)) return;
    seen.add(key);
    const cx = x + 0.5;
    const cz = z + 0.5;
    const away = Math.max(Math.abs(cx - kid.x), Math.abs(cz - kid.z));
    if (away <= SPAWN_KID_MIN) return;
    if (Math.max(Math.abs(x - digColumn.x), Math.abs(z - digColumn.z)) <= 1) return;
    if (targets.length === 0 && (away < SPAWN_RING_MIN || away > SPAWN_RING_MAX)) return;
    cols.push({ x, z });
  };
  if (targets.length > 0) {
    for (const a of targets) {
      const ax = Math.floor(a.x);
      const az = Math.floor(a.z);
      for (let x = ax - SPAWN_NEAR_ANIMAL; x <= ax + SPAWN_NEAR_ANIMAL; x++) {
        for (let z = az - SPAWN_NEAR_ANIMAL; z <= az + SPAWN_NEAR_ANIMAL; z++) add(x, z);
      }
    }
  } else {
    const kx = Math.floor(kid.x);
    const kz = Math.floor(kid.z);
    for (let x = kx - SPAWN_RING_MAX - 1; x <= kx + SPAWN_RING_MAX + 1; x++) {
      for (let z = kz - SPAWN_RING_MAX - 1; z <= kz + SPAWN_RING_MAX + 1; z++) add(x, z);
    }
  }
  // Random order, then the first column that fits: the same as a uniform pick among the fitting ones.
  for (const c of shuffle(cols, rng)) {
    let top = WORLD_HEIGHT - 1;
    while (top > 0 && world.get(c.x, top, c.z) === AIR) top--;
    const ground = world.get(c.x, top, c.z);
    if (ground === AIR || ground === WATER || ground === LAVA || ground === BLADEREN || ground === BOOMSTAM) continue;
    const y = top + 1;
    if (y >= WORLD_HEIGHT - 2) continue;
    if (!cleanAround(world, c.x, y, c.z)) continue;
    return { x: c.x + 0.5, y, z: c.z + 0.5 };
  }
  return null;
}
