import { AIR } from './blocks';
import { CELL_COUNT, CHUNK_SIZE, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain } from './terrain';

const CHUNKS_PER_SIDE = WORLD_SIZE / CHUNK_SIZE;

/** The voxel world: a flat block array plus the diff against the fixed start world. */
export class World {
  private readonly blocks: Uint8Array;
  private readonly start: Uint8Array;
  private readonly chunkTop: Int16Array;

  constructor(seed: number = WORLD_SEED) {
    this.start = generateTerrain(seed);
    this.blocks = this.start.slice();
    this.chunkTop = new Int16Array(CHUNKS_PER_SIDE * CHUNKS_PER_SIDE);
    this.recomputeAllChunkTops();
  }

  private scanChunkTop(cx: number, cz: number, fromY: number = WORLD_HEIGHT - 1): number {
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    for (let y = fromY; y >= 0; y--) {
      for (let z = z0; z < z0 + CHUNK_SIZE; z++) {
        for (let x = x0; x < x0 + CHUNK_SIZE; x++) {
          if (this.blocks[cellIndex(x, y, z)] !== AIR) return y;
        }
      }
    }
    return -1;
  }

  private recomputeAllChunkTops(): void {
    for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) {
      for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
        this.chunkTop[cz * CHUNKS_PER_SIDE + cx] = this.scanChunkTop(cx, cz);
      }
    }
  }

  /** Highest y index in chunk (cx, cz) with a non-air block, or -1 when all air. */
  highestNonAirY(cx: number, cz: number): number {
    if (cx < 0 || cz < 0 || cx >= CHUNKS_PER_SIDE || cz >= CHUNKS_PER_SIDE) return -1;
    return this.chunkTop[cz * CHUNKS_PER_SIDE + cx] ?? -1;
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
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const ci = cz * CHUNKS_PER_SIDE + cx;
    const cur = this.chunkTop[ci] ?? -1;
    if (id !== AIR) {
      if (y > cur) this.chunkTop[ci] = y;
    } else if (y === cur) {
      this.chunkTop[ci] = this.scanChunkTop(cx, cz, y);
    }
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
    this.recomputeAllChunkTops();
  }

  /** Back to the start world. */
  reset(): void {
    this.blocks.set(this.start);
    this.recomputeAllChunkTops();
  }

  static fromDiff(diff: ArrayLike<number>, seed: number = WORLD_SEED): World {
    const w = new World(seed);
    w.applyDiff(diff);
    return w;
  }
}
