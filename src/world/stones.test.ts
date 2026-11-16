import { describe, expect, it } from 'vitest';
import { VEIN_BLOCKS, blockInfo } from './blocks';
import { STONES, STONE_IDS, stoneById } from './stones';

describe('stones', () => {
  it('AC271: ids 43 to 50 with the PRD names and prices, in shop order, sum 1550', () => {
    expect(STONES.map((s) => [s.id, s.name, s.price])).toEqual([
      [43, 'Maansteen', 80], [44, 'Zonnesteen', 100], [45, 'Jade', 120], [46, 'Opaal', 150],
      [47, 'Topaas', 180], [48, 'Parelsteen', 220], [49, 'Drakensteen', 300], [50, 'Mollengoud', 400],
    ]);
    expect(STONES.reduce((n, s) => n + s.price, 0)).toBe(1550);
    expect(STONE_IDS).toEqual([...VEIN_BLOCKS]);
  });

  it('AC271: every stone has its own colour and the block carries its name', () => {
    expect(new Set(STONES.map((s) => s.colour.join(','))).size).toBe(8);
    for (const s of STONES) expect(blockInfo(s.id).name).toBe(s.name.toLowerCase());
  });

  it('finds a stone by id', () => {
    expect(stoneById(45)?.name).toBe('Jade');
    expect(stoneById(42)).toBeUndefined();
    expect(stoneById(51)).toBeUndefined();
  });
});
