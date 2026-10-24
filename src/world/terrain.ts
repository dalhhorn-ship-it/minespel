import { createRng } from '../core/rng';
import { AARDE, AIR, BLADEREN, BOOMSTAM, GRAS, KEISTEEN, OBSIDIAAN, OERSTEEN, STEEN, VUURSTEEN, ZAND } from './blocks';
import { VILLAGE_SITES, houseCells, siteRegion, type VillageSite } from './village-layout';

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

const MID = Math.floor(WORLD_SIZE / 2);
const BASE_HEIGHT = 10;
/** Radius around the start spot kept flat and free of trees. */
const CLEAR_RADIUS = 4;

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

/**
 * Terrain versions. 1 is the world of 0.4.0 and earlier, byte for byte. 2 is version 1 plus the villages (v11).
 * A saved world records its version; a missing version means 1.
 */
export type TerrainVersion = 1 | 2;
export const CURRENT_TERRAIN_VERSION: TerrainVersion = 2;

/**
 * Builds the fixed start world. Pure: the same seed and version always give the same blocks.
 * Version 2 only adds the village stamp on top of version 1 and never draws a random number.
 */
export function generateTerrain(seed: number = WORLD_SEED, version: TerrainVersion = CURRENT_TERRAIN_VERSION): Uint8Array {
  const blocks = generateV1(seed);
  if (version === 2) stampVillages(blocks, VILLAGE_SITES);
  return blocks;
}

/**
 * Stamps village sites into a block array, changing only cells inside each site (rectangle plus margin):
 * a flat grass pad at `padY` with aarde under it, nothing above it (trees cleared), then the houses.
 */
export function stampVillages(blocks: Uint8Array, sites: readonly VillageSite[]): void {
  for (const site of sites) {
    const r = siteRegion(site);
    for (let z = Math.max(0, r.z0); z <= Math.min(WORLD_SIZE - 1, r.z1); z++) {
      for (let x = Math.max(0, r.x0); x <= Math.min(WORLD_SIZE - 1, r.x1); x++) {
        for (let y = 1; y < WORLD_HEIGHT; y++) {
          const i = cellIndex(x, y, z);
          if (y > site.padY) blocks[i] = AIR;
          else if (y === site.padY) blocks[i] = GRAS;
          else if (y >= site.padY - 2) blocks[i] = AARDE;
          else {
            const b = blocks[i] ?? AIR;
            if (b === AIR || b === BOOMSTAM || b === BLADEREN) blocks[i] = AARDE;
          }
        }
      }
    }
    for (const c of houseCells(site)) blocks[cellIndex(c.x, c.y, c.z)] = c.id;
  }
}

/** The world of 0.4.0. Never add, move or remove an rng call here: old saves are diffs against it. */
function generateV1(seed: number): Uint8Array {
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
      const top = Math.min(height[z * WORLD_SIZE + x] ?? BASE_HEIGHT, WORLD_HEIGHT - 8);
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

  // CR2: Four blocks of obsidian on the ground in front of the start spot to build a gate (plus flanking stones).
  const gateZ = MID + 3;
  const gateY = height[gateZ * WORLD_SIZE + MID] ?? startH;
  for (let gx = MID - 1; gx <= MID + 2; gx++) {
    blocks[cellIndex(gx, gateY, gateZ)] = OBSIDIAAN;
  }
  blocks[cellIndex(MID - 2, gateY, gateZ)] = STEEN;
  blocks[cellIndex(MID + 3, gateY, gateZ)] = VUURSTEEN;

  // Trees: trunk of 4 or 5, a ball of leaves. Kept inside the world and away from the start.
  let planted = 0;
  for (let attempt = 0; attempt < 200 && planted < 28; attempt++) {
    const x = rng.int(3, WORLD_SIZE - 4);
    const z = rng.int(3, WORLD_SIZE - 4);
    const trunk = rng.int(4, 5);
    if (Math.hypot(x - MID, z - MID) <= CLEAR_RADIUS + 3) continue;
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
