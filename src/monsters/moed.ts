// The Moed bar: a knight sends Klodder off (v18, AC216, AC222). Knights that notice him get `chase`; knights
// within 1.5 blocks poke him. The bar fills by the summed Kracht of the pokers per second (gear.ts), never faster
// than full in 3 s, so a fight lasts 3 s at the very least.
import { kracht, moedRate, noticeBonus } from '../knights/gear';
import type { KnightState } from '../knights/knight-types';
import { KLODDER_TIRED_MS, type KlodderState, type MonsterContext } from './monster-types';

/** The bar is full at this value (30 s with one poker). */
export const MOED_FULL = 30;
/** Fill per second is capped: full in 3 s at the very least (AC216, AC262). */
export const MOED_MAX_RATE = MOED_FULL / 3;
/** Pokers that count for the fill. */
export const MOED_MAX_POKERS = 3;
/** Follow and stay knights notice Klodder within this many blocks along each axis; guards within the second. */
export const NOTICE_NEAR = 8;
export const NOTICE_GUARD = 16;
/** A knight this close pokes. */
export const POKE_REACH = 1.5;
/** Loop ms between two "Tok!" lines of one fight. */
const TOK_GAP_MS = 4000;

export const HINT_TEXT = 'Klodder wordt vanzelf moe. Een ridder kan hem sneller wegsturen.';

const tokClock = new WeakMap<KlodderState, number>();

function near(a: { x: number; z: number }, b: { x: number; z: number }, d: number): boolean {
  return Math.abs(a.x - b.x) <= d && Math.abs(a.z - b.z) <= d;
}

function freeAll(ctx: MonsterContext): void {
  for (const kn of ctx.knights()) kn.chase = null;
}

function pokes(kn: KnightState, k: KlodderState): boolean {
  const b = kn.body;
  return near(b, k, POKE_REACH) && Math.abs(b.y - k.y) <= 2;
}

/**
 * One step of loop time. Returns true when the bar is full and Klodder must leave: it says "Wegwezen!" and
 * "Doei!" and frees every `chase`. The system sets `leaving`.
 */
export function stepMoed(k: KlodderState, ctx: MonsterContext): boolean {
  if (!ctx.hintShown()) {
    // The first Klodder ever (AC222): the flag is saved, the text only shows when the kid owns no knight.
    ctx.markHintShown();
    if (ctx.knights().length === 0) ctx.say(HINT_TEXT, 6000);
  }
  if (k.leaving || k.ageMs + ctx.dt * 1000 >= KLODDER_TIRED_MS) {
    freeAll(ctx);
    k.pokers = 0;
    return false;
  }
  let pokers = 0;
  const krachts: number[] = [];
  for (const kn of ctx.knights()) {
    if (!kn.visible) {
      kn.chase = null;
      continue;
    }
    const reach = (kn.mode === 'guard' ? NOTICE_GUARD : NOTICE_NEAR) + noticeBonus(kn.gear);
    if (near(kn.body, k, reach)) {
      kn.chase = { x: k.x, z: k.z };
      if (pokes(kn, k)) {
        pokers++;
        kn.poking = true;
        if (krachts.length < MOED_MAX_POKERS) krachts.push(kracht(kn.gear));
      }
    } else {
      kn.chase = null;
    }
  }
  k.pokers = pokers;
  if (pokers === 0) {
    tokClock.delete(k);
    return false;
  }
  // While someone pokes he stands still and does not nibble.
  k.target = null;
  k.nibbleWaitMs = Math.max(k.nibbleWaitMs, 1000);
  const since = (tokClock.get(k) ?? TOK_GAP_MS) + ctx.dt * 1000;
  if (since >= TOK_GAP_MS) {
    ctx.say('Tok!', 1000);
    ctx.play('tok');
    tokClock.set(k, 0);
  } else {
    tokClock.set(k, since);
  }
  k.moed = Math.min(MOED_FULL, k.moed + moedRate(krachts, MOED_FULL) * ctx.dt);
  if (k.moed < MOED_FULL) return false;
  freeAll(ctx);
  k.pokers = 0;
  ctx.say('Wegwezen!', 1500);
  ctx.say('Doei!', 1500);
  ctx.play('doei');
  return true;
}

/** Bar fraction 0 to 1 for the drawing (V18d draws it over Klodder). */
export function moedFraction(k: KlodderState): number {
  return Math.min(1, Math.max(0, k.moed / MOED_FULL));
}
