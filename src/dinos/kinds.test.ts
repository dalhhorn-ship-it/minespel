import { describe, expect, it } from 'vitest';
import { DINO_KINDS, DINO_KIND_IDS, SHOP_KINDS, SPECIAL_KINDS, isDinoKindId } from './kinds';

describe('dino kinds', () => {
  it('has the AC149 prices', () => {
    expect(SHOP_KINDS.map((k) => [k.id, k.price])).toEqual([
      ['compy', 20],
      ['triceratops', 40],
      ['stegosaurus', 40],
      ['brachiosaurus', 80],
    ]);
  });
  it('has 10 expensive Bijzondere dinos, cheapest first, all dearer than the Brachiosaurus (decision 113)', () => {
    expect(SPECIAL_KINDS).toHaveLength(10);
    const prices = SPECIAL_KINDS.map((k) => k.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(Math.min(...prices)).toBeGreaterThan(DINO_KINDS.brachiosaurus.price);
    expect(new Set(SPECIAL_KINDS.map((k) => k.name)).size).toBe(10);
  });
  it('has sizes for every kind', () => {
    for (const id of DINO_KIND_IDS) {
      const s = DINO_KINDS[id].size;
      expect(s.w).toBeGreaterThan(0);
      expect(s.h).toBeGreaterThan(0);
      expect(s.l).toBeGreaterThan(0);
    }
  });
  it('checks ids', () => {
    expect(isDinoKindId('compy')).toBe(true);
    expect(isDinoKindId('trex')).toBe(true);
    expect(isDinoKindId('draak')).toBe(false);
  });
});
