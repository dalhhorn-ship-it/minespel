// Points, egg purchase, the 12 dino cap and the Extra oefenen day cap. Pure functions: they
// return new records and never touch storage or the clock. The total is never below 0.

import type { EconomyRecord } from '../storage/schema';
import { DINO_KINDS, type DinoKindId } from '../dinos/kinds';

export const POINTS_FIRST_TRY = 2;
export const POINTS_RETRY = 1;
export const POINTS_TEACH = -1;
export const POINTS_BONUS = 3;
export const MAX_SHOP_DINOS = 12;
export const PRACTICE_DAY_CAP = 10;
export const MAX_CHICKENS = 10;

export const MSG_CAP_REACHED = "Je hebt al 12 dino's! Wat een kudde.";
export const MSG_COOP_FULL = 'Het kippenhok is vol!';
export const MSG_ENOUGH_PRACTICE = 'Genoeg geoefend voor vandaag, ga lekker bouwen!';

export type SessionMode = 'break' | 'practice' | 'preview';
export type AnswerOutcome = 'first' | 'retry' | 'teach';

function clean(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Total after adding `delta`, never below 0. */
export function addPoints(points: number, delta: number): number {
  return Math.max(0, clean(points) + (Number.isFinite(delta) ? Math.trunc(delta) : 0));
}

/** Points for one answer before any cap: +2, +1 or -1. */
export function answerPoints(outcome: AnswerOutcome): number {
  return outcome === 'first' ? POINTS_FIRST_TRY : outcome === 'retry' ? POINTS_RETRY : POINTS_TEACH;
}

/** Bonus when every question of a break was right on the first try (breaks only, not Extra oefenen). */
export function bonusPoints(mode: SessionMode, total: number, firstTryRight: number): number {
  return mode === 'break' && total > 0 && firstTryRight === total ? POINTS_BONUS : 0;
}

/** Practice points already earned today; 0 when the stored day is not `day`. */
export function practiceEarnedToday(eco: EconomyRecord, day: string): number {
  return eco.practiceDay === day ? clean(eco.practicePointsToday) : 0;
}

export function practiceCapReached(eco: EconomyRecord, day: string): boolean {
  return practiceEarnedToday(eco, day) >= PRACTICE_DAY_CAP;
}

export interface PointsResult {
  economy: EconomyRecord;
  /** The change that really happened to the total (can be 0 or negative). */
  applied: number;
  /** True when a plus was cut or removed by the Extra oefenen day cap. */
  capHit: boolean;
  /** "Genoeg geoefend..." when the day cap blocks or just ran out. */
  message: string | null;
}

/**
 * Apply one points change from a session. Preview (Probeer) changes nothing. Break: no cap.
 * Practice: no malus and no bonus, plus points count toward the day cap of 10.
 * Early break (started with Nu oefenen, decision 56): the plus points and the +3 bonus share
 * that same day cap, a plus that does not fit gives the part that fits, and there is no malus.
 */
export function applyPoints(
  eco: EconomyRecord,
  mode: SessionMode,
  delta: number,
  day: string,
  early = false,
): PointsResult {
  const same = (capHit: boolean): PointsResult => ({
    economy: { ...eco },
    applied: 0,
    capHit,
    message: capHit ? MSG_ENOUGH_PRACTICE : null,
  });
  if (mode === 'preview' || !Number.isFinite(delta) || delta === 0) return same(false);

  if (mode === 'break' && !early) {
    const points = addPoints(eco.points, delta);
    return { economy: { ...eco, points }, applied: points - clean(eco.points), capHit: false, message: null };
  }

  // practice or early break: no malus
  if (delta < 0) return same(false);
  const earned = practiceEarnedToday(eco, day);
  const room = Math.max(0, PRACTICE_DAY_CAP - earned);
  const gain = Math.min(Math.trunc(delta), room);
  const capHit = gain < Math.trunc(delta) || room === 0;
  const economy: EconomyRecord = {
    ...eco,
    points: addPoints(eco.points, gain),
    practicePointsToday: earned + gain,
    practiceDay: day,
  };
  return {
    economy,
    applied: gain,
    capHit,
    message: capHit || earned + gain >= PRACTICE_DAY_CAP ? MSG_ENOUGH_PRACTICE : null,
  };
}

// ---- Dinowinkel ----

export function shopDinoCount(
  dinos: { golden?: boolean; kind?: string }[],
  eggs: { golden?: boolean; kind?: string }[],
): number {
  return [...dinos, ...eggs].filter((d) => !d.golden && d.kind !== 'kip').length;
}

export function capReached(shopCount: number): boolean {
  return shopCount >= MAX_SHOP_DINOS;
}

/** The golden egg (exam prize) is exempt from the cap and never counts toward it (AC111). */
export function canReceiveGolden(): boolean {
  return true;
}

export type BuyBlock = 'cap' | 'points' | 'coop';

export interface BuyState {
  kind: DinoKindId;
  price: number;
  canBuy: boolean;
  blocked: BuyBlock | null;
  /** "Nog 10 punten nodig" or the cap message, else null. */
  note: string | null;
}

export function pointsNeededText(missing: number): string {
  return missing === 1 ? 'Nog 1 punt nodig' : `Nog ${missing} punten nodig`;
}

export function buyState(points: number, shopCount: number, kind: DinoKindId): BuyState {
  const price = DINO_KINDS[kind].price;
  if (capReached(shopCount)) return { kind, price, canBuy: false, blocked: 'cap', note: MSG_CAP_REACHED };
  const have = clean(points);
  if (have < price) {
    return { kind, price, canBuy: false, blocked: 'points', note: pointsNeededText(price - have) };
  }
  return { kind, price, canBuy: true, blocked: null, note: null };
}

/** Chickens in the world. They never count toward the 12 dinos (decision 55). */
export function chickenCount(dinos: { kind?: string }[]): number {
  return dinos.filter((d) => d.kind === 'kip').length;
}

/** A chicken costs 5 points, at most 10 live in the world. More than 10 in an old save are kept. */
export function chickenBuyState(points: number, chickens: number): BuyState {
  const price = DINO_KINDS.kip.price;
  if (chickens >= MAX_CHICKENS) {
    return { kind: 'kip', price, canBuy: false, blocked: 'coop', note: MSG_COOP_FULL };
  }
  const have = clean(points);
  if (have < price) {
    return { kind: 'kip', price, canBuy: false, blocked: 'points', note: pointsNeededText(price - have) };
  }
  return { kind: 'kip', price, canBuy: true, blocked: null, note: null };
}

export type PurchaseResult =
  | { ok: true; economy: EconomyRecord; kind: DinoKindId; price: number }
  | { ok: false; reason: BuyBlock; economy: EconomyRecord; note: string };

/**
 * Buy one egg. Checks the cap and the points again, so a fast double tap that arrives after
 * the first purchase fails (AC110: 45 points, 40 egg, total 5, never below 0).
 */
export function purchaseEgg(eco: EconomyRecord, shopCount: number, kind: DinoKindId): PurchaseResult {
  const s = buyState(eco.points, shopCount, kind);
  if (!s.canBuy) return { ok: false, reason: s.blocked as BuyBlock, economy: { ...eco }, note: s.note ?? '' };
  return { ok: true, economy: { ...eco, points: addPoints(eco.points, -s.price) }, kind, price: s.price };
}

/** Buy one chicken. Checks the coop and the points again, so fast repeated taps buy exactly one. */
export function purchaseChicken(eco: EconomyRecord, chickens: number): PurchaseResult {
  const s = chickenBuyState(eco.points, chickens);
  if (!s.canBuy) return { ok: false, reason: s.blocked as BuyBlock, economy: { ...eco }, note: s.note ?? '' };
  return { ok: true, economy: { ...eco, points: addPoints(eco.points, -s.price) }, kind: 'kip', price: s.price };
}
