// The mole's Moed bar (v16, decision 138), the pattern of moed.ts: knights notice him within 8 along x and z (16 on
// guard, plus the notice bonus of his gear) and chase him by the path search (knight-ai.ts), poke him within 1.5, the
// bar fills by the summed Kracht of the pokers per second (at most full in 3 s) and is full at MOLE_MOED_FULL. Then
// "Wegwezen!" and he runs off for 60 to 90 seconds (v22, AC329): he is never removed. A knight on Jaag monsters weg
// notices him anywhere. No knight ever goes to a caught mole (AC298). He never hurts anyone.
import { kracht, moedRate, noticeBonus } from '../knights/gear';
import type { KnightState } from '../knights/knight-types';
import { NOTICE_GUARD, NOTICE_NEAR, POKE_REACH } from './moed';
import { LINE_HELP } from './mole-lines';
import { awayTime } from './mole-slot';
import { MOLE_MOED_FULL, type MoleState, type MonsterContext } from './monster-types';

/** Pokers that count for the fill: 3 pokers take 5 s, never under 3 s. */
export const MOLE_MAX_POKERS = 3;
/** What he and the toast channel say when he is chased off (AC329). */
export const LINE_HMPF = 'Hmpf!';
export const LINE_RUNS_OFF = 'De Monstermol rent weg. Hij komt vast stiekem terug!';
/** Loop ms between two "Tok!" lines of one fight. */
const TOK_GAP_MS = 4000;

const tokClock = new WeakMap<MoleState, number>();
/** The chase object this file gave each knight: a knight whose `chase` is another object follows Klodder. */
const given = new WeakMap<KnightState, NonNullable<KnightState['chase']>>();

function near(a: { x: number; z: number }, b: { x: number; z: number }, d: number): boolean {
  return Math.abs(a.x - b.x) <= d && Math.abs(a.z - b.z) <= d;
}

/** Sets every `chase` that points at the mole to null (he left or is sent off). */
export function freeMoleChasers(ctx: MonsterContext): void {
  for (const kn of ctx.knights()) {
    const mine = given.get(kn);
    if (mine && kn.chase === mine) kn.chase = null;
    given.delete(kn);
  }
}

/**
 * One step of loop time while the mole is out. Returns true when the bar is full and he must leave: it says
 * "Wegwezen!", his "Hmpf!", the toast and the help line, sets every `chase` on him to null and gives him an away time
 * (`dove` and `awayMs`), so the slot sends him away and never removes him. A caught mole is never noticed.
 * It runs after Klodder's step, so a knight whose `chase` points to Klodder switches only when the mole is nearer.
 */
export function stepMoleMoed(mole: MoleState, ctx: MonsterContext): boolean {
  if (mole.caught) {
    freeMoleChasers(ctx);
    mole.pokers = 0;
    return false;
  }
  let pokers = 0;
  const krachts: number[] = [];
  let giggle = false;
  for (const kn of ctx.knights()) {
    const mine = given.get(kn);
    const isMine = mine !== undefined && kn.chase === mine;
    if (!kn.visible) {
      if (isMine) kn.chase = null;
      given.delete(kn);
      continue;
    }
    const b = kn.body;
    const reach = kn.mode === 'chase' ? Infinity : (kn.mode === 'guard' ? NOTICE_GUARD : NOTICE_NEAR) + noticeBonus(kn.gear);
    if (!near(b, mole, reach)) {
      if (isMine) kn.chase = null;
      given.delete(kn);
      continue;
    }
    const other = kn.chase && !isMine ? kn.chase : null;
    if (!other || Math.hypot(mole.x - b.x, mole.z - b.z) < Math.hypot(other.x - b.x, other.z - b.z)) {
      const chase = { x: mole.x, z: mole.z, y: mole.y };
      kn.chase = chase;
      given.set(kn, chase);
    }
    if (near(b, mole, POKE_REACH) && Math.abs(b.y - mole.y) <= 2) {
      pokers++;
      kn.poking = true;
      if (kn.gear?.hand === 'kietelveer') giggle = true;
      if (krachts.length < MOLE_MAX_POKERS) krachts.push(kracht(kn.gear));
    }
  }
  mole.pokers = pokers;
  if (pokers === 0) {
    tokClock.delete(mole);
    return false;
  }
  const since = (tokClock.get(mole) ?? TOK_GAP_MS) + ctx.dt * 1000;
  if (since >= TOK_GAP_MS) {
    ctx.say('Tok!', 1000);
    ctx.play('tok');
    if (giggle) ctx.play('hihihi'); // the Kietelveer tickles (AC265)
    tokClock.set(mole, 0);
  } else {
    tokClock.set(mole, since);
  }
  mole.moed = Math.min(MOLE_MOED_FULL, mole.moed + moedRate(krachts, MOLE_MOED_FULL) * ctx.dt);
  if (mole.moed < MOLE_MOED_FULL) return false;
  freeMoleChasers(ctx);
  mole.pokers = 0;
  mole.dove = { x: mole.x, z: mole.z };
  mole.awayMs = awayTime(ctx.rng);
  // AC329: "Wegwezen!", then "Hmpf!" over his head at the moment he runs (a label, as his "Hihi!"), then the toast (a mole
  // line: it cuts "Wegwezen!" to 1 s and goes next) and the help line (a mole line too: it follows the toast within 1 s).
  ctx.say('Wegwezen!', 1500);
  ctx.labels?.show(`mole-${mole.id}`, LINE_HMPF, 'speech', 1500);
  ctx.say(LINE_RUNS_OFF, 4000, 'mole');
  ctx.say(LINE_HELP, 4000, 'mole');
  return true;
}

/** Bar fraction 0 to 1 for the Moed bar. */
export function moleMoedFraction(mole: MoleState): number {
  return Math.min(1, Math.max(0, mole.moed / MOLE_MOED_FULL));
}
