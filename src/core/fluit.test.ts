import { describe, expect, it } from 'vitest';
import { defaultKv } from '../storage/schema';
import { FLUIT_PRICE, fluitBuyState, ownsFluit, purchaseFluit } from './economy';

const eco = (points: number, fluit?: boolean) => ({ ...defaultKv('economy'), points, ...(fluit === undefined ? {} : { fluit }) });

describe('Dinofluit economy (decision 114)', () => {
  it('costs 60 points and is not owned in an old save', () => {
    expect(FLUIT_PRICE).toBe(60);
    expect(ownsFluit(eco(0))).toBe(false);
    expect(ownsFluit(null)).toBe(false);
  });

  it('says how many points are missing', () => {
    expect(fluitBuyState(45, false)).toMatchObject({ canBuy: false, blocked: 'points', note: 'Nog 15 punten nodig' });
    expect(fluitBuyState(60, false)).toMatchObject({ canBuy: true, note: null });
  });

  it('takes the points once and marks the fluit as owned', () => {
    const r = purchaseFluit(eco(70));
    expect(r.ok).toBe(true);
    expect(r.economy).toMatchObject({ points: 10, fluit: true });
  });

  it('never sells it twice, so a double tap pays once', () => {
    const first = purchaseFluit(eco(200));
    const second = purchaseFluit(first.economy);
    expect(second.ok).toBe(false);
    expect(second.economy.points).toBe(140);
    expect(fluitBuyState(500, true)).toMatchObject({ canBuy: false, blocked: null });
  });

  it('refuses with too few points and changes nothing', () => {
    const r = purchaseFluit(eco(59));
    expect(r.ok).toBe(false);
    expect(r.economy).toEqual(eco(59));
  });
});
