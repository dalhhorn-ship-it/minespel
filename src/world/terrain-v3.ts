import { createRng, type Rng } from '../core/rng';
import {
  AARDE, AIR, BLADEREN, BOOMSTAM, GRAS, KEISTEEN, OERSTEEN, STEEN, VEIN_BLOCKS, WAARSCHUWSTEEN, ZAND, isSolid,
} from './blocks';
import { LEGACY_HEIGHT, LEGACY_SIZE, generateLegacyTerrain, legacyCellIndex } from './terrain-legacy';
import { MOVE, moveSite } from './village-layout';

// Terrain version 3 (v15, decisions 124, 137, 138): 128 x 128 x 80. The middle is the legacy version 2 world copied
// cell for cell (moved by MOVE), with deep ground under it and new land around it. Pure and seeded.

export { MOVE, moveSite };

export const V3_SIZE = 128;
export const V3_HEIGHT = 80;

/** Index of a cell in a version 3 block array. */
export function v3CellIndex(x: number, y: number, z: number): number {
  return (y * V3_SIZE + z) * V3_SIZE + x;
}

const V3_CELL_COUNT = V3_SIZE * V3_HEIGHT * V3_SIZE;
/** The middle columns in x and z: 32 to 95. */
const MID_FIRST = MOVE.x;
const MID_LAST = MOVE.x + LEGACY_SIZE - 1;
const MAX_GROUND = V3_HEIGHT - 12;
const MIN_GROUND = 13;

const isTree = (b: number): boolean => b === BOOMSTAM || b === BLADEREN;

/** Distance outside the middle along the larger axis. 0 inside the middle. */
function outsideDistance(x: number, z: number): number {
  const dx = Math.max(0, MID_FIRST - x, x - MID_LAST);
  const dz = Math.max(0, MID_FIRST - z, z - MID_LAST);
  return Math.max(dx, dz);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Step 1: the deep ground in every column. */
function fillDeep(blocks: Uint8Array, rng: Rng): void {
  for (let z = 0; z < V3_SIZE; z++) {
    for (let x = 0; x < V3_SIZE; x++) {
      blocks[v3CellIndex(x, 0, z)] = OERSTEEN;
      for (let y = 1; y <= 9; y++) {
        if (y === 5) blocks[v3CellIndex(x, y, z)] = WAARSCHUWSTEEN;
        else blocks[v3CellIndex(x, y, z)] = rng.next() < 0.06 ? KEISTEEN : STEEN;
      }
    }
  }
}

/** Step 2: the legacy version 2 world, moved. Legacy oersteen at y 0 becomes steen. */
function copyMiddle(blocks: Uint8Array, seed: number): void {
  const legacy = generateLegacyTerrain(seed, 2);
  for (let y = 0; y < LEGACY_HEIGHT; y++) {
    for (let z = 0; z < LEGACY_SIZE; z++) {
      for (let x = 0; x < LEGACY_SIZE; x++) {
        const b = legacy[legacyCellIndex(x, y, z)] ?? AIR;
        blocks[v3CellIndex(x + MOVE.x, y + MOVE.y, z + MOVE.z)] = y === 0 && b === OERSTEEN ? STEEN : b;
      }
    }
  }
}

/** Ground of a column: the highest solid block that is not a tree block. */
function groundAt(blocks: Uint8Array, x: number, z: number): number {
  for (let y = V3_HEIGHT - 1; y > 0; y--) {
    const b = blocks[v3CellIndex(x, y, z)] ?? AIR;
    if (b !== AIR && isSolid(b) && !isTree(b)) return y;
  }
  return 0;
}

/** Step 3: heights of the new land. Returns a height per column (middle columns hold their ground). */
function newLandHeights(blocks: Uint8Array, rng: Rng): Int32Array {
  const height = new Int32Array(V3_SIZE * V3_SIZE);
  const at = (x: number, z: number): number => z * V3_SIZE + x;

  const hills = Array.from({ length: 30 }, () => ({
    x: rng.int(0, V3_SIZE - 1),
    z: rng.int(0, V3_SIZE - 1),
    r: rng.int(6, 14),
    h: rng.int(2, 5),
  }));
  const hillAt = (x: number, z: number): number => {
    let h = 20;
    for (const hill of hills) {
      const d = Math.hypot(x - hill.x, z - hill.z);
      if (d < hill.r) {
        const t = 1 - d / hill.r;
        h += Math.round(hill.h * t * t * (3 - 2 * t));
      }
    }
    return h;
  };

  const middleGround = new Int32Array(V3_SIZE * V3_SIZE);
  for (let z = MID_FIRST; z <= MID_LAST; z++) {
    for (let x = MID_FIRST; x <= MID_LAST; x++) middleGround[at(x, z)] = groundAt(blocks, x, z);
  }

  for (let z = 0; z < V3_SIZE; z++) {
    for (let x = 0; x < V3_SIZE; x++) {
      const d = outsideDistance(x, z);
      if (d === 0) {
        height[at(x, z)] = middleGround[at(x, z)] ?? 0;
        continue;
      }
      const edge = middleGround[at(clamp(x, MID_FIRST, MID_LAST), clamp(z, MID_FIRST, MID_LAST))] ?? 20;
      const w = clamp((d - 1) / 10, 0, 1);
      height[at(x, z)] = clamp(Math.round((1 - w) * edge + w * hillAt(x, z)), MIN_GROUND, MAX_GROUND);
    }
  }

  // Clamp passes until nothing changes: 1 from a middle neighbour, 2 from a new land neighbour.
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  for (let pass = 0; pass < 200; pass++) {
    let changed = false;
    for (let z = 0; z < V3_SIZE; z++) {
      for (let x = 0; x < V3_SIZE; x++) {
        if (outsideDistance(x, z) === 0) continue;
        let h = height[at(x, z)] ?? 0;
        for (const [dx, dz] of dirs) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx < 0 || nz < 0 || nx >= V3_SIZE || nz >= V3_SIZE) continue;
          const n = height[at(nx, nz)] ?? 0;
          const slack = outsideDistance(nx, nz) === 0 ? 1 : 2;
          h = clamp(h, n - slack, n + slack);
        }
        if (h !== height[at(x, z)]) {
          height[at(x, z)] = h;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  return height;
}

/** Fills the new land columns from the height map, with the sand patches. */
function fillNewLand(blocks: Uint8Array, height: Int32Array, rng: Rng): void {
  const sand: { x: number; z: number; r: number }[] = [];
  while (sand.length < 15) {
    const x = rng.int(0, V3_SIZE - 1);
    const z = rng.int(0, V3_SIZE - 1);
    const r = rng.int(3, 6);
    if (outsideDistance(x, z) > 0) sand.push({ x, z, r });
  }
  const isSand = (x: number, z: number): boolean => sand.some((s) => Math.hypot(x - s.x, z - s.z) < s.r);

  for (let z = 0; z < V3_SIZE; z++) {
    for (let x = 0; x < V3_SIZE; x++) {
      if (outsideDistance(x, z) === 0) continue;
      const top = height[z * V3_SIZE + x] ?? MIN_GROUND;
      const sandy = isSand(x, z);
      for (let y = 10; y <= top; y++) {
        let id: number;
        if (y === top) id = sandy ? ZAND : GRAS;
        else if (y >= top - 2) id = sandy ? ZAND : AARDE;
        else id = rng.next() < 0.06 ? KEISTEEN : STEEN;
        blocks[v3CellIndex(x, y, z)] = id;
      }
    }
  }
}

/** Step 4: trees with the legacy recipe, on new land gras only, so no leaf reaches the middle. */
function plantTrees(blocks: Uint8Array, height: Int32Array, rng: Rng): void {
  let planted = 0;
  for (let attempt = 0; attempt < 1000 && planted < 80; attempt++) {
    const x = rng.int(3, V3_SIZE - 4);
    const z = rng.int(3, V3_SIZE - 4);
    const trunk = rng.int(4, 5);
    if (outsideDistance(x, z) < 3) continue;
    const top = height[z * V3_SIZE + x] ?? 0;
    if (blocks[v3CellIndex(x, top, z)] !== GRAS) continue;
    planted++;
    for (let i = 1; i <= trunk; i++) blocks[v3CellIndex(x, top + i, z)] = BOOMSTAM;
    const crown = top + trunk;
    for (let dy = -1; dy <= 2; dy++) {
      const r = dy >= 1 ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          const cx = x + dx;
          const cz = z + dz;
          const cy = crown + dy;
          if (cx < 0 || cz < 0 || cx >= V3_SIZE || cz >= V3_SIZE || cy >= V3_HEIGHT) continue;
          const i = v3CellIndex(cx, cy, cz);
          if (blocks[i] === AIR) blocks[i] = BLADEREN;
        }
      }
    }
  }
}

const NEIGHBOURS_6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;

/** Step 5: 3 veins of 3 to 6 touching cells for each vein id, inside y 1 to 4. No two veins touch, not even diagonally. */
function plantVeins(blocks: Uint8Array, rng: Rng): void {
  const taken = new Set<number>();
  const touchesOther = (cells: readonly number[]): boolean => {
    const own = new Set(cells);
    for (const c of cells) {
      const x = c % V3_SIZE;
      const z = Math.floor(c / V3_SIZE) % V3_SIZE;
      const y = Math.floor(c / (V3_SIZE * V3_SIZE));
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            const n = v3CellIndex(x + dx, y + dy, z + dz);
            if (!own.has(n) && taken.has(n)) return true;
          }
    }
    return false;
  };

  for (const id of VEIN_BLOCKS) {
    for (let v = 0; v < 3; v++) {
      const size = rng.int(3, 6);
      for (let attempt = 0; attempt < 500; attempt++) {
        const start = [rng.int(1, V3_SIZE - 2), rng.int(1, 4), rng.int(1, V3_SIZE - 2)] as [number, number, number];
        const cells: [number, number, number][] = [start];
        for (let guard = 0; cells.length < size && guard < 100; guard++) {
          const from = cells[rng.int(0, cells.length - 1)] as [number, number, number];
          const d = NEIGHBOURS_6[rng.int(0, 5)] as readonly [number, number, number];
          const c: [number, number, number] = [from[0] + d[0], from[1] + d[1], from[2] + d[2]];
          if (c[0] < 0 || c[0] >= V3_SIZE || c[2] < 0 || c[2] >= V3_SIZE || c[1] < 1 || c[1] > 4) continue;
          if (cells.some((o) => o[0] === c[0] && o[1] === c[1] && o[2] === c[2])) continue;
          cells.push(c);
        }
        if (cells.length < size) continue;
        const idx = cells.map((c) => v3CellIndex(c[0], c[1], c[2]));
        if (touchesOther(idx)) continue;
        for (const i of idx) {
          blocks[i] = id;
          taken.add(i);
        }
        break;
      }
    }
  }
}

/** Builds the version 3 world. Uncached: used by the determinism test. */
export function buildTerrainV3(seed: number): Uint8Array {
  const blocks = new Uint8Array(V3_CELL_COUNT);
  const rng = createRng(seed + 3);
  fillDeep(blocks, rng);
  copyMiddle(blocks, seed);
  const height = newLandHeights(blocks, rng);
  fillNewLand(blocks, height, rng);
  plantTrees(blocks, height, rng);
  plantVeins(blocks, rng);
  return blocks;
}

const cache = new Map<number, Uint8Array>();

/** The cached version 3 start world per seed. Read only: never write to it, copy it first. */
export function startWorld(seed: number): Uint8Array {
  let w = cache.get(seed);
  if (!w) {
    w = buildTerrainV3(seed);
    cache.set(seed, w);
  }
  return w;
}
