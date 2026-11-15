// The black bubble (v18, AC213): finding a spot, floating in, drifting, and floating away. Pure functions on
// `BubbleState`, so they are easy to test. All ages run on loop time, which stops in every pause state.
import { CAMERA_FOV } from '../game/build-controller';
import type { Point } from '../dinos/dino-ai';
import type { Box } from '../world/build';
import { raycast } from '../world/raycast';
import type { World } from '../world/world';
import {
  BUBBLE_DRIFT, BUBBLE_FLOAT_IN_MS, BUBBLE_FLOAT_OUT_MS, BUBBLE_MAX_DISTANCE, BUBBLE_MIN_DISTANCE, BUBBLE_MIN_POINTS,
  BUBBLE_STAY_MS, type BubbleState,
} from './monster-types';

/** Edge of the bubble model at scale 1, in blocks. */
export const BUBBLE_BASE_SIZE = 1.2;

/** Yaw offsets to try, in radians, closest to the middle of the view first (a view is wider than 60 degrees). */
const YAW_OFFSETS = [0, 0.25, -0.25, 0.5, -0.5];
const DISTANCES = [8, 7, 9, 6, 10];

export interface Eye {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

/**
 * A valid bubble spot: 6 to 10 blocks along the kid's view on the ground plane at eye height, a few yaw offsets,
 * an air cell (overlay aware) in the world, with a ray from the eye that meets no solid block. Null when none.
 */
export function findBubbleSpot(world: World, eye: Eye): Point | null {
  for (const off of YAW_OFFSETS) {
    const a = eye.yaw + off;
    const fx = Math.sin(a);
    const fz = Math.cos(a);
    for (const d of DISTANCES) {
      if (d < BUBBLE_MIN_DISTANCE || d > BUBBLE_MAX_DISTANCE) continue;
      const x = eye.x + fx * d;
      const z = eye.z + fz * d;
      const cx = Math.floor(x);
      const cy = Math.floor(eye.y);
      const cz = Math.floor(z);
      if (!world.inBounds(cx, cy, cz) || world.get(cx, cy, cz) !== 0) continue;
      if (raycast(world, eye.x, eye.y, eye.z, fx, 0, fz, d - 0.01)) continue;
      return { x, y: eye.y, z };
    }
  }
  return null;
}

/** Scale that makes the bubble at least `BUBBLE_MIN_POINTS` wide on a screen `viewportHeight` points high. */
export function bubbleScale(distance: number, viewportHeight: number): number {
  const t = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const needed = (BUBBLE_MIN_POINTS * 1.15 * 2 * t * Math.max(1, distance)) / Math.max(1, viewportHeight);
  return Math.max(1, needed / BUBBLE_BASE_SIZE);
}

export function createBubble(spot: Point, eye: Eye, viewportHeight: number): BubbleState {
  const b: BubbleState = {
    spot: { ...spot }, x: spot.x, y: spot.y - 1.5, z: spot.z, stage: 'in', ageMs: 0, outMs: 0,
    scale: bubbleScale(Math.hypot(spot.x - eye.x, spot.z - eye.z), viewportHeight),
  };
  return b;
}

/** How much of its size is drawn: grows while it floats in (a visual only; the tap size is `scale`). */
export function bubbleGrow(b: BubbleState): number {
  if (b.stage !== 'in') return 1;
  return 0.3 + 0.7 * Math.min(1, b.ageMs / BUBBLE_FLOAT_IN_MS);
}

/** Steps one bubble by `dtMs` of loop time. Returns 'gone' once it has floated away. */
export function stepBubble(b: BubbleState, dtMs: number, eye: Eye, viewportHeight: number): 'gone' | null {
  if (!(dtMs > 0)) return null;
  b.ageMs += dtMs;
  b.scale = bubbleScale(Math.hypot(b.spot.x - eye.x, b.spot.z - eye.z), viewportHeight);
  if (b.stage === 'in') {
    const k = Math.min(1, b.ageMs / BUBBLE_FLOAT_IN_MS);
    b.x = b.spot.x;
    b.z = b.spot.z;
    b.y = b.spot.y - 1.5 * (1 - k * k * (3 - 2 * k));
    if (k >= 1) b.stage = 'drift';
  }
  if (b.stage === 'drift') {
    b.x = b.spot.x + BUBBLE_DRIFT * Math.sin(b.ageMs * 0.0011);
    b.y = b.spot.y + 0.25 * Math.sin(b.ageMs * 0.0017);
    b.z = b.spot.z + BUBBLE_DRIFT * Math.cos(b.ageMs * 0.0009);
    if (b.ageMs >= BUBBLE_STAY_MS) b.stage = 'out';
  }
  if (b.stage === 'out') {
    b.outMs += dtMs;
    b.y += (3 * dtMs) / BUBBLE_FLOAT_OUT_MS;
    if (b.outMs >= BUBBLE_FLOAT_OUT_MS) return 'gone';
  }
  return null;
}

/** The tap box: as wide as the drawn bubble at full size. */
export function bubbleBox(b: BubbleState): Box {
  const h = (b.scale * BUBBLE_BASE_SIZE) / 2;
  return [b.x - h, b.y - h, b.z - h, b.x + h, b.y + h, b.z + h];
}
