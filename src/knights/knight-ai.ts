// Knight behaviour (V17b): the three modes on `stepDino` with `KNIGHT_BOX`, `stepToward`, the salute, and placement.
import { createRng, type Rng } from '../core/rng';
import { createDino, DINO_SPEED, popNextTo, stepDino, walkToward, type DinoState, type Point } from '../dinos/dino-ai';
import { SEARCH_EVERY_MS, type Cell } from '../monsters/monster-types';
import { findMolePath, isStandCell } from '../monsters/mole-path';
import type { World } from '../world/world';
import { KNIGHT_BOX, KNIGHT_NEAR, SALUTE_GAP_MS, type KnightEvent, type KnightState } from './knight-types';

export interface KnightAiContext {
  world: World;
  rng: Rng;
  /** Feet of the kid. */
  player: Point;
  /** View yaw of the kid, for "behind the kid". */
  playerYaw: number;
  /** Seconds of loop time. */
  dt: number;
}

/** A body for a new knight at `spot`. It is a dino body so `stepDino` can walk it; the kind is never shown. */
export function createKnightBody(spot: Point): DinoState {
  const body = createDino({ kind: 'kip', golden: false, x: spot.x, y: spot.y, z: spot.z }, true);
  body.mode = 'stay';
  return body;
}

/** Puts a knight on a free spot 1.5 to 2.5 blocks from the kid, behind him when possible. */
export function placeNearKid(world: World, k: KnightState, kid: Point, rng: Rng, yaw: number): void {
  if (popNextTo(world, k.body, kid, rng, KNIGHT_BOX, yaw)) return;
  k.body.x = kid.x + 1.5;
  k.body.y = kid.y;
  k.body.z = kid.z;
}

/** Puts a stay or guard knight on his saved spot. */
export function placeAtSpot(k: KnightState): void {
  if (!k.spot) return;
  k.body.x = k.spot.x;
  k.body.y = k.spot.y;
  k.body.z = k.spot.z;
  k.body.stayX = k.spot.x;
  k.body.stayZ = k.spot.z;
}

export interface StepTowardOptions {
  /** Blocks per second. */
  speed: number;
  /** Seconds stuck before the body pops next to the target. */
  stuckSeconds: number;
  /** Distance to the target that counts as arrived. */
  arrive: number;
  box?: { side: number; height: number };
}

export type StepTowardResult = 'walking' | 'arrived' | 'popped';

const SUB_STEP = 1 / 30;

/**
 * Walks `body` straight to `target` (no path finding). After `stuckSeconds` of not getting anywhere it pops next to
 * the target. Lava and fire stop it like a wall. Also used by V18d.
 */
export function stepToward(world: World, body: DinoState, target: Point, rng: Rng, dt: number, opts: StepTowardOptions): StepTowardResult {
  if (!(dt > 0) || !Number.isFinite(dt)) return 'walking';
  const n = Math.max(1, Math.ceil(dt / SUB_STEP));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    if (Math.hypot(target.x - body.x, target.z - body.z) <= opts.arrive) {
      body.stuckTime = 0;
      return 'arrived';
    }
    if (body.stuckTime >= opts.stuckSeconds) {
      body.stuckTime = 0;
      return popNextTo(world, body, target, rng, opts.box) ? 'popped' : 'walking';
    }
    const moved = walkToward(world, body, target, h, opts.speed, opts.box);
    if (moved >= opts.speed * h * 0.25) body.stuckTime = 0;
    else if (body.onGround) body.stuckTime += h;
  }
  return 'walking';
}

/** Goal cells are the stand cells within 1 block of the target along x and z; without a `y` he looks 3 up and down. */
function chaseGoals(world: World, body: DinoState, chase: NonNullable<KnightState['chase']>): Cell[] {
  const goals: Cell[] = [];
  const tx = Math.floor(chase.x);
  const tz = Math.floor(chase.z);
  const ty = Math.floor(chase.y ?? body.y + 0.01);
  const span = chase.y === undefined ? 3 : 1;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let y = ty - span; y <= ty + span; y++) {
        if (isStandCell(world, tx + dx, y, tz + dz, 2)) goals.push({ x: tx + dx, y, z: tz + dz });
      }
    }
  }
  return goals;
}

/**
 * The chase (V16d): every SEARCH_EVERY_MS a path search with headroom 2 to the cells next to the target, then walk the
 * cells in order with physics. No path, or 3 s stuck: he pops next to the target as before (decision 138).
 */
function stepChase(knight: KnightState, world: World, rng: Rng, dt: number): StepTowardResult {
  const body = knight.body;
  const chase = knight.chase as NonNullable<KnightState['chase']>;
  const target = { x: chase.x, y: body.y, z: chase.z };
  knight.searchMs = (knight.searchMs ?? 0) - dt * 1000;
  if (knight.searchMs <= 0) {
    knight.searchMs = SEARCH_EVERY_MS;
    const here: Cell = { x: Math.floor(body.x), y: Math.floor(body.y + 0.01), z: Math.floor(body.z) };
    knight.chasePath = findMolePath(world, here, chaseGoals(world, body, chase), { headroom: 2 });
  }
  const path = knight.chasePath;
  // Close enough, or no path (or its end reached): the straight walk of before, with its own 3 s stuck pop.
  if (!path || path.length === 0 || Math.hypot(target.x - body.x, target.z - body.z) <= 1.2) {
    return stepToward(world, body, target, rng, dt, { speed: DINO_SPEED, stuckSeconds: 3, arrive: 1.2, box: KNIGHT_BOX });
  }
  const next = path[0] as Cell;
  const r = stepToward(world, body, { x: next.x + 0.5, y: body.y, z: next.z + 0.5 }, rng, dt,
    { speed: DINO_SPEED, stuckSeconds: Infinity, arrive: 0.3, box: KNIGHT_BOX });
  if (r === 'arrived') path.shift();
  if (body.stuckTime >= 3) {
    body.stuckTime = 0;
    knight.chasePath = null;
    knight.searchMs = SEARCH_EVERY_MS;
    return popNextTo(world, body, target, rng, KNIGHT_BOX) ? 'popped' : 'walking';
  }
  return 'walking';
}

/** Guard wander radius: AC204 allows 9 blocks from the spot, 7 plus a goal in flight stays inside. */
export const GUARD_RADIUS = 7;
export const STAY_RADIUS = 0.5;

/** Steps one knight by `ctx.dt` seconds. Returns `salute` when he greets the kid, else null. */
export function stepKnight(knight: KnightState, ctx: KnightAiContext): KnightEvent | null {
  const { world, rng, player, playerYaw, dt } = ctx;
  if (!(dt > 0) || !Number.isFinite(dt)) return null;
  const body = knight.body;
  knight.saluteClockMs += dt * 1000;
  if (!knight.chase && knight.chasePath !== undefined) {
    knight.chasePath = undefined;
    knight.searchMs = undefined;
  }
  if (knight.chase) {
    const r = stepChase(knight, world, rng, dt);
    if (r === 'arrived') knight.chase = null;
  } else {
    if (knight.mode === 'follow') {
      body.mode = 'follow';
      stepDino(world, body, player, rng, dt, { box: KNIGHT_BOX, playerYaw });
    } else {
      body.mode = 'stay';
      if (knight.spot) {
        body.stayX = knight.spot.x;
        body.stayZ = knight.spot.z;
      }
      stepDino(world, body, player, rng, dt, { box: KNIGHT_BOX, radius: knight.mode === 'guard' ? GUARD_RADIUS : STAY_RADIUS });
    }
  }
  if (knight.mode !== 'follow' && knight.saluteClockMs >= SALUTE_GAP_MS
    && Math.hypot(player.x - body.x, player.z - body.z) <= KNIGHT_NEAR) {
    knight.saluteClockMs = 0;
    return 'salute';
  }
  return null;
}

export const defaultKnightRng = (): Rng => createRng(0x4b4e4947);
