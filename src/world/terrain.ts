import { createRng } from '../core/rng';
import { AARDE, AIR, BLADEREN, BOOMSTAM, GRAS, KEISTEEN, OBSIDIAAN, OERSTEEN, STEEN, ZAND } from './blocks';

/** Blocks wide and deep. The speed spike may change this to 48. Tests read this constant. */
export const WORLD_SIZE = 64;
export const WORLD_HEIGHT = 64;
export const CHUNK_SIZE = 16;
export const WORLD_SEED = 20261017;

/** Index of a cell in the flat block array. */
export function cellIndex(x: number, y: number, z: number): number {
  return (y * WORLD_SIZE + z) * WORLD_SIZE + x;
}

export const CELL_COUNT = WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE;

export const MID = Math.floor(WORLD_SIZE / 2);
const BASE_HEIGHT = 10;
/** Radius around the start spot kept flat and free of trees. */
const CLEAR_RADIUS = 4;

/**
 * The obsidiaan gate spot (4.20). Yaw 0 looks toward +z, so the kid's right is -x.
 * F1 to F4 run left to right at x MID+1, MID, MID-1, MID-2, all at z GATE_Z, flush with the ground.
 */
export const GATE_Z = MID + 4;
export const GATE_FLOOR_X: readonly number[] = [MID + 1, MID, MID - 1, MID - 2];
/** The rectangle flattened and kept free of trees around the gate. */
const GATE_AREA = { x0: MID - 3, x1: MID + 2, z0: MID + 3, z1: MID + 5 };
const inGateArea = (x: number, z: number): boolean =>
  x >= GATE_AREA.x0 && x <= GATE_AREA.x1 && z >= GATE_AREA.z0 && z <= GATE_AREA.z1;
/** Cap on the ground height, so hills never reach the top of the world. */
const MAX_GROUND = 24;

/** Averages each column with its neighbours so hills are gentle. */
function smoothHeight(rawHeights: Int32Array): Int32Array {
  const out = new Int32Array(rawHeights.length);
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      let sum = 0;
      let n = 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const zz = z + dz;
          if (xx < 0 || zz < 0 || xx >= WORLD_SIZE || zz >= WORLD_SIZE) continue;
          sum += rawHeights[zz * WORLD_SIZE + xx] ?? 0;
          n++;
        }
      }
      out[z * WORLD_SIZE + x] = Math.round(sum / n);
    }
  }
  return out;
}

/** Builds the fixed start world. Pure: the same seed always gives the same blocks. */
export function generateTerrain(seed: number = WORLD_SEED): Uint8Array {
  const rng = createRng(seed);
  const blocks = new Uint8Array(CELL_COUNT);

  // A few soft bumps (hills) added to a flat base.
  const hills = Array.from({ length: 10 }, () => ({
    x: rng.int(0, WORLD_SIZE - 1),
    z: rng.int(0, WORLD_SIZE - 1),
    r: rng.int(6, 14),
    h: rng.int(2, 5),
  }));

  const raw = new Int32Array(WORLD_SIZE * WORLD_SIZE);
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      let h = BASE_HEIGHT + rng.int(-1, 0);
      for (const hill of hills) {
        const d = Math.hypot(x - hill.x, z - hill.z);
        if (d < hill.r) {
          const t = 1 - d / hill.r;
          h += Math.round(hill.h * t * t * (3 - 2 * t));
        }
      }
      raw[z * WORLD_SIZE + x] = h;
    }
  }
  const height = smoothHeight(raw);

  // Flatten the start area to the height at the middle.
  const startH = height[MID * WORLD_SIZE + MID] ?? BASE_HEIGHT;
  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      if (Math.hypot(x - MID, z - MID) <= CLEAR_RADIUS) height[z * WORLD_SIZE + x] = startH;
    }
  }

  // The gate area is flat too, at the same height.
  for (let z = GATE_AREA.z0; z <= GATE_AREA.z1; z++) {
    for (let x = GATE_AREA.x0; x <= GATE_AREA.x1; x++) height[z * WORLD_SIZE + x] = startH;
  }

  // Sand patches.
  const sandSpots = Array.from({ length: 5 }, () => ({
    x: rng.int(0, WORLD_SIZE - 1),
    z: rng.int(0, WORLD_SIZE - 1),
    r: rng.int(3, 6),
  }));
  const isSand = (x: number, z: number): boolean =>
    Math.hypot(x - MID, z - MID) > CLEAR_RADIUS + 2 &&
    sandSpots.some((s) => Math.hypot(x - s.x, z - s.z) < s.r);

  for (let z = 0; z < WORLD_SIZE; z++) {
    for (let x = 0; x < WORLD_SIZE; x++) {
      const top = Math.min(height[z * WORLD_SIZE + x] ?? BASE_HEIGHT, MAX_GROUND);
      height[z * WORLD_SIZE + x] = top;
      blocks[cellIndex(x, 0, z)] = OERSTEEN;
      for (let y = 1; y <= top; y++) {
        let id: number;
        if (y === top) id = isSand(x, z) ? ZAND : GRAS;
        else if (y >= top - 2) id = isSand(x, z) ? ZAND : AARDE;
        else id = rng.next() < 0.06 ? KEISTEEN : STEEN;
        blocks[cellIndex(x, y, z)] = id;
      }
    }
  }

  // F1 to F4 of the gate: obsidiaan set into the ground, top level with the grass.
  const groundY = Math.min(startH, MAX_GROUND);
  for (const x of GATE_FLOOR_X) blocks[cellIndex(x, groundY, GATE_Z)] = OBSIDIAAN;

  // Trees: trunk of 4 or 5, a ball of leaves. Kept inside the world and away from the start.
  let planted = 0;
  for (let attempt = 0; attempt < 200 && planted < 28; attempt++) {
    const x = rng.int(3, WORLD_SIZE - 4);
    const z = rng.int(3, WORLD_SIZE - 4);
    const trunk = rng.int(4, 5);
    if (Math.hypot(x - MID, z - MID) <= CLEAR_RADIUS + 3 || inGateArea(x, z)) continue;
    const top = height[z * WORLD_SIZE + x] ?? 0;
    if (blocks[cellIndex(x, top, z)] !== GRAS) continue;
    planted++;
    for (let i = 1; i <= trunk; i++) blocks[cellIndex(x, top + i, z)] = BOOMSTAM;
    const crown = top + trunk;
    for (let dy = -1; dy <= 2; dy++) {
      const r = dy >= 1 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          const cx = x + dx;
          const cz = z + dz;
          const cy = crown + dy;
          if (cx < 0 || cz < 0 || cx >= WORLD_SIZE || cz >= WORLD_SIZE || cy >= WORLD_HEIGHT) continue;
          if (inGateArea(cx, cz)) continue;
          const i = cellIndex(cx, cy, cz);
          if (blocks[i] === AIR) blocks[i] = BLADEREN;
        }
      }
    }
  }

  return blocks;
}

/** The player starts in the middle of the world on top of the ground. Feet position. */
export const START_SPOT = (() => {
  const blocks = generateTerrain();
  let y = WORLD_HEIGHT - 1;
  while (y > 0 && blocks[cellIndex(MID, y, MID)] === AIR) y--;
  return { x: MID + 0.5, y: y + 1, z: MID + 0.5 };
})();

/** Ground height G at the start spot: the y index of the top grass block. The gate floor sits at this height. */
export const GROUND_Y = START_SPOT.y - 1;
