import { describe, expect, it } from 'vitest';
import { World } from '../../src/world/world';
import { WORLD_SIZE } from '../../src/world/terrain';
import { STONE_IDS } from '../../src/world/stones';
import { isPlaceable } from '../../src/world/blocks';

describe('stones in the world', () => {
  it('AC271: a world record of 0.10.0 shape loads and gives the same diff bytes, terrain version 3', () => {
    const w = new World();
    expect(w.terrainVersion).toBe(3);
    w.set(3, 12, 3, 7);
    w.set(4, 12, 3, 2);
    const saved = w.diff();
    const loaded = World.fromDiff(saved);
    expect(loaded.terrainVersion).toBe(3);
    expect(Array.from(loaded.diff())).toEqual(Array.from(saved));
    expect(new Uint8Array(loaded.diff().buffer)).toEqual(new Uint8Array(saved.buffer));
  });

  it('AC271: the start world still holds every stone id, and each is a placeable block (V20b; a stone not bought stays locked in the build controller)', () => {
    const w = new World();
    const found = new Set<number>();
    for (let x = 0; x < WORLD_SIZE; x++) for (let z = 0; z < WORLD_SIZE; z++) for (let y = 1; y <= 4; y++) found.add(w.get(x, y, z));
    for (const id of STONE_IDS) {
      expect(found.has(id)).toBe(true);
      expect(isPlaceable(id)).toBe(true);
    }
  });
});
