// The pen check of the mole (v22, decision 144, AC296): a bounded flood over his own walk rule (`stepCells` with the
// headroom of 1, the rule of his path search). When the flood ends inside at most 36 columns he is gevangen: a pen up
// to 6 x 6 inside, walls 2 high. The flood stops for good at the 37th column, so the check never looks at more than 37
// columns and a wall only 1 high (he steps over it) or a pen of 6 x 7 reads as free. Pure and unit tested.
import type { World } from '../world/world';
import { stepCells } from './mole-path';
import type { Cell } from './monster-types';

/** A pen holds at most this many columns (6 x 6). */
export const PEN_MAX_COLUMNS = 36;
/** The flood stops at this many columns: one more than a pen holds. */
export const REACH_LIMIT = PEN_MAX_COLUMNS + 1;
/** A second bound for odd ground with several levels per column: past this many cells he is free. */
const MAX_CELLS = 160;

/** Columns looked at by the last check, for the cap test (never over 37). */
export let lastReachColumns = 0;

/** The column box of the last flood: a block change inside it plus 1 makes the next check come at once. */
export interface ReachBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const xs = new Int32Array(MAX_CELLS);
const ys = new Int32Array(MAX_CELLS);
const zs = new Int32Array(MAX_CELLS);

function seen(n: number, x: number, y: number, z: number): boolean {
  for (let i = 0; i < n; i++) if (xs[i] === x && ys[i] === y && zs[i] === z) return true;
  return false;
}

function columnSeen(n: number, x: number, z: number): boolean {
  for (let i = 0; i < n; i++) if (xs[i] === x && zs[i] === z) return true;
  return false;
}

/**
 * True when the flood from `from` ends inside 36 columns or fewer (he is caught). `box` is filled with the column box of
 * everything the flood looked at. Allocation free apart from the small arrays `stepCells` makes; it runs every 2 s.
 */
export function checkReach(world: World, from: Cell, box: ReachBox): boolean {
  let n = 1;
  let columns = 1;
  xs[0] = from.x;
  ys[0] = from.y;
  zs[0] = from.z;
  box.minX = box.maxX = from.x;
  box.minZ = box.maxZ = from.z;
  let caught = true;
  for (let head = 0; head < n && caught; head++) {
    const c: Cell = { x: xs[head] as number, y: ys[head] as number, z: zs[head] as number };
    for (const s of stepCells(world, c, 1)) {
      if (seen(n, s.x, s.y, s.z)) continue;
      if (!columnSeen(n, s.x, s.z)) columns++;
      xs[n] = s.x;
      ys[n] = s.y;
      zs[n] = s.z;
      n++;
      if (s.x < box.minX) box.minX = s.x;
      if (s.x > box.maxX) box.maxX = s.x;
      if (s.z < box.minZ) box.minZ = s.z;
      if (s.z > box.maxZ) box.maxZ = s.z;
      if (columns >= REACH_LIMIT || n >= MAX_CELLS) {
        caught = false;
        break;
      }
    }
  }
  lastReachColumns = columns;
  return caught;
}

/** True when the column (x, z) is inside the box plus 1 on every side (a block change there may open or close a pen). */
export function nearReach(box: ReachBox, x: number, z: number): boolean {
  return x >= box.minX - 1 && x <= box.maxX + 1 && z >= box.minZ - 1 && z <= box.maxZ + 1;
}
