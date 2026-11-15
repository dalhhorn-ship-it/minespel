// The mole's path search (v16, decision 138). STUB until V16b: the signature is final, the search is not written yet.
// V16b: a breadth first search over stand cells in a box of SEARCH_SIDE x SEARCH_SIDE columns centred on `from` and
// SEARCH_LAYERS layers, with a visited array of 40 817 entries. Knights use it with headroom 2 (V16d).
import type { World } from '../world/world';
import type { Cell } from './monster-types';

export interface PathOptions {
  /** Free cells needed from a stand cell upwards: 1 for the mole, 2 for a knight. */
  headroom: number;
  /** The kid's cell: cells within 1 block of it along x and z (and 2 along y) are refused. */
  avoid?: Cell;
}

/** Cells visited by the last search, for the cap test (never over 40 817). */
export let lastSearchCells = 0;

/**
 * The cells from `from` to the first goal cell reached, start and goal included, or null when there is no path.
 * Goals are stand cells; the first one the search reaches is the nearest by path.
 */
export function findMolePath(world: World, from: Cell, goals: readonly Cell[], options: PathOptions): Cell[] | null {
  void [world, from, goals, options];
  lastSearchCells = 0;
  return null;
}
