import { isSolid } from './blocks';
import { WORLD_SIZE } from './terrain';
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

/** Physics runs in fixed small steps so the result does not depend on the frame rate. */
export const PHYSICS_STEP = 1 / 120;
/** A slow frame never counts for more than this, so nobody tunnels through a block. */
export const MAX_FRAME_TIME = 0.1;

const EPS = 1e-4;

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
}

export function createPlayer(x: number, y: number, z: number): PlayerState {
  return { x, y, z, vy: 0, onGround: false, leftover: 0 };
}

/** Solid for movement. The sides of the world are walls; below the floor is solid too. */
function blocked(world: World, x: number, y: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= WORLD_SIZE || z >= WORLD_SIZE || y < 0) return true;
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

function stepOnce(world: World, p: PlayerState, input: PlayerInput, dt: number): void {
  let mx = input.moveX, mz = input.moveZ;
  const len = Math.hypot(mx, mz);
  if (len > 1) { mx /= len; mz /= len; }
  if (!Number.isFinite(mx) || !Number.isFinite(mz)) { mx = 0; mz = 0; }
  moveHorizontal(world, p, mx * WALK_SPEED * dt, mz * WALK_SPEED * dt);

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
