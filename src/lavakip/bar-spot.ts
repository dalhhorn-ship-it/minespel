// Where the Lavakip-bar can stand (v23, decision 144). The footprint is 2 columns along x and 3 along z from `spot`
// (the air cell above the ground at the min corner). V22a holds the signatures; V23a fills the rules: a free spot is
// 2 x 3 columns at one height with 3 air cells above each, never on water or lava or in a village site; the home
// spot is 5 to 12 from the start spot; the spot in front of the kid is 2 to 5 along his view.
import type { Rng } from '../core/rng';
import type { Point } from '../dinos/dino-ai';
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

/** True when the truck can stand with its min corner at `spot`. Nothing fits until V23a. */
export function isFreeSpot(world: World, spot: LavakipSpot): boolean {
  void world;
  void spot;
  return false;
}

/** The home spot: 5 to 12 from `start`, or the nearest one when none fits, or null. Seeded. Null until V23a. */
export function findHomeSpot(world: World, start: Point, rng: Rng): LavakipSpot | null {
  void world;
  void start;
  void rng;
  return null;
}

/** A free spot 2 to 5 blocks in front of the kid (yaw offsets 0, 20 and -20 degrees), or null. Null until V23a. */
export function findSpotInFront(world: World, pose: ViewPose): LavakipSpot | null {
  void world;
  void pose;
  return null;
}
