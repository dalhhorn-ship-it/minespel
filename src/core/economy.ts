// Points, egg purchase, trade in and the 25 dino cap. Pure functions: they
// return new records and never touch storage or the clock. The total is never below 0.

import type { EconomyRecord } from '../storage/schema';
import { DINO_KINDS, SHOP_KINDS, type DinoKindId } from '../dinos/kinds';

export const POINTS_FIRST_TRY = 2;
export const POINTS_RETRY = 1;
export const POINTS_BONUS = 3;
export const MAX_SHOP_DINOS = 25;
export const MAX_CHICKENS = 10;

export const MSG_CAP_REACHED = `Je hebt al ${MAX_SHOP_DINOS} dino's! Wat een kudde. Ruil er een in om plek te maken.`;
export const MSG_COOP_FULL = 'Het kippenhok is vol!';

export type SessionMode = 'break' | 'practice' | 'preview';
export type AnswerOutcome = 'first' | 'retry' | 'teach';

function clean(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Total after adding `delta`, never below 0. */
export function addPoints(points: number, delta: number): number {
  return Math.max(0, clean(points) + (Number.isFinite(delta) ? Math.trunc(delta) : 0));
}

/** Punten setting (decision 92): what a mistake costs. */
export type PointsMode = 'makkelijk' | 'normaal' | 'moeilijk';
export const POINTS_MODES: readonly PointsMode[] = ['makkelijk', 'normaal', 'moeilijk'];
export const DEFAULT_POINTS_MODE: PointsMode = 'normaal';

/** The mode in a settings record. A missing or odd value (a save from 0.3.0) reads as Normaal. */
export function pointsModeOf(settings: { pointsMode?: unknown } | null | undefined): PointsMode {
  const m = settings?.pointsMode;
  return m === 'makkelijk' || m === 'normaal' || m === 'moeilijk' ? m : DEFAULT_POINTS_MODE;
}

/** What one step of a question is worth: a wrong first try ('miss') only counts on Moeilijk. */
export type PointsEvent = AnswerOutcome | 'miss';

/** Points for one answer before the total floor: +2, +1, or a minus by the Punten setting. */
export function answerPoints(outcome: PointsEvent, mode: PointsMode = DEFAULT_POINTS_MODE): number {
  if (outcome === 'first') return POINTS_FIRST_TRY;
  if (outcome === 'retry') return POINTS_RETRY;
  if (mode === 'makkelijk') return 0;
  if (outcome === 'miss') return mode === 'moeilijk' ? -1 : 0;
  return -1; // teach moment: Normaal and Moeilijk
}

/** Bonus when every question of a break was right on the first try (breaks only, not Extra oefenen). */
export function bonusPoints(mode: SessionMode, total: number, firstTryRight: number): number {
  return mode === 'break' && total > 0 && firstTryRight === total ? POINTS_BONUS : 0;
}

export interface PointsResult {
  economy: EconomyRecord;
  /** The change that really happened to the total: a minus is only what was really taken. */
  applied: number;
}

/** Apply one points change from a session. Preview (Probeer) changes nothing. No day limit. */
export function applyPoints(eco: EconomyRecord, mode: SessionMode, delta: number): PointsResult {
  if (mode === 'preview' || !Number.isFinite(delta) || delta === 0) return { economy: { ...eco }, applied: 0 };
  const points = addPoints(eco.points, delta);
  return { economy: { ...eco, points }, applied: points - clean(eco.points) };
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

/**
 * The egg hint after a break or Extra oefenen: true when the cheapest shop egg can be bought now.
 * Same rule as the Dinowinkel (cap of 25 shop dinos, golden dinos and chickens do not count).
 */
export function canAffordEgg(points: number, shopCount: number): boolean {
  const cheapest = SHOP_KINDS[0];
  return cheapest !== undefined && buyState(points, shopCount, cheapest.id).canBuy;
}

/** Chickens in the world. They never count toward the 25 dinos (decision 55). */
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

// ---- Inruilen (trade in) ----

/** A traded in animal gives half its price back, rounded down (Compy 10, Kip 2). */
export function tradeInValue(kind: DinoKindId): number {
  return Math.floor(DINO_KINDS[kind].price / 2);
}

/** A golden dino is an exam prize: it can never be traded in. Every other dino and chicken can. */
export function canTradeIn(animal: { kind?: string; golden?: boolean }): boolean {
  return !animal.golden && typeof animal.kind === 'string' && animal.kind in DINO_KINDS;
}

export type TradeInResult =
  | { ok: true; economy: EconomyRecord; refund: number }
  | { ok: false; economy: EconomyRecord };

/** Trade in one animal: the points go up by half its price. A golden dino is refused. */
export function tradeIn(eco: EconomyRecord, animal: { kind: DinoKindId; golden?: boolean }): TradeInResult {
  if (!canTradeIn(animal)) return { ok: false, economy: { ...eco } };
  const refund = tradeInValue(animal.kind);
  return { ok: true, economy: { ...eco, points: addPoints(eco.points, refund) }, refund };
}
