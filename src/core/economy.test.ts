import { describe, expect, it } from 'vitest';
import type { EconomyRecord } from '../storage/schema';
import {
  addPoints, answerPoints, canAffordEgg, applyPoints, bonusPoints, buyState, canReceiveGolden, capReached,
  purchaseEgg, purchaseChicken, chickenBuyState, chickenCount, MAX_CHICKENS, MSG_COOP_FULL, shopDinoCount, practiceCapReached, MSG_CAP_REACHED, MSG_ENOUGH_PRACTICE,
} from './economy';

const eco = (points: number, today = 0, day = '2026-10-17'): EconomyRecord => ({
  points, practicePointsToday: today, practiceDay: day,
});
const D = '2026-10-17';

describe('points', () => {
  it('uses +2, +1, -1', () => {
    expect([answerPoints('first'), answerPoints('retry'), answerPoints('teach')]).toEqual([2, 1, -1]);
  });
  it('never goes below 0 (AC147)', () => {
    expect(addPoints(0, -1)).toBe(0);
    expect(applyPoints(eco(0), 'break', -1, D).economy.points).toBe(0);
    expect(applyPoints(eco(0), 'break', -1, D).applied).toBe(0);
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
    for (let i = 0; i < 5; i++) e = applyPoints(e, 'break', answerPoints('first'), D).economy;
    e = applyPoints(e, 'break', bonusPoints('break', 5, 5), D).economy;
    expect(e.points).toBe(13);
  });
  it('preview changes nothing', () => {
    const r = applyPoints(eco(7), 'preview', 2, D);
    expect(r.economy).toEqual(eco(7));
    expect(r.applied).toBe(0);
  });
  it('does not mutate input', () => {
    const e = eco(5);
    applyPoints(e, 'break', 2, D);
    expect(e).toEqual(eco(5));
  });
});

describe('Extra oefenen day cap (AC120)', () => {
  it('has no malus', () => {
    const r = applyPoints(eco(5, 2), 'practice', -1, D);
    expect(r.economy).toEqual(eco(5, 2));
  });
  it('stops at 10 and shows the message', () => {
    let e = eco(0);
    let last = applyPoints(e, 'practice', 2, D);
    for (let i = 0; i < 5; i++) {
      last = applyPoints(e, 'practice', 2, D);
      e = last.economy;
    }
    expect(e.points).toBe(10);
    expect(last.message).toBe(MSG_ENOUGH_PRACTICE);
    const more = applyPoints(e, 'practice', 2, D);
    expect(more.applied).toBe(0);
    expect(more.capHit).toBe(true);
    expect(more.message).toBe(MSG_ENOUGH_PRACTICE);
    expect(more.economy.points).toBe(10);
  });
  it('cuts a plus that crosses the cap', () => {
    const r = applyPoints(eco(0, 9), 'practice', 2, D);
    expect(r.applied).toBe(1);
    expect(r.capHit).toBe(true);
  });
  it('starts again the next day', () => {
    const e = eco(10, 10, D);
    expect(practiceCapReached(e, D)).toBe(true);
    expect(practiceCapReached(e, '2026-10-18')).toBe(false);
    const r = applyPoints(e, 'practice', 2, '2026-10-18');
    expect(r.economy).toEqual({ points: 12, practicePointsToday: 2, practiceDay: '2026-10-18' });
  });
  it('break points never count toward the cap', () => {
    const r = applyPoints(eco(0, 0), 'break', 20, D);
    expect(r.economy.practicePointsToday).toBe(0);
    expect(applyPoints(r.economy, 'practice', 2, D).applied).toBe(2);
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

describe('early break points (decision 56)', () => {
  const early = (e: EconomyRecord, delta: number, day = D) => applyPoints(e, 'break', delta, day, true);
  it('counts plus points toward the day limit', () => {
    const r = early(eco(0, 0), 2);
    expect(r.applied).toBe(2);
    expect(r.economy.practicePointsToday).toBe(2);
    expect(r.economy.practiceDay).toBe(D);
  });
  it('with 8 used a +2 fits exactly and shows the message', () => {
    const r = early(eco(0, 8), 2);
    expect(r.applied).toBe(2);
    expect(r.message).toBe(MSG_ENOUGH_PRACTICE);
  });
  it('with 9 used a +2 gives only 1', () => {
    const r = early(eco(0, 9), 2);
    expect(r.applied).toBe(1);
    expect(r.economy.practicePointsToday).toBe(10);
    expect(r.capHit).toBe(true);
  });
  it('at the limit the +3 bonus and every plus give nothing', () => {
    expect(early(eco(5, 10), 3).applied).toBe(0);
    expect(early(eco(5, 10), 3).economy.points).toBe(5);
    expect(early(eco(5, 10), 1).message).toBe(MSG_ENOUGH_PRACTICE);
  });
  it('has no malus', () => {
    const r = early(eco(5, 0), -1);
    expect(r.applied).toBe(0);
    expect(r.economy.points).toBe(5);
  });
  it('a normal break keeps full points and its malus', () => {
    expect(applyPoints(eco(5, 10), 'break', 3, D).applied).toBe(3);
    expect(applyPoints(eco(5, 10), 'break', -1, D).applied).toBe(-1);
  });
  it('is shared with Extra oefenen', () => {
    const afterEarly = early(eco(0, 0), 6).economy;
    const practice = applyPoints(afterEarly, 'practice', 6, D);
    expect(practice.applied).toBe(4);
    const afterPractice = applyPoints(eco(0, 0), 'practice', 7, D).economy;
    expect(early(afterPractice, 5).applied).toBe(3);
  });
  it('starts again the next day', () => {
    const r = early(eco(0, 10, D), 2, '2026-10-18');
    expect(r.applied).toBe(2);
    expect(r.economy.practicePointsToday).toBe(2);
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
