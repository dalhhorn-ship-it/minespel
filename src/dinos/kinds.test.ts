import { describe, expect, it } from 'vitest';
import { BODY_PLANS, bodyFromPlan, paletteFrom, shade, sizeLabelFor } from './body';
import { DINO_KINDS, DINO_KIND_IDS, SHOP_DINO_IDS, SHOP_KINDS, generateKind, isDinoKindId } from './kinds';
import { SPECIES } from './species';

describe('dino kinds', () => {
  it('has the AC149 prices', () => {
    for (const [id, price] of [['compy', 20], ['triceratops', 40], ['stegosaurus', 40], ['brachiosaurus', 80]] as const) {
      expect(DINO_KINDS[id].price).toBe(price);
    }
  });
  it('sells shop animals cheapest first and keeps the kip out of the egg cards', () => {
    const prices = SHOP_KINDS.map((k) => k.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(SHOP_DINO_IDS).not.toContain('kip');
    expect(SHOP_DINO_IDS).toContain('compy');
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
    expect(isDinoKindId('trex')).toBe(false);
  });
});

describe('animal table (decision 111)', () => {
  it('has unique ids and Dutch names, and a trait for every animal', () => {
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SPECIES) {
      expect(s.id).toMatch(/^[a-z][a-z0-9]*$/);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.trait.length).toBeGreaterThan(0);
      expect(Number.isInteger(s.price) && s.price > 0).toBe(true);
    }
  });

  it('every animal gets a full set of generated properties', () => {
    for (const id of DINO_KIND_IDS) {
      const k = DINO_KINDS[id];
      expect(k.sizeLabel).toMatch(/blok/);
      expect(k.emblem.light).toMatch(/^#[0-9a-f]{6}$/);
      expect(k.emblem.tint).toMatch(/^#[0-9a-f]{6}$/);
      expect(k.emblem.body).toMatch(/^#[0-9a-f]{6}$/);
      expect(k.body.leg.at.length).toBeGreaterThan(0);
    }
  });

  it('fills in everything a minimal entry leaves out', () => {
    const k = generateKind({
      id: 'testosaurus', name: 'Testosaurus', price: 60, inShop: true, plan: 'fourLegs',
      size: { w: 1.2, h: 1.4, l: 2 }, color: 0x8d6e63, trait: 'Een test.',
    });
    expect(k.palette).toEqual(paletteFrom(0x8d6e63));
    expect(k.sizeLabel).toBe('Groot (1,4 blok)');
    expect(k.emblem.body).toBe('#8d6e63');
    expect(k.body).toEqual(bodyFromPlan('fourLegs', { w: 1.2, h: 1.4, l: 2 }));
  });

  it('the compy and brachiosaurus are their own plan templates, so plans match the hand made models', () => {
    expect(bodyFromPlan('twoLegs', DINO_KINDS.compy.size)).toEqual(DINO_KINDS.compy.body);
    expect(bodyFromPlan('longNeck', DINO_KINDS.brachiosaurus.size)).toEqual(DINO_KINDS.brachiosaurus.body);
  });

  it('a generated body stands on the ground and stays inside its size box', () => {
    for (const plan of BODY_PLANS) {
      const size = { w: 0.9, h: 1.7, l: 1.5 };
      const b = bodyFromPlan(plan, size);
      const parts = [b.body, b.head, b.tail, ...b.feature];
      for (const p of parts) {
        expect(p.y + p.h / 2).toBeLessThanOrEqual(size.h + 0.05);
        expect(Math.abs(p.z) + p.d / 2).toBeLessThanOrEqual(size.l / 2 + 0.15);
      }
      expect(b.leg.h).toBeGreaterThan(0);
    }
  });

  it('shades colours and labels sizes', () => {
    expect(shade(0x808080, 1)).toBe(0xffffff);
    expect(shade(0x808080, -1)).toBe(0x000000);
    expect(shade(0x123456, 0)).toBe(0x123456);
    expect(sizeLabelFor({ w: 1, h: 0.8, l: 1 })).toBe('Klein (0,8 blok)');
    expect(sizeLabelFor({ w: 1, h: 1, l: 1 })).toBe('Middel (1 blok)');
    expect(sizeLabelFor({ w: 1, h: 2.4, l: 1 })).toBe('Reusachtig (2,4 blok hoog)');
  });
});
