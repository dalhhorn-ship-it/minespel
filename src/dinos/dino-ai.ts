// Dino behaviour: follow, stay, wander, hop one block, never inside a block, pop next to the player.
// Pure and frame rate independent: every function takes dt in seconds. No DOM, no storage.
import type { Rng } from '../core/rng';
import { isSolid } from '../world/blocks';
import { GRAVITY, MAX_FALL_SPEED, MAX_FRAME_TIME } from '../world/physics';
import { WORLD_SIZE } from '../world/terrain';
import type { World } from '../world/world';
import { GROW_SECONDS, growthScale, type HatchSpot } from './egg';
import { DINO_KINDS, type DinoKindId } from './kinds';

export type DinoMode = 'follow' | 'stay';

export const DINO_SPEED = 3;
/** Wander radius around the player (follow) or the stay spot (stay). */
export const WANDER_RADIUS = 3;
/** A follower farther than this walks towards the player until it is within CLOSE_ENOUGH. */
export const CLOSE_ENOUGH = 2;
/** A follower farther than this for FAR_SECONDS pops next to the player (AC17). */
export const FAR_DISTANCE = 8;
export const FAR_SECONDS = 5;
export const STUCK_SECONDS = 5;
/** Peak hop height is HOP_SPEED^2 / (2 * GRAVITY), about 1.14 blocks: one block up, not two. */
export const HOP_SPEED = 8;

const EPS = 1e-4;
const SUB_STEP = 1 / 60;

export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface DinoState {
  kind: DinoKindId;
  golden: boolean;
  mode: DinoMode;
  /** Feet centre. */
  x: number;
  y: number;
  z: number;
  vy: number;
  onGround: boolean;
  /** Facing in radians, for the renderer. */
  heading: number;
  /** Seconds since hatching, capped at GROW_SECONDS. */
  growth: number;
  /** Where a dino on Blijf hier stays. */
  stayX: number;
  stayZ: number;
  goal: { x: number; z: number } | null;
  /** Seconds left before the next wander goal is picked. */
  idleLeft: number;
  /** Seconds left before the current wander goal is given up. */
  goalLeft: number;
  /** Seconds it wanted to walk but could not. */
  stuckTime: number;
  /** Seconds in a row it has been farther than FAR_DISTANCE from the player. */
  farTime: number;
  /** True while it walks all the way to the player. */
  chasing: boolean;
}

export type DinoEvent = 'popped' | null;

/** What a caller other than the dino system may decide: the body box and the wander radius (villagers, V11c). */
export interface StepOptions {
  box?: { side: number; height: number };
  radius?: number;
}

export function createDino(spot: HatchSpot, grown = false): DinoState {
  return {
    kind: spot.kind, golden: spot.golden, mode: 'follow',
    x: spot.x, y: spot.y, z: spot.z, vy: 0, onGround: false, heading: 0,
    growth: grown ? GROW_SECONDS : 0, stayX: spot.x, stayZ: spot.z,
    goal: null, idleLeft: 0.5, goalLeft: 0, stuckTime: 0, farTime: 0, chasing: false,
  };
}

/** Collision footprint is a square as wide as the body is long and wide on average. */
export function dinoBox(d: Pick<DinoState, 'kind' | 'growth'>): { side: number; height: number } {
  const s = DINO_KINDS[d.kind].size;
  const k = growthScale(d.growth);
  return { side: ((s.w + s.l) / 2) * k, height: s.h * k };
}

/** The box as [minX, minY, minZ, maxX, maxY, maxZ] for overlap checks (building, taps). */
export function dinoBounds(d: Pick<DinoState, 'kind' | 'growth' | 'x' | 'y' | 'z'>): [number, number, number, number, number, number] {
  const { side, height } = dinoBox(d);
  const h = side / 2;
  return [d.x - h, d.y, d.z - h, d.x + h, d.y + height, d.z + h];
}

function blocked(world: World, x: number, y: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= WORLD_SIZE || z >= WORLD_SIZE || y < 0) return true;
  return isSolid(world.get(x, y, z));
}

/** Would a box with this footprint and height, standing at (px, py, pz), overlap a solid cell? */
export function boxCollides(world: World, px: number, py: number, pz: number, side: number, height: number): boolean {
  const h = side / 2;
  const x0 = Math.floor(px - h), x1 = Math.floor(px + h - EPS);
  const y0 = Math.floor(py), y1 = Math.floor(py + height - EPS);
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

export function dinoCollides(world: World, d: DinoState, x = d.x, y = d.y, z = d.z, box?: StepOptions['box']): boolean {
  const { side, height } = box ?? dinoBox(d);
  return boxCollides(world, x, y, z, side, height);
}

function resetMotion(d: DinoState): void {
  d.vy = 0; d.onGround = false; d.goal = null; d.goalLeft = 0; d.idleLeft = 0.5;
  d.stuckTime = 0; d.farTime = 0; d.chasing = false;
}

/** Puts the dino on a free spot on the ground 1.5 to 2.5 blocks from the player. False when none was found. */
export function popNextTo(world: World, d: DinoState, player: Point, rng: Rng, box?: StepOptions['box']): boolean {
  const { side, height } = box ?? dinoBox(d);
  const baseY = Math.floor(player.y);
  const start = rng.next() * Math.PI * 2;
  const radii = [1.5, 2, 2.5, 1];
  for (const r of radii) {
    for (let i = 0; i < 16; i++) {
      const a = start + (i / 16) * Math.PI * 2;
      const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      for (const dy of [0, 1, -1, 2, -2, 3, -3]) {
        const y = baseY + dy;
        if (y < 0) continue;
        if (!boxCollides(world, x, y, z, side, height) && boxCollides(world, x, y - 0.05, z, side, height)) {
          d.x = x; d.y = y; d.z = z;
          resetMotion(d);
          d.onGround = true;
          return true;
        }
      }
    }
  }
  return false;
}

function pickGoal(d: DinoState, ax: number, az: number, rng: Rng, radius: number): void {
  const a = rng.next() * Math.PI * 2;
  const r = Math.sqrt(rng.next()) * radius;
  const lim = (v: number): number => Math.min(WORLD_SIZE - 1, Math.max(1, v));
  d.goal = { x: lim(ax + Math.cos(a) * r), z: lim(az + Math.sin(a) * r) };
  d.goalLeft = 4;
}

/** One small physics step. Returns the horizontal distance moved. */
function physics(world: World, d: DinoState, dirX: number, dirZ: number, dt: number, box?: StepOptions['box']): number {
  const { side, height } = box ?? dinoBox(d);
  const ox = d.x, oz = d.z;
  const mx = dirX * DINO_SPEED * dt, mz = dirZ * DINO_SPEED * dt;
  let hitWall = false;
  if (mx !== 0 && !boxCollides(world, d.x + mx, d.y, d.z, side, height)) d.x += mx;
  else if (mx !== 0) hitWall = true;
  if (mz !== 0 && !boxCollides(world, d.x, d.y, d.z + mz, side, height)) d.z += mz;
  else if (mz !== 0) hitWall = true;

  // Hop: only when blocked, on the ground, and one block higher is free.
  if (hitWall && d.onGround) {
    const clear = !boxCollides(world, d.x + mx, d.y + 1.05, d.z + mz, side, height);
    if (clear) { d.vy = HOP_SPEED; d.onGround = false; }
  }

  d.vy = Math.max(d.vy - GRAVITY * dt, -MAX_FALL_SPEED);
  const dy = d.vy * dt;
  if (!boxCollides(world, d.x, d.y + dy, d.z, side, height)) {
    d.y += dy;
    d.onGround = false;
  } else if (dy < 0) {
    d.y = Math.floor(d.y + dy) + 1;
    d.vy = 0;
    d.onGround = true;
  } else {
    d.y = Math.ceil(d.y + height + dy) - 1 - height - EPS;
    d.vy = 0;
  }
  return Math.hypot(d.x - ox, d.z - oz);
}

/** Moves a dino out of a block (for example one placed on top of it), or pops it to the player. */
function rescue(world: World, d: DinoState, player: Point, rng: Rng, opts: StepOptions): DinoEvent {
  for (let up = 1; up <= 3; up++) {
    if (!dinoCollides(world, d, d.x, d.y + up, d.z, opts.box)) { d.y += up; d.vy = 0; return null; }
  }
  return popNextTo(world, d, player, rng, opts.box) ? 'popped' : null;
}

/**
 * Advances one dino by `dt` seconds. Mutates `d`. Returns 'popped' when it jumped next to the
 * player because it was stuck or far away for too long (the caller can show a puff).
 */
export function stepDino(world: World, d: DinoState, player: Point, rng: Rng, dt: number, opts: StepOptions = {}): DinoEvent {
  if (!(dt > 0) || !Number.isFinite(dt)) return null;
  const total = Math.min(dt, MAX_FRAME_TIME);
  d.growth = Math.min(GROW_SECONDS, d.growth + total);

  let event: DinoEvent = null;
  if (dinoCollides(world, d, d.x, d.y, d.z, opts.box)) {
    event = rescue(world, d, player, rng, opts);
    if (event) return event;
  }

  const n = Math.max(1, Math.ceil(total / SUB_STEP));
  const h = total / n;
  for (let i = 0; i < n; i++) {
    const ev = stepOnce(world, d, player, rng, h, opts);
    if (ev) { event = ev; break; }
  }
  return event;
}

function stepOnce(world: World, d: DinoState, player: Point, rng: Rng, dt: number, opts: StepOptions): DinoEvent {
  const radius = opts.radius ?? WANDER_RADIUS;
  const follow = d.mode === 'follow';
  const distPlayer = Math.hypot(player.x - d.x, player.z - d.z);

  if (follow) {
    d.farTime = distPlayer > FAR_DISTANCE ? d.farTime + dt : 0;
    if (d.farTime >= FAR_SECONDS || d.stuckTime >= STUCK_SECONDS) {
      return popNextTo(world, d, player, rng, opts.box) ? 'popped' : (d.farTime = 0, d.stuckTime = 0, null);
    }
    if (distPlayer > WANDER_RADIUS) d.chasing = true;
    else if (distPlayer <= CLOSE_ENOUGH) d.chasing = false;
  } else {
    d.farTime = 0;
    d.stuckTime = 0;
    d.chasing = false;
  }

  const ax = follow ? player.x : d.stayX;
  const az = follow ? player.z : d.stayZ;

  if (d.chasing) {
    d.goal = { x: player.x, z: player.z };
  } else if (d.goal) {
    d.goalLeft -= dt;
    const gd = Math.hypot(d.goal.x - d.x, d.goal.z - d.z);
    const anchorDist = Math.hypot(d.goal.x - ax, d.goal.z - az);
    if (gd < 0.2 || d.goalLeft <= 0 || anchorDist > radius + 0.5) {
      d.goal = null;
      d.idleLeft = 1 + rng.next() * 2;
    }
  } else {
    d.idleLeft -= dt;
    if (d.idleLeft <= 0) pickGoal(d, ax, az, rng, radius);
  }

  let dirX = 0, dirZ = 0;
  if (d.goal) {
    const gx = d.goal.x - d.x, gz = d.goal.z - d.z;
    const len = Math.hypot(gx, gz);
    if (len > 0.05) { dirX = gx / len; dirZ = gz / len; }
  }
  const moved = physics(world, d, dirX, dirZ, dt, opts.box);
  if (dirX !== 0 || dirZ !== 0) {
    d.heading = Math.atan2(dirX, dirZ);
    if (d.onGround && moved < DINO_SPEED * dt * 0.25) d.stuckTime += dt;
    else if (moved >= DINO_SPEED * dt * 0.25) d.stuckTime = 0;
  } else {
    d.stuckTime = 0;
  }
  return null;
}
