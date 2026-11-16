import { describe, expect, it } from 'vitest';
import {
  AIR, BLADEREN, BLOCKS, GLAS, IJS, LAVA, MAX_BLOCK_ID, OBSIDIAAN, OERSTEEN, PLACEABLE_BLOCKS,
  RARE_BLOCKS, STEEN, VEIN_BLOCKS, VUUR, VUURSTEEN, WAARSCHUWSTEEN, WATER, blockInfo, isCutout, isMinable, isPlaceable, isSolid,
} from './blocks';

describe('blocks', () => {
  it('AC187: has 8 rare blocks, ids 34 to 41, placeable and minable, not in the 32 building blocks', () => {
    expect(RARE_BLOCKS).toEqual([34, 35, 36, 37, 38, 39, 40, 41]);
    expect(RARE_BLOCKS.map((id) => blockInfo(id).name)).toEqual([
      'smaragd', 'robijn', 'saffier', 'amethist', 'kristal', 'lichtsteen', 'regenboogsteen', 'sterrensteen',
    ]);
    for (const id of RARE_BLOCKS) {
      expect(isPlaceable(id)).toBe(true);
      expect(isMinable(id)).toBe(true);
      expect(isSolid(id)).toBe(true);
      expect(PLACEABLE_BLOCKS).not.toContain(id);
    }
    expect(RARE_BLOCKS).not.toContain(MAX_BLOCK_ID);
  });

  it('AC233 AC271 AC275: Waarschuwsteen 42 is not placeable; the vein blocks 43 to 50 (named after the stones) are solid, minable, placeable by the block rules, not in the lists', () => {
    expect(WAARSCHUWSTEEN).toBe(42);
    expect(VEIN_BLOCKS).toEqual([43, 44, 45, 46, 47, 48, 49, 50]);
    expect(MAX_BLOCK_ID).toBe(50);
    expect(blockInfo(42).name).toBe('waarschuwsteen');
    expect(VEIN_BLOCKS.map((id) => blockInfo(id).name)).toEqual([
      'maansteen', 'zonnesteen', 'jade', 'opaal', 'topaas', 'parelsteen', 'drakensteen', 'mollengoud',
    ]);
    for (let id = 42; id <= 50; id++) {
      expect(isSolid(id)).toBe(true);
      expect(isMinable(id)).toBe(true);
      expect(isCutout(id)).toBe(false);
      expect(isPlaceable(id)).toBe(id >= 43);
      expect(PLACEABLE_BLOCKS).not.toContain(id);
    }
  });

  it('has 32 placeable blocks, all with a name (CR1, CR2, CR4)', () => {
    expect(PLACEABLE_BLOCKS).toHaveLength(32);
    expect(PLACEABLE_BLOCKS).toContain(OBSIDIAAN);
    expect(PLACEABLE_BLOCKS).toContain(VUUR);
    expect(PLACEABLE_BLOCKS).toContain(LAVA);
    expect(PLACEABLE_BLOCKS).toContain(VUURSTEEN);
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

  it('glass, leaves, fire, water, and ice are cut out; stone, obsidian, and lava are not', () => {
    expect(isCutout(GLAS)).toBe(true);
    expect(isCutout(BLADEREN)).toBe(true);
    expect(isCutout(VUUR)).toBe(true);
    expect(isCutout(WATER)).toBe(true);
    expect(isCutout(IJS)).toBe(true);
    expect(isCutout(STEEN)).toBe(false);
    expect(isCutout(OBSIDIAAN)).toBe(false);
    expect(isCutout(LAVA)).toBe(false);
  });

  it('throws for an unknown id', () => {
    expect(() => blockInfo(99)).toThrow();
  });
});
