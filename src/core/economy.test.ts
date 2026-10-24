import { describe, expect, it } from 'vitest';
import type { EconomyRecord } from '../storage/schema';
import {
  addPoints, answerPoints, canAffordEgg, applyPoints, bonusPoints, buyState, canReceiveGolden, capReached,
  purchaseEgg, purchaseChicken, chickenBuyState, chickenCount, MAX_CHICKENS, MSG_COOP_FULL, shopDinoCount, MSG_CAP_REACHED, pointsModeOf,
} from './economy';

const eco = (points: number, today = 0, day = '2026-10-17'): EconomyRecord => ({
  points, practicePointsToday: today, practiceDay: day,
});

describe('points', () => {
  it('AC173: uses +2, +1 and a minus by the Punten setting', () => {
    expect([answerPoints('first'), answerPoints('retry')]).toEqual([2, 1]);
    // Makkelijk: a mistake costs nothing
    expect([answerPoints('miss', 'makkelijk'), answerPoints('teach', 'makkelijk')]).toEqual([0, 0]);
    // Normaal (default): only the teach moment costs 1
    expect([answerPoints('miss', 'normaal'), answerPoints('teach', 'normaal'), answerPoints('teach')]).toEqual([0, -1, -1]);
    // Moeilijk: every wrong try costs 1, so a teach moment costs 2 in total
    expect([answerPoints('miss', 'moeilijk'), answerPoints('teach', 'moeilijk')]).toEqual([-1, -1]);
    expect(answerPoints('first', 'moeilijk')).toBe(2);
  });
  it('AC172: a save without pointsMode reads as normaal', () => {
    expect(pointsModeOf({})).toBe('normaal');
    expect(pointsModeOf(null)).toBe('normaal');
    expect(pointsModeOf({ pointsMode: 'rare' })).toBe('normaal');
    expect(pointsModeOf({ pointsMode: 'moeilijk' })).toBe('moeilijk');
    expect(pointsModeOf({ pointsMode: 'makkelijk' })).toBe('makkelijk');
  });
  it('never goes below 0 (AC147)', () => {
    expect(addPoints(0, -1)).toBe(0);
    expect(applyPoints(eco(0), 'break', -1).economy.points).toBe(0);
    expect(applyPoints(eco(0), 'break', -1).applied).toBe(0);
    expect(addPoints(-5, 0)).toBe(0);
    expect(addPoints(NaN, 2)).toBe(2);
  });
  it('gives 3 bonus only in breaks when all first try (AC35)', () => {
    expect(bonusPoints('break', 5, 5)).toBe(3);
    expect(bonusPoints('break', 5, 4)).toBe(0);
    expect(bonusPoints('break', 0, 0)).toBe(0);
    expect(bonusPoints('practice', 5, 5)).toBe(0);
    expect(bonusPoints('preview', 5, 5)).toBe(0);
  });
  it('gives 13 points for 5 perfect questions', () => {
    let e = eco(0);
    for (let i = 0; i < 5; i++) e = applyPoints(e, 'break', answerPoints('first')).economy;
    e = applyPoints(e, 'break', bonusPoints('break', 5, 5)).economy;
    expect(e.points).toBe(13);
  });
  it('preview changes nothing', () => {
    const r = applyPoints(eco(7), 'preview', 2);
    expect(r.economy).toEqual(eco(7));
    expect(r.applied).toBe(0);
  });
  it('does not mutate input', () => {
    const e = eco(5);
    applyPoints(e, 'break', 2);
    expect(e).toEqual(eco(5));
  });
});

describe('no day limit (AC175)', () => {
  it('Extra oefenen pays in full however much was earned today', () => {
    const r = applyPoints(eco(60, 50), 'practice', 2);
    expect(r.applied).toBe(2);
    expect(r.economy.points).toBe(62);
  });
  it('a plus is never cut and the bonus still comes', () => {
    expect(applyPoints(eco(5, 10), 'break', 3).applied).toBe(3);
    expect(applyPoints(eco(5, 9), 'practice', 2).applied).toBe(2);
  });
  it('AC174: a minus takes only what is there', () => {
    expect(applyPoints(eco(1), 'practice', -1).applied).toBe(-1);
    const r = applyPoints(eco(0), 'practice', -1);
    expect(r.applied).toBe(0);
    expect(r.economy.points).toBe(0);
    expect(applyPoints(eco(1), 'break', -2).applied).toBe(-1);
  });
});

describe('Dinowinkel', () => {
  it('shows missing points (AC149)', () => {
    expect(buyState(30, 0, 'compy').canBuy).toBe(true);
    expect(buyState(30, 0, 'triceratops').note).toBe('Nog 10 punten nodig');
    expect(buyState(30, 0, 'brachiosaurus').note).toBe('Nog 50 punten nodig');
    expect(buyState(79, 0, 'brachiosaurus').note).toBe('Nog 1 punt nodig');
  });
  it('buys once with 45 points and a fast repeat fails (AC110)', () => {
    let e = eco(45);
    let bought = 0;
    for (let i = 0; i < 10; i++) {
      const r = purchaseEgg(e, bought, 'triceratops');
      e = r.economy;
      if (r.ok) bought++;
    }
    expect(bought).toBe(1);
    expect(e.points).toBe(5);
  });
  it('blocks the 13th shop dino (AC20)', () => {
    expect(capReached(11)).toBe(false);
    expect(capReached(12)).toBe(true);
    const r = purchaseEgg(eco(500), 12, 'compy');
    expect(r.ok).toBe(false);
    expect(r.economy.points).toBe(500);
    if (!r.ok) expect(r.note).toBe(MSG_CAP_REACHED);
    expect(buyState(500, 12, 'compy').blocked).toBe('cap');
  });
  it('golden is exempt (AC111)', () => {
    const shop = Array.from({ length: 12 }, () => ({}));
    const withGolden = [...shop, { golden: true }];
    expect(shopDinoCount(withGolden, [{ golden: true }])).toBe(12);
    expect(canReceiveGolden()).toBe(true);
    expect(capReached(shopDinoCount(withGolden, []))).toBe(true);
  });
  it('counts eggs too', () => {
    expect(shopDinoCount([{}, {}], [{}])).toBe(3);
  });
});

describe('Kippenhok (decision 55)', () => {
  it('a chicken costs 5 points and is taken once on 5 fast taps', () => {
    let e = eco(5);
    let chickens = 0;
    let bought = 0;
    for (let i = 0; i < 5; i++) {
      const r = purchaseChicken(e, chickens);
      if (r.ok) {
        e = r.economy;
        chickens++;
        bought++;
      }
    }
    expect(bought).toBe(1);
    expect(e.points).toBe(0);
  });
  it('4 points are blocked with "Nog 1 punt nodig"', () => {
    const s = chickenBuyState(4, 0);
    expect(s.canBuy).toBe(false);
    expect(s.note).toBe('Nog 1 punt nodig');
    expect(chickenBuyState(2, 0).note).toBe('Nog 3 punten nodig');
  });
  it('the 10th chicken can be bought, then the coop is full', () => {
    expect(purchaseChicken(eco(50), MAX_CHICKENS - 1).ok).toBe(true);
    const full = purchaseChicken(eco(50), MAX_CHICKENS);
    expect(full.ok).toBe(false);
    expect(chickenBuyState(50, MAX_CHICKENS).note).toBe(MSG_COOP_FULL);
    expect(chickenBuyState(50, 12).canBuy).toBe(false);
  });
  it('chickens do not count in the 12 dinos and 12 dinos still allow a chicken', () => {
    const dinos = [
      ...Array.from({ length: 12 }, () => ({ kind: 'compy' })),
      { kind: 'kip' },
      { kind: 'kip' },
    ];
    expect(shopDinoCount(dinos, [])).toBe(12);
    expect(chickenCount(dinos)).toBe(2);
    expect(purchaseChicken(eco(10), chickenCount(dinos)).ok).toBe(true);
    // eggs never count against chickens
    expect(chickenCount([{ kind: 'compy' }])).toBe(0);
  });
});

describe('canAffordEgg (AC169, AC34)', () => {
  it('AC169: needs the cheapest egg price and room under the 12 dino cap', () => {
    expect(canAffordEgg(19, 0)).toBe(false);
    expect(canAffordEgg(20, 0)).toBe(true);
    expect(canAffordEgg(500, 11)).toBe(true);
    expect(canAffordEgg(500, 12)).toBe(false);
  });
});
