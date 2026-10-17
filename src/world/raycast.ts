import { isSolid } from './blocks';
import type { World } from './world';

/** How far a tap can reach, in blocks. */
export const REACH = 6;

export interface RayHit {
  /** The solid cell that was hit. */
  x: number;
  y: number;
  z: number;
  /** Outward normal of the face that was hit. The empty cell to build in is cell + normal. */
  nx: number;
  ny: number;
  nz: number;
  /** Distance from the ray origin to the face. */
  distance: number;
}

/**
 * Voxel ray walk (Amanatides and Woo). Returns the first solid cell within `maxDistance`,
 * with the face it was entered through, or null. The direction does not need to be normalised.
 * Cells outside the world are air, so a ray may start or pass outside.
 */
export function raycast(
  world: World,
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  maxDistance: number = REACH,
): RayHit | null {
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 0) || !Number.isFinite(len)) return null;
  const ux = dx / len, uy = dy / len, uz = dz / len;

  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(ux), sy = Math.sign(uy), sz = Math.sign(uz);
  const tDx = sx === 0 ? Infinity : Math.abs(1 / ux);
  const tDy = sy === 0 ? Infinity : Math.abs(1 / uy);
  const tDz = sz === 0 ? Infinity : Math.abs(1 / uz);
  let tx = sx === 0 ? Infinity : (sx > 0 ? x + 1 - ox : ox - x) * tDx;
  let ty = sy === 0 ? Infinity : (sy > 0 ? y + 1 - oy : oy - y) * tDy;
  let tz = sz === 0 ? Infinity : (sz > 0 ? z + 1 - oz : oz - z) * tDz;

  // Starting inside a solid block counts as a hit with no face.
  if (isSolid(world.get(x, y, z))) {
    return { x, y, z, nx: 0, ny: 0, nz: 0, distance: 0 };
  }

  for (;;) {
    let t: number;
    let nx = 0, ny = 0, nz = 0;
    if (tx <= ty && tx <= tz) {
      t = tx; tx += tDx; x += sx; nx = -sx;
    } else if (ty <= tz) {
      t = ty; ty += tDy; y += sy; ny = -sy;
    } else {
      t = tz; tz += tDz; z += sz; nz = -sz;
    }
    if (t > maxDistance) return null;
    if (isSolid(world.get(x, y, z))) return { x, y, z, nx, ny, nz, distance: t };
  }
}
