// The mole's path search (v16, decision 138): a breadth first search over stand cells in a box of SEARCH_SIDE x
// SEARCH_SIDE columns centred on `from` and SEARCH_LAYERS layers, with a visited array of 40 817 entries. The same
// walk rule serves the follower (path-follow.ts) and the knights (V16d, headroom 2). Deterministic: a fixed
// neighbour order, no random.
import { isSolid, LAVA, VUUR, WATER } from '../world/blocks';
import type { World } from '../world/world';
import { SEARCH_LAYERS, SEARCH_SIDE, type Cell } from './monster-types';

export interface PathOptions {
  /** Free cells needed from a stand cell upwards: 1 for the mole, 2 for a knight. */
  headroom: number;
  /** The kid's cell: cells within 1 block of it along x and z (and 2 along y) are refused. */
  avoid?: Cell;
}

/** Cells visited by the last search, for the cap test (never over 40 817). */
export let lastSearchCells = 0;

const HALF = (SEARCH_SIDE - 1) / 2;
const LAYER_HALF = (SEARCH_LAYERS - 1) / 2;
const CELLS = SEARCH_SIDE * SEARCH_SIDE * SEARCH_LAYERS;
/** The largest drop of one step. */
export const MAX_DROP = 3;

const stamp = new Uint32Array(CELLS);
let generation = 0;

const free = (world: World, x: number, y: number, z: number): boolean => !isSolid(world.get(x, y, z));

/** True when the cell is in the world, free (with `headroom` cells up) and stands on dry, safe ground. */
export function isStandCell(world: World, x: number, y: number, z: number, headroom: number): boolean {
  if (!world.inBounds(x, y, z) || y < 1) return false;
  const under = world.get(x, y - 1, z);
  if (!isSolid(under) || under === WATER || under === LAVA || under === VUUR) return false;
  for (let h = 0; h < headroom; h++) if (!free(world, x, y + h, z)) return false;
  return true;
}

/** True when `c` is within 1 block of the kid's cell along x and z (and 2 along y). */
export function nearKid(c: Cell, kid: Cell): boolean {
  return Math.abs(c.x - kid.x) <= 1 && Math.abs(c.z - kid.z) <= 1 && Math.abs(c.y - kid.y) <= 2;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** The stand cells one step from `c`: to each of the 4 neighbour columns, the highest cell that fits. */
export function stepCells(world: World, c: Cell, headroom: number): Cell[] {
  const out: Cell[] = [];
  for (const [dx, dz] of DIRS) {
    const x = c.x + dx;
    const z = c.z + dz;
    // One up: the cell above the head here must be free as well.
    if (isStandCell(world, x, c.y + 1, z, headroom) && free(world, c.x, c.y + headroom, c.z)) {
      out.push({ x, y: c.y + 1, z });
      continue;
    }
    // He walks in at the same height first, so those cells must be free; then he drops.
    let open = true;
    for (let h = 0; h < headroom && open; h++) open = free(world, x, c.y + h, z);
    if (!open) continue;
    for (let d = 0; d <= MAX_DROP; d++) {
      if (!free(world, x, c.y - d, z)) break;
      if (isStandCell(world, x, c.y - d, z, headroom)) {
        out.push({ x, y: c.y - d, z });
        break;
      }
    }
  }
  return out;
}

/**
 * The cells from `from` to the first goal cell reached, start and goal included, or null when there is no path.
 * Goals are stand cells; the first one the search reaches is the nearest by path.
 */
export function findMolePath(world: World, from: Cell, goals: readonly Cell[], options: PathOptions): Cell[] | null {
  lastSearchCells = 0;
  generation = (generation + 1) >>> 0 || 1;
  const gen = generation;
  const index = (c: Cell): number => {
    const dx = c.x - from.x + HALF;
    const dz = c.z - from.z + HALF;
    const dy = c.y - from.y + LAYER_HALF;
    if (dx < 0 || dz < 0 || dy < 0 || dx >= SEARCH_SIDE || dz >= SEARCH_SIDE || dy >= SEARCH_LAYERS) return -1;
    return (dy * SEARCH_SIDE + dz) * SEARCH_SIDE + dx;
  };
  const isGoal = new Set<number>();
  for (const g of goals) {
    const i = index(g);
    if (i >= 0) isGoal.add(i);
  }
  if (isGoal.size === 0) return null;
  const { headroom, avoid } = options;
  const start = index(from);
  const cells: Cell[] = [from];
  const next: number[] = [-1];
  stamp[start] = gen;
  lastSearchCells = 1;
  if (isGoal.has(start)) return [from];
  for (let head = 0; head < cells.length; head++) {
    const c = cells[head] as Cell;
    for (const n of stepCells(world, c, headroom)) {
      const i = index(n);
      if (i < 0 || stamp[i] === gen) continue;
      if (avoid && nearKid(n, avoid)) continue;
      stamp[i] = gen;
      lastSearchCells++;
      next.push(head);
      cells.push(n);
      if (isGoal.has(i)) {
        const path: Cell[] = [];
        for (let k = cells.length - 1; k >= 0; k = next[k] as number) path.push(cells[k] as Cell);
        return path.reverse();
      }
    }
  }
  return null;
}
