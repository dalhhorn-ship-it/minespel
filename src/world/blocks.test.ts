import { describe, expect, it } from 'vitest';
import {
  AIR, BLADEREN, BLOCKS, GLAS, IJS, LAVA, MAX_BLOCK_ID, OERSTEEN, PLACEABLE_BLOCKS, STEEN, VUUR,
  WATER, blockInfo, isCutout, isGlowing, isMinable, isPlaceable, isSolid,
} from './blocks';

describe('blocks', () => {
  it('has 32 placeable blocks in PRD 4.1 order, all with a name, oersteen not in it, MAX_BLOCK_ID is 33 (G1)', () => {
    expect(PLACEABLE_BLOCKS).toHaveLength(32);
    expect(MAX_BLOCK_ID).toBe(33);
    expect(PLACEABLE_BLOCKS).not.toContain(OERSTEEN);
    expect(PLACEABLE_BLOCKS.map((id) => blockInfo(id).name)).toEqual([
      'gras', 'aarde', 'zand', 'boomstam', 'bladeren', 'sneeuw', 'ijs', 'water',
      'steen', 'keisteen', 'mossteen', 'zandsteen', 'graniet', 'marmer', 'basalt', 'diepsteen',
      'planken', 'baksteen', 'glas', 'obsidiaan', 'vuursteen', 'goudsteen', 'diamant', 'lava',
      'wol wit', 'wol rood', 'wol geel', 'wol blauw', 'wol groen', 'wol paars', 'wol oranje', 'vuur',
    ]);
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

  it('glass, leaves, water, ijs and vuur are cut out; lava and vuur are glowing', () => {
    expect(isCutout(GLAS)).toBe(true);
    expect(isCutout(BLADEREN)).toBe(true);
    expect(isCutout(WATER)).toBe(true);
    expect(isCutout(IJS)).toBe(true);
    expect(isCutout(VUUR)).toBe(true);
    expect(isCutout(STEEN)).toBe(false);
    expect(isGlowing(LAVA)).toBe(true);
    expect(isGlowing(VUUR)).toBe(true);
    expect(isGlowing(STEEN)).toBe(false);
  });

  it('throws for an unknown id', () => {
    expect(() => blockInfo(99)).toThrow();
  });
});
