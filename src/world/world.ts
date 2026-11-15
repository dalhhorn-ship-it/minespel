import { AIR } from './blocks';
import {
  CELL_COUNT, CURRENT_TERRAIN_VERSION, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, type TerrainVersion,
} from './terrain';
import { startWorld } from './terrain-v3';

/**
 * The voxel world: a flat block array plus the diff against the fixed start world.
 * The start world is terrain version 3 (the big world), so a new game and "Wereld opnieuw beginnen" get it.
 */
export class World {
  private readonly blocks: Uint8Array;
  private readonly start: Uint8Array;
  readonly terrainVersion: TerrainVersion;
  /**
   * The hidden cell overlay (v18, decision 135): cells Klodder has nibbled. They read as air but the block stays in
   * `blocks`, so `diff()` and the save never see them. Never saved, never emits `changed`.
   */
  private readonly hidden = new Set<number>();
  /**
   * Every index that was written with a new block by `set` or `applyDiff` since the last `reset`: `diff()` only
   * looks at these (V15b fast diff). `isTouched` is a flag per cell, `touched` the list, so a write costs a few
   * array accesses and a save costs the changes, not 1.3 million cells.
   */
  private readonly isTouched = new Uint8Array(CELL_COUNT);
  private touched: number[] = [];

  constructor(seed: number = WORLD_SEED) {
    this.terrainVersion = CURRENT_TERRAIN_VERSION;
    // The cached start world is read only: it is never written, `blocks` is the copy that changes.
    this.start = startWorld(seed);
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
    const i = cellIndex(x, y, z);
    if (this.hidden.size > 0 && this.hidden.has(i)) return AIR;
    return this.blocks[i] ?? AIR;
  }

  /** Hides a cell (it reads air). False when out of bounds or already hidden. Never saved, never emits `changed`. */
  hide(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = cellIndex(x, y, z);
    if (this.hidden.has(i)) return false;
    this.hidden.add(i);
    return true;
  }

  /** Shows a hidden cell again. False when it was not hidden. */
  unhide(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    return this.hidden.delete(cellIndex(x, y, z));
  }

  isHidden(x: number, y: number, z: number): boolean {
    return this.inBounds(x, y, z) && this.hidden.has(cellIndex(x, y, z));
  }

  hiddenCount(): number {
    return this.hidden.size;
  }

  /** Every hidden cell in the order it was hidden. */
  hiddenCells(): { x: number; y: number; z: number }[] {
    return [...this.hidden].map((i) => {
      const x = i % WORLD_SIZE;
      const z = Math.floor(i / WORLD_SIZE) % WORLD_SIZE;
      return { x, y: Math.floor(i / (WORLD_SIZE * WORLD_SIZE)), z };
    });
  }

  /** True when the real block (hidden or not) equals the start world. Out of bounds counts as unchanged. */
  isUnchanged(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return true;
    const i = cellIndex(x, y, z);
    return this.blocks[i] === this.start[i];
  }

  /** Sets a block. Returns false when out of bounds. Rules (oersteen, reach) live in build.ts. */
  set(x: number, y: number, z: number, id: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const i = cellIndex(x, y, z);
    if (this.blocks[i] !== id) {
      this.blocks[i] = id;
      this.touch(i);
    }
    // The kid's block wins over a nibble.
    if (this.hidden.size > 0) this.hidden.delete(i);
    return true;
  }

  /** Changed cells as `cellIndex * 256 + blockId`, in cell order. */
  diff(): Uint32Array {
    const out: number[] = [];
    for (const i of Uint32Array.from(this.touched).sort()) {
      const b = this.blocks[i] ?? 0;
      if (b !== this.start[i]) out.push(i * 256 + b);
    }
    return Uint32Array.from(out);
  }

  /** Puts the start world back, then applies a diff. Entries out of range are ignored. */
  applyDiff(diff: ArrayLike<number>): void {
    this.hidden.clear();
    this.clearTouched();
    this.blocks.set(this.start);
    for (let k = 0; k < diff.length; k++) {
      const entry = diff[k] ?? 0;
      const index = Math.floor(entry / 256);
      if (index >= 0 && index < CELL_COUNT) {
        this.blocks[index] = entry % 256;
        this.touch(index);
      }
    }
  }

  /** Back to the start world. */
  reset(): void {
    this.hidden.clear();
    this.clearTouched();
    this.blocks.set(this.start);
  }

  private touch(i: number): void {
    if (this.isTouched[i] === 0) {
      this.isTouched[i] = 1;
      this.touched.push(i);
    }
  }

  private clearTouched(): void {
    if (this.touched.length > CELL_COUNT / 8) this.isTouched.fill(0);
    else for (const i of this.touched) this.isTouched[i] = 0;
    this.touched = [];
  }

  static fromDiff(diff: ArrayLike<number>, seed: number = WORLD_SEED): World {
    const w = new World(seed);
    w.applyDiff(diff);
    return w;
  }
}
