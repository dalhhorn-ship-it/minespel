// A flat seeded map for the teasing tests (v18, AC220, AC221): a pen, a cliff of 4, a pond, a deep hole, a walled in
// cell and a sealed cell. Ground is stone up to y = FLOOR, so animals stand at feet y = GY. Plain data, no random.
import { AIR, LAVA, STEEN, WATER } from '../../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../../src/world/terrain';
import { World } from '../../../src/world/world';

export const FLOOR = 10;
export const GY = FLOOR + 1;
/** The plateau starts at this x: a straight cliff of CLIFF_DROP blocks on its west side, for z from 30 to 60. */
export const CLIFF_X = 36;
export const CLIFF_DROP = 4;

export interface TeaseMap {
  world: World;
  /** Feet spots (x, z) for animals, by place. */
  spots: {
    open: { x: number; z: number }[];
    pen: { x: number; z: number }[];
    /** On the plateau, next to the cliff edge. */
    cliffTop: { x: number; z: number };
    /** On the low ground right under the cliff wall. */
    cliffFoot: { x: number; z: number };
    pond: { x: number; z: number };
    hole: { x: number; z: number };
    walled: { x: number; z: number };
    sealed: { x: number; z: number };
    corner: { x: number; z: number };
    lava: { x: number; z: number };
  };
}

function box(w: World, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, id: number): void {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) w.set(x, y, z, id);
}

/** A ring of walls (`height` blocks high) around the inside x0..x1, z0..z1. */
function ring(w: World, x0: number, x1: number, z0: number, z1: number, height: number): void {
  for (let y = GY; y < GY + height; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) { w.set(x, y, z0 - 1, STEEN); w.set(x, y, z1 + 1, STEEN); }
    for (let z = z0 - 1; z <= z1 + 1; z++) { w.set(x0 - 1, y, z, STEEN); w.set(x1 + 1, y, z, STEEN); }
  }
}

export function buildTeaseMap(): TeaseMap {
  const world = new World();
  box(world, 0, WORLD_SIZE - 1, 0, WORLD_SIZE - 1, 0, FLOOR, STEEN);
  box(world, 0, WORLD_SIZE - 1, 0, WORLD_SIZE - 1, FLOOR + 1, WORLD_HEIGHT - 1, AIR);
  // The plateau: a cliff of 4 on its west side.
  box(world, CLIFF_X, WORLD_SIZE - 1, 30, 60, FLOOR + 1, FLOOR + CLIFF_DROP, STEEN);
  // The pond: 2 deep, 7 wide.
  box(world, 10, 16, 40, 46, FLOOR - 1, FLOOR, WATER);
  // A deep hole: 3 wide, 5 deep.
  box(world, 20, 22, 40, 42, FLOOR - 4, FLOOR, AIR);
  // A lava pool.
  box(world, 24, 28, 50, 54, FLOOR, FLOOR, LAVA);
  // The pen: 8 by 8 inside, walls 2 high, closed all round.
  ring(world, 20, 27, 20, 27, 2);
  // A walled in cell (open top, walls 2 high) and a sealed cell (walls and a ceiling).
  ring(world, 50, 52, 10, 12, 2);
  ring(world, 50, 52, 20, 22, 2);
  box(world, 49, 53, 19, 23, GY + 2, GY + 2, STEEN);
  return {
    world,
    spots: {
      open: [{ x: 32.5, z: 8.5 }, { x: 36.5, z: 12.5 }, { x: 30.5, z: 14.5 }],
      pen: [{ x: 22.5, z: 22.5 }, { x: 25.5, z: 25.5 }],
      cliffTop: { x: CLIFF_X + 1.5, z: 45.5 },
      cliffFoot: { x: CLIFF_X - 1.5, z: 50.5 },
      pond: { x: 8.5, z: 43.5 },
      hole: { x: 19.5, z: 41.5 },
      walled: { x: 51.5, z: 11.5 },
      sealed: { x: 51.5, z: 21.5 },
      corner: { x: 1.5, z: 1.5 },
      lava: { x: 22.5, z: 52.5 },
    },
  };
}
