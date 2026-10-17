// Mine and place rules. Pure functions on the world, no rendering, no input.
import { AIR, isMinable, isPlaceable } from './blocks';
import { collides, playerBox, type PlayerState } from './physics';
import { raycast, REACH } from './raycast';
import type { World } from './world';

/** Box as [minX, minY, minZ, maxX, maxY, maxZ]. */
export type Box = [number, number, number, number, number, number];

/** Asks "is a dino or egg in this box?". Passed in by the game. */
export type IsOccupied = (box: Box) => boolean;

export interface Aim {
  /** Ray origin (the eye) and direction (does not need to be normalised). */
  ox: number; oy: number; oz: number;
  dx: number; dy: number; dz: number;
}

export type MineResult =
  | { ok: true; x: number; y: number; z: number; block: number }
  | { ok: false; reason: 'nothing' | 'unminable' };

export type PlaceResult =
  | {
      ok: true; x: number; y: number; z: number; block: number;
      /** Set when the player stood in the cell: the new feet height. Apply it to the player. */
      liftPlayerTo?: number;
    }
  | { ok: false; reason: 'nothing' | 'unplaceable' | 'occupied' | 'player' | 'no-room' };

const EPS = 1e-3;

function overlaps(a: Box, b: Box): boolean {
  return (
    a[0] < b[3] - EPS && a[3] > b[0] + EPS &&
    a[1] < b[4] - EPS && a[4] > b[1] + EPS &&
    a[2] < b[5] - EPS && a[5] > b[2] + EPS
  );
}

/** Hakken: remove the minable block the aim points at, within REACH. Oersteen never goes. */
export function mineBlock(world: World, aim: Aim): MineResult {
  const hit = raycast(world, aim.ox, aim.oy, aim.oz, aim.dx, aim.dy, aim.dz, REACH);
  if (!hit) return { ok: false, reason: 'nothing' };
  const block = world.get(hit.x, hit.y, hit.z);
  if (!isMinable(block)) return { ok: false, reason: 'unminable' };
  world.set(hit.x, hit.y, hit.z, AIR);
  return { ok: true, x: hit.x, y: hit.y, z: hit.z, block };
}

/**
 * Bouwen: put `block` against the face the aim points at, within REACH.
 * Refused when the cell is taken, outside the world, or overlaps a dino or egg.
 * Overlapping the player is refused, except building up: the top face of the block the
 * player stands on, with room for the head, lifts the player onto the new block.
 */
export function placeBlock(
  world: World,
  aim: Aim,
  block: number,
  player: Pick<PlayerState, 'x' | 'y' | 'z'>,
  isOccupied: IsOccupied = () => false,
): PlaceResult {
  if (!isPlaceable(block)) return { ok: false, reason: 'unplaceable' };
  const hit = raycast(world, aim.ox, aim.oy, aim.oz, aim.dx, aim.dy, aim.dz, REACH);
  if (!hit || (hit.nx === 0 && hit.ny === 0 && hit.nz === 0)) return { ok: false, reason: 'nothing' };
  const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
  // Also covers a second tap on a cell that was just filled: it is not air any more.
  if (!world.inBounds(x, y, z) || world.get(x, y, z) !== AIR) return { ok: false, reason: 'nothing' };

  const cell: Box = [x, y, z, x + 1, y + 1, z + 1];
  if (isOccupied(cell)) return { ok: false, reason: 'occupied' };

  let liftPlayerTo: number | undefined;
  if (overlaps(cell, playerBox(player))) {
    // Building up: top face tapped, and the cell is at the player's feet.
    if (hit.ny !== 1 || y !== Math.floor(player.y + EPS)) return { ok: false, reason: 'player' };
    world.set(x, y, z, block);
    const newY = y + 1;
    if (collides(world, player.x, newY, player.z) || isOccupied(playerBox({ x: player.x, y: newY, z: player.z }))) {
      world.set(x, y, z, AIR);
      return { ok: false, reason: 'no-room' };
    }
    liftPlayerTo = newY;
  } else {
    world.set(x, y, z, block);
  }
  return liftPlayerTo === undefined
    ? { ok: true, x, y, z, block }
    : { ok: true, x, y, z, block, liftPlayerTo };
}
