import { describe, expect, it } from 'vitest';
import { BLOCKS, MAX_BLOCK_ID, OERSTEEN, PLACEABLE_BLOCKS, AIR, GLAS, BLADEREN, STEEN, blockInfo, isCutout, isMinable, isPlaceable, isSolid } from './blocks';

describe('blocks', () => {
  it('has 16 placeable blocks, all with a name', () => {
    expect(PLACEABLE_BLOCKS).toHaveLength(16);
    for (const id of PLACEABLE_BLOCKS) {
      expect(blockInfo(id).name.length).toBeGreaterThan(0);
      expect(isMinable(id)).toBe(true);
      expect(isSolid(id)).toBe(true);
    }
  });

  it('has ids equal to their index and unique names', () => {
    BLOCKS.forEach((b, i) => expect(b.id).toBe(i));
    expect(new Set(BLOCKS.map((b) => b.name)).size).toBe(BLOCKS.length);
    expect(BLOCKS).toHaveLength(MAX_BLOCK_ID + 1);
  });

  it('fits a block id in one byte of a saved cell', () => {
    expect(MAX_BLOCK_ID).toBeLessThan(256);
  });

  it('oersteen is solid but neither minable nor placeable', () => {
    expect(isSolid(OERSTEEN)).toBe(true);
    expect(isMinable(OERSTEEN)).toBe(false);
    expect(isPlaceable(OERSTEEN)).toBe(false);
    expect(PLACEABLE_BLOCKS).not.toContain(OERSTEEN);
  });

  it('air is not solid and not placeable', () => {
    expect(isSolid(AIR)).toBe(false);
    expect(isPlaceable(AIR)).toBe(false);
  });

  it('glass and leaves are cut out, stone is not', () => {
    expect(isCutout(GLAS)).toBe(true);
    expect(isCutout(BLADEREN)).toBe(true);
    expect(isCutout(STEEN)).toBe(false);
  });

  it('throws for an unknown id', () => {
    expect(() => blockInfo(99)).toThrow();
  });
});
