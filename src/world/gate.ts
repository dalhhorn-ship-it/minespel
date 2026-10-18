// The obsidiaan gate (PRD 4.20). Pure rule: which empty cells of the opening should fill with vuur.
// Only one fixed spot works as a gate. A frame built anywhere else is just blocks.
import { OBSIDIAAN, VUUR, AIR } from './blocks';
import type { Box, IsOccupied } from './build';
import { GATE_FLOOR_X, GATE_Z, GROUND_Y, WORLD_HEIGHT } from './terrain';
import type { World } from './world';

export { GATE_FLOOR_X, GATE_Z };

export interface Cell {
  x: number;
  y: number;
  z: number;
}

/** Pillars at least this high (from G+1) complete the frame. */
export const MIN_PILLAR = 2;

/** True when a cell is in one of the 4 gate columns (cheap check for the build controller). */
export function isGateColumn(x: number, z: number): boolean {
  return z === GATE_Z && GATE_FLOOR_X.includes(x);
}

function pillarHeight(world: World, x: number): number {
  let h = 0;
  while (GROUND_Y + 1 + h < WORLD_HEIGHT && world.get(x, GROUND_Y + 1 + h, GATE_Z) === OBSIDIAAN) h++;
  return h;
}

/**
 * The cells to fill with vuur now. Empty list unless the frame is complete and at least one
 * opening cell already holds vuur. Cells that hold another block, or where `isOccupied` says
 * someone stands (player, dino, chicken, egg), are left out.
 */
export function gateFill(world: World, isOccupied: IsOccupied = () => false): Cell[] {
  for (const x of GATE_FLOOR_X) if (world.get(x, GROUND_Y, GATE_Z) !== OBSIDIAAN) return [];
  const first = GATE_FLOOR_X[0]!;
  const last = GATE_FLOOR_X[3]!;
  const height = Math.min(pillarHeight(world, first), pillarHeight(world, last));
  if (height < MIN_PILLAR) return [];

  const opening: Cell[] = [];
  for (const x of [GATE_FLOOR_X[1]!, GATE_FLOOR_X[2]!]) {
    for (let y = GROUND_Y + 1; y <= GROUND_Y + height; y++) opening.push({ x, y, z: GATE_Z });
  }
  if (!opening.some((c) => world.get(c.x, c.y, c.z) === VUUR)) return [];
  return opening.filter((c) => {
    if (world.get(c.x, c.y, c.z) !== AIR) return false;
    const box: Box = [c.x, c.y, c.z, c.x + 1, c.y + 1, c.z + 1];
    return !isOccupied(box);
  });
}
