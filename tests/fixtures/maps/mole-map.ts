// A flat seeded map for the mole's tests (v16, AC248 to AC252): bands across the whole world (so no path can go round
// them) and two local pens. Ground is stone up to y = FLOOR, so he stands at feet y = GY. Plain data, no random.
import { AIR, LAVA, STEEN, WATER } from '../../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../../src/world/terrain';
import { World } from '../../../src/world/world';

export const FLOOR = 10;
export const GY = FLOOR + 1;
/** Every band spans z from 0 to WORLD_SIZE - 1. */
export const Z = 20;
export const WALL1_X = 20;
export const OVERHANG_X = 40;
/** The gap under the overhang, at z = Z. */
export const LAVA_X = 47;
export const WATER_X = 52;
export const PIT = { x0: 60, x1: 62, z0: 60, z1: 62 };
/** Pens: inside x0..x1, z0..z1. */
export const PEN2 = { x0: 70, x1: 75, z0: 80, z1: 85 };
export const PEN1 = { x0: 70, x1: 75, z0: 100, z1: 105 };
export const STEP2_X = 100;
export const CLIFF_X = 110;

export function box(w: World, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, id: number): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) w.set(x, y, z, id);
}

/** A ring of walls (`height` blocks high from GY) around the inside x0..x1, z0..z1. */
export function ring(w: World, p: { x0: number; x1: number; z0: number; z1: number }, height: number, id = STEEN): void {
  for (let y = GY; y < GY + height; y++) {
    for (let x = p.x0 - 1; x <= p.x1 + 1; x++) { w.set(x, y, p.z0 - 1, id); w.set(x, y, p.z1 + 1, id); }
    for (let z = p.z0 - 1; z <= p.z1 + 1; z++) { w.set(p.x0 - 1, y, z, id); w.set(p.x1 + 1, y, z, id); }
  }
}

export function buildMoleMap(): World {
  const w = new World();
  const last = WORLD_SIZE - 1;
  box(w, 0, last, 0, last, 0, FLOOR, STEEN);
  box(w, 0, last, 0, last, GY, WORLD_HEIGHT - 1, AIR);
  // A wall 1 high.
  box(w, WALL1_X, WALL1_X, 0, last, GY, GY, STEEN);
  // A wall 3 high with a gap of 1 high at z = Z: the overhang is above it.
  box(w, OVERHANG_X, OVERHANG_X, 0, last, GY, GY + 2, STEEN);
  w.set(OVERHANG_X, GY, Z, AIR);
  // A lava strip and a water strip: no walking over them.
  box(w, LAVA_X, LAVA_X + 2, 0, last, FLOOR, FLOOR, LAVA);
  box(w, WATER_X, WATER_X + 2, 0, last, FLOOR, FLOOR, WATER);
  // A pit of 3 (air from y 8 to FLOOR, the floor of the pit at y 7).
  box(w, PIT.x0, PIT.x1, PIT.z0, PIT.z1, FLOOR - 2, FLOOR, AIR);
  ring(w, PEN2, 2);
  ring(w, PEN1, 1);
  // A step of 2 and a plateau of 4 (a cliff on its west side).
  box(w, STEP2_X, STEP2_X + 2, 0, last, GY, GY + 1, STEEN);
  box(w, CLIFF_X, last, 0, last, GY, GY + 3, STEEN);
  return w;
}
