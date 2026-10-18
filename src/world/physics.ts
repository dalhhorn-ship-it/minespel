import { isSolid } from './blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from './terrain';
import type { World } from './world';

/** Player box: feet centre position, size in blocks. */
export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.6;

export const WALK_SPEED = 4.3;
export const GRAVITY = 28;
/** Peak jump height is JUMP_SPEED^2 / (2 * GRAVITY), about 1.25 blocks. */
export const JUMP_SPEED = 8.4;
export const MAX_FALL_SPEED = 40;
/** Blocks per second up or down while floating (Omhoog / Omlaag). */
export const FLY_SPEED = 4;

/** Physics runs in fixed small steps so the result does not depend on the frame rate. */
export const PHYSICS_STEP = 1 / 120;
/** A slow frame never counts for more than this, so nobody tunnels through a block. */
export const MAX_FRAME_TIME = 0.1;

const EPS = 1e-4;
/** Highest feet height: the head stays under the top of layer 64 (y index 63). */
export const MAX_PLAYER_Y = WORLD_HEIGHT - PLAYER_HEIGHT - EPS;

export interface PlayerState {
  /** Feet centre. */
  x: number;
  y: number;
  z: number;
  /** Vertical speed in blocks per second. */
  vy: number;
  onGround: boolean;
  /** Time left over from the last frame, less than one physics step. */
  leftover: number;
}

export interface PlayerInput {
  /** Wanted direction in world space. Length is clamped to 1. */
  moveX: number;
  moveZ: number;
  /** True while the jump button is held. A jump starts only on the ground. */
  jump: boolean;
  /** True while floating: gravity is off, jumping does nothing, and flyY moves the player up or down. */
  floating?: boolean;
  /** Vertical flight input while floating: +1 up, -1 down, 0 (or both held) hover. */
  flyY?: number;
}

export function createPlayer(x: number, y: number, z: number): PlayerState {
  return { x, y, z, vy: 0, onGround: false, leftover: 0 };
}

/** Solid for movement. The sides of the world are walls; below the floor is solid too. */
function blocked(world: World, x: number, y: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= WORLD_SIZE || z >= WORLD_SIZE || y < 0 || y >= WORLD_HEIGHT) return true;
  return isSolid(world.get(x, y, z));
}

/** Does the player box at (px, py, pz) overlap any solid cell? */
export function collides(world: World, px: number, py: number, pz: number): boolean {
  const h = PLAYER_WIDTH / 2;
  const x0 = Math.floor(px - h), x1 = Math.floor(px + h - EPS);
  const y0 = Math.floor(py), y1 = Math.floor(py + PLAYER_HEIGHT - EPS);
  const z0 = Math.floor(pz - h), z1 = Math.floor(pz + h - EPS);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        if (blocked(world, x, y, z)) return true;
      }
    }
  }
  return false;
}

/** Move along x or z, stopping flush against the first block or wall. */
function moveHorizontal(world: World, p: PlayerState, dx: number, dz: number): void {
  const h = PLAYER_WIDTH / 2;
  if (dx !== 0) {
    const nx = p.x + dx;
    if (!collides(world, nx, p.y, p.z)) {
      p.x = nx;
    } else {
      p.x = dx > 0 ? Math.floor(p.x + h + dx) - h - EPS : Math.ceil(p.x - h + dx) + h + EPS;
    }
  }
  if (dz !== 0) {
    const nz = p.z + dz;
    if (!collides(world, p.x, p.y, nz)) {
      p.z = nz;
    } else {
      p.z = dz > 0 ? Math.floor(p.z + h + dz) - h - EPS : Math.ceil(p.z - h + dz) + h + EPS;
    }
  }
}

/** Floating: no gravity. Moves up or down at FLY_SPEED, stopping flush under a ceiling or on a floor. */
function flyOnce(world: World, p: PlayerState, flyInput: number | undefined, dt: number): void {
  const fly = Number.isFinite(flyInput) ? Math.max(-1, Math.min(1, flyInput ?? 0)) : 0;
  p.vy = fly * FLY_SPEED;
  if (p.vy === 0) {
    p.onGround = collides(world, p.x, p.y - 0.01, p.z);
    return;
  }
  const ny = p.y + p.vy * dt;
  if (!collides(world, p.x, ny, p.z)) {
    p.y = ny;
    p.onGround = false;
  } else if (p.vy < 0) {
    p.y = Math.floor(ny) + 1;
    p.vy = 0;
    p.onGround = true;
  } else {
    p.y = Math.floor(ny + PLAYER_HEIGHT - EPS) - PLAYER_HEIGHT - EPS;
    p.vy = 0;
    p.onGround = false;
  }
}

function stepOnce(world: World, p: PlayerState, input: PlayerInput, dt: number): void {
  let mx = input.moveX, mz = input.moveZ;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (!Number.isFinite(mx) || !Number.isFinite(mz)) { mx = 0; mz = 0; }
  moveHorizontal(world, p, mx * WALK_SPEED * dt, mz * WALK_SPEED * dt);

  if (input.floating) {
    flyOnce(world, p, input.flyY, dt);
    return;
  }

  if (input.jump && p.onGround) {
    p.vy = JUMP_SPEED;
    p.onGround = false;
  }
  p.vy = Math.max(p.vy - GRAVITY * dt, -MAX_FALL_SPEED);
  const dy = p.vy * dt;
  const ny = p.y + dy;
  if (!collides(world, p.x, ny, p.z)) {
    p.y = ny;
    p.onGround = false;
  } else if (dy < 0) {
    // Landing: rest on top of the block below.
    p.y = Math.floor(p.y + dy) + 1;
    p.vy = 0;
    p.onGround = true;
  } else {
    // Bumped a ceiling.
    p.y = Math.ceil(p.y + PLAYER_HEIGHT + dy) - 1 - PLAYER_HEIGHT - EPS;
    p.vy = 0;
    p.onGround = false;
  }
}

/** Advance the player by `dt` seconds of real time. Mutates and returns `player`. */
export function stepPlayer(world: World, player: PlayerState, input: PlayerInput, dt: number): PlayerState {
  if (!(dt > 0)) return player;
  let time = Math.min(dt, MAX_FRAME_TIME) + player.leftover;
  while (time >= PHYSICS_STEP) {
    stepOnce(world, player, input, PHYSICS_STEP);
    time -= PHYSICS_STEP;
  }
  player.leftover = time;
  return player;
}

/** The player box as [minX, minY, minZ, maxX, maxY, maxZ], for overlap checks when building. */
export function playerBox(p: Pick<PlayerState, 'x' | 'y' | 'z'>): [number, number, number, number, number, number] {
  const h = PLAYER_WIDTH / 2;
  return [p.x - h, p.y, p.z - h, p.x + h, p.y + PLAYER_HEIGHT, p.z + h];
}

/** Can the player stand with feet at (x, y, z)? Free box, and a solid cell right below. */
function canStand(world: World, x: number, y: number, z: number): boolean {
  if (y > MAX_PLAYER_Y) return false;
  return !collides(world, x, y, z) && blocked(world, Math.floor(x), y - 1, Math.floor(z));
}

/** Highest standing spot in the column of (x, z), or null when the column has none. */
export function groundInColumn(world: World, x: number, z: number): number | null {
  for (let y = Math.floor(MAX_PLAYER_Y); y >= 0; y--) {
    if (canStand(world, x, y, z)) return y;
  }
  return null;
}

/**
 * The free standing cell nearest to (x, y, z), as a feet position in the middle of the cell.
 * Used when the start spot is built over ("Ik zit vast"). Falls back to the given spot if the world is full.
 */
export function nearestStandingSpot(world: World, x: number, y: number, z: number): { x: number; y: number; z: number } {
  const cx = Math.floor(x), cz = Math.floor(z);
  let best: { x: number; y: number; z: number } | null = null;
  let bestD = Infinity;
  for (let r = 0; r < WORLD_SIZE; r++) {
    // Nothing on this ring can beat what we have.
    if (best && r > Math.sqrt(bestD) + 1) break;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const px = cx + dx + 0.5, pz = cz + dz + 0.5;
        if (px < 0 || pz < 0 || px >= WORLD_SIZE || pz >= WORLD_SIZE) continue;
        for (let py = 0; py <= MAX_PLAYER_Y; py++) {
          if (!canStand(world, px, py, pz)) continue;
          const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
          if (d < bestD) { bestD = d; best = { x: px, y: py, z: pz }; }
        }
      }
    }
  }
  return best ?? { x, y, z };
}
