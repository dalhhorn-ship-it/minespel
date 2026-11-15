// Knight behaviour. V17a is a stub seam: a knight stands still. V17b fills in `stepKnight` (the three modes on
// `stepDino` with `KNIGHT_BOX`, `stepToward`, the salute). Placement is real, because the skeleton needs it.
import { createRng, type Rng } from '../core/rng';
import { createDino, popNextTo, type DinoState, type Point } from '../dinos/dino-ai';
import type { World } from '../world/world';
import { KNIGHT_BOX, type KnightEvent, type KnightState } from './knight-types';

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

/** Steps one knight. Stub: he stands still and says nothing. V17b replaces the body of this function. */
export function stepKnight(knight: KnightState, ctx: KnightAiContext): KnightEvent | null {
  void knight;
  void ctx;
  return null;
}

export const defaultKnightRng = (): Rng => createRng(0x4b4e4947);
