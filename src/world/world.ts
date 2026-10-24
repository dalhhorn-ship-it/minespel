import { AIR } from './blocks';
import {
  CELL_COUNT, CURRENT_TERRAIN_VERSION, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain,
  type TerrainVersion,
} from './terrain';

/**
 * The voxel world: a flat block array plus the diff against the fixed start world.
 * The start world is terrain version 2 (with the villages), so a new game and "Wereld opnieuw beginnen" get them.
 */
export class World {
  private readonly blocks: Uint8Array;
  private readonly start: Uint8Array;
  readonly terrainVersion: TerrainVersion;

  constructor(seed: number = WORLD_SEED, version: TerrainVersion = CURRENT_TERRAIN_VERSION) {
    this.terrainVersion = version;
    this.start = generateTerrain(seed, version);
    this.blocks = this.start.slice();
  }

  inBounds(x: number, y: number, z: number): boolean {
    return (
      Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) &&
      x >= 0 && y >= 0 && z >= 0 && x < WORLD_SIZE && y < WORLD_HEIGHT && z < WORLD_SIZE
    );
  }

  /** Block id at a cell. Outside the world is air. */
  get(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return AIR;
    return this.blocks[cellIndex(x, y, z)] ?? AIR;
  }

  /** Sets a block. Returns false when out of bounds. Rules (oersteen, reach) live in build.ts. */
  set(x: number, y: number, z: number, id: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    this.blocks[cellIndex(x, y, z)] = id;
    return true;
  }

  /** Changed cells as `cellIndex * 256 + blockId`, in cell order. */
  diff(): Uint32Array {
    const out: number[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      const b = this.blocks[i] ?? 0;
      if (b !== this.start[i]) out.push(i * 256 + b);
    }
    return Uint32Array.from(out);
  }

  /** Puts the start world back, then applies a diff. Entries out of range are ignored. */
  applyDiff(diff: ArrayLike<number>): void {
    this.blocks.set(this.start);
    for (let k = 0; k < diff.length; k++) {
      const entry = diff[k] ?? 0;
      const index = Math.floor(entry / 256);
      if (index >= 0 && index < CELL_COUNT) this.blocks[index] = entry % 256;
    }
  }

  /** Back to the start world. */
  reset(): void {
    this.blocks.set(this.start);
  }

  static fromDiff(diff: ArrayLike<number>, seed: number = WORLD_SEED): World {
    const w = new World(seed);
    w.applyDiff(diff);
    return w;
  }
}
