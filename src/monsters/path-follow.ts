// The kinematic path follower (v16, decision 138). It moves a point from cell centre to cell centre at a fixed
// speed along cells that `findMolePath` found, y snapping to the floor of the next cell (a small hop up, a drop
// down). No physics: the walk and the search use the same rule.
import type { World } from '../world/world';
import { isStandCell, nearKid } from './mole-path';
import type { Cell } from './monster-types';

export interface Walker {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export type FollowResult =
  /** Still walking. */
  | 'moving'
  /** The last cell was reached. */
  | 'arrived'
  /** The next cell is no stand cell any more: search again. */
  | 'replan'
  /** The next cell is within 1 block of the kid: he waits. */
  | 'wait';

export interface FollowOptions {
  headroom: number;
  /** The kid's cell. */
  kid?: Cell;
}

/**
 * Walks `walker` along `path` for `dt` seconds at `speed` blocks per second. `path` is consumed: cells are removed
 * when their centre is reached, so `path[0]` is always the cell he walks to (the start cell too: he first goes to its centre).
 */
export function followPath(world: World, walker: Walker, path: Cell[], dt: number, speed: number, options: FollowOptions): FollowResult {
  let left = speed * dt;
  while (path.length > 0) {
    const next = path[0] as Cell;
    if (!isStandCell(world, next.x, next.y, next.z, options.headroom)) return 'replan';
    const inside = Math.floor(walker.x) === next.x && Math.floor(walker.z) === next.z;
    if (!inside && options.kid && nearKid(next, options.kid)) return 'wait';
    const tx = next.x + 0.5;
    const tz = next.z + 0.5;
    const dx = tx - walker.x;
    const dz = tz - walker.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 1e-6) walker.heading = Math.atan2(dx / dist, dz / dist);
    if (dist <= left + 1e-9) {
      walker.x = tx;
      walker.z = tz;
      walker.y = next.y;
      left -= dist;
      path.shift();
      continue;
    }
    walker.x += (dx / dist) * left;
    walker.z += (dz / dist) * left;
    // The feet follow the floor of the next cell once he is past the edge.
    if (Math.floor(walker.x) === next.x && Math.floor(walker.z) === next.z) walker.y = next.y;
    return 'moving';
  }
  return 'arrived';
}
