import { describe, expect, it } from 'vitest';
import { VEIN_BLOCKS, blockInfo } from './blocks';
import { STONES, STONE_IDS, checkStones, stoneById } from './stones';

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

describe('checkStones (AC278)', () => {
  it('AC278: nothing, empty and a good set pass', () => {
    expect(checkStones(undefined)).toBe(true);
    expect(checkStones({ found: [], bought: [] })).toBe(true);
    expect(checkStones({ found: [43, 45, 48], bought: [43, 48] })).toBe(true);
  });
  it('AC278: an id outside 43 to 50, a stone bought but not found, a repeat or a wrong shape is refused', () => {
    expect(checkStones({ found: [42], bought: [] })).toBe(false);
    expect(checkStones({ found: [51], bought: [] })).toBe(false);
    expect(checkStones({ found: [43], bought: [43, 44] })).toBe(false);
    expect(checkStones({ found: [43, 43], bought: [] })).toBe(false);
    expect(checkStones({ found: '43', bought: [] })).toBe(false);
    expect(checkStones([43])).toBe(false);
    expect(checkStones(null)).toBe(false);
    expect(checkStones({ found: [43.5], bought: [] })).toBe(false);
  });
});
