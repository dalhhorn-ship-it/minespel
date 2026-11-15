// Teasing (v18, AC220, AC221). Klodder picks one dino or chicken, never one on a Dinofluit call, never the one he
// teased last, and never a villager or a knight (they are not in the animal list). The animal jumps, plays a
// sound and runs a safe step of about 6 blocks (`startFlee` in dino-ai), then walks back. Nothing is hurt or removed.
import { isCalled, startFlee, type DinoState } from '../dinos/dino-ai';
import type { MonsterContext } from './monster-types';

/** The animals Klodder may tease. The monster system hands them in as `ctx.animals`, or boot sets them once. */
export type AnimalList = () => readonly DinoState[];
type TeaseContext = MonsterContext & { animals?: AnimalList };

/** Loop seconds between two teases while Klodder is out: 8 to 14. */
export const TEASE_MIN_S = 8;
export const TEASE_SPREAD_S = 6;

let provider: AnimalList | null = null;
let last: DinoState | null = null;
let waitS = -1;

/** Boot wiring: where the animals live (`dinoStore.dinos()`). Used when the context has no `animals`. */
export function setTeaseAnimals(list: AnimalList | null): void {
  provider = list;
}

/** Forgets the last teased animal and the timer (a new Klodder, tests). */
export function resetTease(): void {
  last = null;
  waitS = -1;
}

/** Klodder teases one dino or chicken now. Returns true when one was teased. */
export function teaseNow(ctx: MonsterContext): boolean {
  const all = (ctx as TeaseContext).animals?.() ?? provider?.() ?? [];
  const pool = all.filter((a) => a !== last && !isCalled(a) && !a.flee);
  if (pool.length === 0) return false;
  const animal = pool[Math.min(pool.length - 1, Math.floor(ctx.rng.next() * pool.length))] as DinoState;
  last = animal;
  startFlee(ctx.world, animal, ctx.rng);
  ctx.play('boing');
  return true;
}

/** Called every step while Klodder is out: a tease every 8 to 14 loop seconds. */
export function stepTease(ctx: MonsterContext, dt: number): void {
  if (waitS < 0) waitS = TEASE_MIN_S / 2;
  waitS -= dt;
  if (waitS > 0) return;
  waitS = TEASE_MIN_S + ctx.rng.next() * TEASE_SPREAD_S;
  teaseNow(ctx);
}
