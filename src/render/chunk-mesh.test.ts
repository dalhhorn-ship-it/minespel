import { describe, expect, it } from 'vitest';
import { AIR, GLAS, OERSTEEN, STEEN } from '../world/blocks';
import { CHUNK_SIZE, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { CHUNKS_PER_SIDE, buildChunkData, chunksTouchedBy, toGeometry, type WorldView } from './chunk-mesh';

/** An empty world with a few blocks set. */
function emptyWorld(): WorldView & { set(x: number, y: number, z: number, id: number): void } {
  const cells = new Map<string, number>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const inBounds = (x: number, y: number, z: number) =>
    x >= 0 && y >= 0 && z >= 0 && x < WORLD_SIZE && y < WORLD_HEIGHT && z < WORLD_SIZE;
  return {
    inBounds,
    get: (x, y, z) => (inBounds(x, y, z) ? (cells.get(key(x, y, z)) ?? AIR) : AIR),
    set: (x, y, z, id) => void cells.set(key(x, y, z), id),
  };
}

describe('chunk mesher', () => {
  it('one block gives 6 faces', () => {
    const w = emptyWorld();
    w.set(5, 5, 5, STEEN);
    const d = buildChunkData(w, 0, 0);
    expect(d.faceCount).toBe(6);
    expect(d.positions.length).toBe(6 * 4 * 3);
    expect(d.indices.length).toBe(6 * 6);
  });

  it('two touching blocks give 10 faces', () => {
    const w = emptyWorld();
    w.set(5, 5, 5, STEEN);
    w.set(6, 5, 5, STEEN);
    expect(buildChunkData(w, 0, 0).faceCount).toBe(10);
  });

  it('skips the bottom of oersteen at the bottom of the world and faces to the world edge', () => {
    const w = emptyWorld();
    w.set(5, 0, 5, OERSTEEN);
    expect(buildChunkData(w, 0, 0).faceCount).toBe(5);
    const e = emptyWorld();
    e.set(0, 5, 0, STEEN);
    expect(buildChunkData(e, 0, 0).faceCount).toBe(4);
  });

  it('keeps the stone face next to glass, hides the glass face next to stone', () => {
    const w = emptyWorld();
    w.set(5, 5, 5, STEEN);
    w.set(6, 5, 5, GLAS);
    // stone 6 faces, glass 5 (its face towards stone is hidden)
    expect(buildChunkData(w, 0, 0).faceCount).toBe(11);
  });

  it('hides faces between two glass blocks', () => {
    const w = emptyWorld();
    w.set(5, 5, 5, GLAS);
    w.set(6, 5, 5, GLAS);
    expect(buildChunkData(w, 0, 0).faceCount).toBe(10);
  });

  it('builds a face on a chunk border from the neighbour chunk too', () => {
    const w = emptyWorld();
    w.set(CHUNK_SIZE - 1, 5, 5, STEEN);
    w.set(CHUNK_SIZE, 5, 5, STEEN);
    expect(buildChunkData(w, 0, 0).faceCount).toBe(5);
    expect(buildChunkData(w, 1, 0).faceCount).toBe(5);
  });

  it('gives each face its fixed brightness and a normal that points outwards', () => {
    const w = emptyWorld();
    w.set(5, 5, 5, STEEN);
    const d = buildChunkData(w, 0, 0);
    const seen = new Set<number>();
    for (let f = 0; f < d.faceCount; f++) {
      const p = (i: number) => [0, 1, 2].map((k) => d.positions[(f * 4 + i) * 3 + k] ?? 0);
      const [a, b, c] = [p(0), p(1), p(2)] as [number[], number[], number[]];
      const u = b.map((v, k) => v - (a[k] ?? 0));
      const v = c.map((q, k) => q - (a[k] ?? 0));
      const n = [
        (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
        (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
        (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0),
      ];
      const centre = [5.5, 5.5, 5.5];
      const out = n.reduce((s, q, k) => s + q * ((a[k] ?? 0) - (centre[k] ?? 0)), 0);
      expect(out).toBeGreaterThan(0);
      seen.add(d.colors[f * 12] ?? -1);
    }
    const got = [...seen].sort();
    [0.5, 0.6, 0.8, 1].forEach((v, i) => expect(got[i]).toBeCloseTo(v, 5));
    expect(got).toHaveLength(4);
  });

  it('builds real terrain chunks within vertex limits and wraps them in geometry', () => {
    const world = new World();
    let total = 0;
    for (let cx = 0; cx < CHUNKS_PER_SIDE; cx++) {
      for (let cz = 0; cz < CHUNKS_PER_SIDE; cz++) {
        const d = buildChunkData(world, cx, cz);
        total += d.faceCount;
        expect(d.positions.length / 3).toBeLessThan(65536 * 4);
        const g = toGeometry(d);
        if (d.faceCount > 0) expect(g?.getAttribute('position').count).toBe(d.faceCount * 4);
      }
    }
    expect(total).toBeGreaterThan(0);
    expect(toGeometry(buildChunkData(emptyWorld(), 0, 0))).toBeNull();
  });

  it('lists the chunks a changed block touches', () => {
    expect(chunksTouchedBy(5, 5)).toEqual([[0, 0]]);
    expect(chunksTouchedBy(0, 0)).toEqual([[0, 0]]);
    expect(chunksTouchedBy(CHUNK_SIZE, 5)).toEqual([[1, 0], [0, 0]]);
    expect(chunksTouchedBy(WORLD_SIZE - 1, WORLD_SIZE - 1)).toEqual([[CHUNKS_PER_SIDE - 1, CHUNKS_PER_SIDE - 1]]);
  });
});
