// The Moed bar: a knight sends Klodder off (v18, AC216, AC222). STUB until V18d: no knight notices him.
import type { KlodderState, MonsterContext } from './monster-types';

/** The bar is full at this value (30 s with one poker). */
export const MOED_FULL = 30;

/**
 * One step of loop time. Returns true when the bar is full and Klodder must leave (V18d sets `leaving`,
 * says "Wegwezen!" and "Doei!", and frees every `chase`).
 */
export function stepMoed(k: KlodderState, ctx: MonsterContext): boolean {
  void k;
  void ctx;
  return false;
}

/** Bar fraction 0 to 1 for the drawing (V18d draws it over Klodder). */
export function moedFraction(k: KlodderState): number {
  return Math.min(1, Math.max(0, k.moed / MOED_FULL));
}
