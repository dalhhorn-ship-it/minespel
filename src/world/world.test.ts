import { describe, expect, it } from 'vitest';
import { AIR, GRAS, BLADEREN, BOOMSTAM, KEISTEEN, OERSTEEN, PLACEABLE_BLOCKS, ZAND, isSolid } from './blocks';
import { CELL_COUNT, START_SPOT, WORLD_HEIGHT, WORLD_SIZE, cellIndex, generateTerrain } from './terrain';
import { World } from './world';

function topSolid(w: World, x: number, z: number): number {
  for (let y = WORLD_HEIGHT - 1; y >= 0; y--) if (isSolid(w.get(x, y, z))) return y;
  return -1;
}

describe('terrain', () => {
  it('has WORLD_HEIGHT = 64, CELL_COUNT = 64 x 64 x 64, and cellIndex unchanged for y < 32 (G0)', () => {
    expect(WORLD_HEIGHT).toBe(64);
    expect(CELL_COUNT).toBe(64 * 64 * 64);
    for (let y = 0; y < 32; y++) {
      for (const z of [0, 15, 63]) {
        for (const x of [0, 31, 63]) {
          expect(cellIndex(x, y, z)).toBe((y * 64 + z) * 64 + x);
        }
      }
    }
  });

  it('generated terrain has nothing but air above the old top height 32 (G0)', () => {
    const w = new World();
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let x = 0; x < WORLD_SIZE; x++) {
        for (let y = 32; y < WORLD_HEIGHT; y++) {
          expect(w.get(x, y, z)).toBe(AIR);
        }
      }
    }
  });

  it('is the same for the same seed and differs for another', () => {
    expect(generateTerrain(5)).toEqual(generateTerrain(5));
    expect(generateTerrain(5)).not.toEqual(generateTerrain(6));
    expect(generateTerrain().length).toBe(CELL_COUNT);
    expect(CELL_COUNT).toBe(WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE);
  });

  it('has oersteen on y = 0 everywhere and nowhere else', () => {
    const w = new World();
    let other = 0;
    for (let z = 0; z < WORLD_SIZE; z++)
      for (let x = 0; x < WORLD_SIZE; x++) {
        expect(w.get(x, 0, z)).toBe(OERSTEEN);
        for (let y = 1; y < WORLD_HEIGHT; y++) if (w.get(x, y, z) === OERSTEEN) other++;
      }
    expect(other).toBe(0);
  });

  it('has the expected kinds of ground', () => {
    const counts = new Map<number, number>();
    for (const b of generateTerrain()) counts.set(b, (counts.get(b) ?? 0) + 1);
    for (const id of [GRAS, ZAND, BOOMSTAM, BLADEREN, KEISTEEN]) expect(counts.get(id) ?? 0).toBeGreaterThan(0);
  });

  it('has gentle hills (not flat, not steep)', () => {
    const w = new World();
    const heights: number[] = [];
    for (let z = 0; z < WORLD_SIZE; z++) for (let x = 0; x < WORLD_SIZE; x++) heights.push(topSolid(w, x, z));
    expect(Math.max(...heights)).toBeGreaterThan(Math.min(...heights));
    expect(Math.max(...heights)).toBeLessThan(WORLD_HEIGHT - 1);
  });

  it('puts the start spot on the ground in the middle with air above', () => {
    const w = new World();
    const x = Math.floor(START_SPOT.x);
    const z = Math.floor(START_SPOT.z);
    expect(x).toBe(Math.floor(WORLD_SIZE / 2));
    expect(isSolid(w.get(x, START_SPOT.y - 1, z))).toBe(true);
    expect(w.get(x, START_SPOT.y, z)).toBe(AIR);
    expect(w.get(x, START_SPOT.y + 1, z)).toBe(AIR);
  });
});

describe('World', () => {
  it('two worlds from the same seed are equal', () => {
    expect(new World().diff()).toEqual(new World().diff());
    expect(new World().diff()).toHaveLength(0);
  });

  it('all 32 placeable blocks can be set and read back', () => {
    const w = new World();
    expect(PLACEABLE_BLOCKS).toHaveLength(32);
    PLACEABLE_BLOCKS.forEach((id, i) => {
      expect(w.set(i, WORLD_HEIGHT - 1, 0, id)).toBe(true);
      expect(w.get(i, WORLD_HEIGHT - 1, 0)).toBe(id);
    });
  });

  it('reads air and refuses writes outside the world', () => {
    const w = new World();
    expect(w.get(-1, 5, 0)).toBe(AIR);
    expect(w.get(0, WORLD_HEIGHT, 0)).toBe(AIR);
    expect(w.get(WORLD_SIZE, 5, 0)).toBe(AIR);
    expect(w.set(WORLD_SIZE, 5, 0, GRAS)).toBe(false);
    expect(w.set(0, -1, 0, GRAS)).toBe(false);
    expect(w.diff()).toHaveLength(0);
  });

  it('diff round trip: changes survive, other cells stay', () => {
    const w = new World();
    const top = topSolid(w, 10, 10);
    w.set(10, top, 10, AIR);
    w.set(10, top + 1, 10, PLACEABLE_BLOCKS[5] ?? GRAS);
    w.set(WORLD_SIZE - 1, WORLD_HEIGHT - 1, WORLD_SIZE - 1, PLACEABLE_BLOCKS[15] ?? GRAS);
    const diff = w.diff();
    expect(diff).toHaveLength(3);

    const copy = World.fromDiff(diff);
    expect(copy.diff()).toEqual(diff);
    expect(copy.get(10, top, 10)).toBe(AIR);
    expect(copy.get(10, top + 1, 10)).toBe(PLACEABLE_BLOCKS[5]);
    expect(copy.get(WORLD_SIZE - 1, WORLD_HEIGHT - 1, WORLD_SIZE - 1)).toBe(PLACEABLE_BLOCKS[15]);
    expect(copy.get(20, 3, 20)).toBe(w.get(20, 3, 20));
  });

  it('a change set back to the start block is not in the diff', () => {
    const w = new World();
    const top = topSolid(w, 12, 12);
    const original = w.get(12, top, 12);
    w.set(12, top, 12, AIR);
    expect(w.diff()).toHaveLength(1);
    w.set(12, top, 12, original);
    expect(w.diff()).toHaveLength(0);
  });

  it('applyDiff replaces earlier edits, reset goes back to the start', () => {
    const w = new World();
    w.set(1, WORLD_HEIGHT - 1, 1, GRAS);
    w.applyDiff([]);
    expect(w.get(1, WORLD_HEIGHT - 1, 1)).toBe(AIR);
    w.set(1, WORLD_HEIGHT - 1, 1, GRAS);
    w.reset();
    expect(w.diff()).toHaveLength(0);
  });

  it('ignores diff entries outside the world', () => {
    const w = new World();
    w.applyDiff([CELL_COUNT * 256 + 3]);
    expect(w.diff()).toHaveLength(0);
  });

  it('diff entries fit in a Uint32', () => {
    expect(CELL_COUNT * 256).toBeLessThan(2 ** 32);
  });
});
