// Egg timing. Pure: the caller passes only play time, so breaks and menus pause the egg (AC150).
import type { DinoKindId } from './kinds';

/** Seconds of play before an egg hatches. */
export const EGG_HATCH_SECONDS = 5;
/** Seconds a new dino takes to grow from baby to full size. */
export const GROW_SECONDS = 2;
/** Size of a dino at the moment it hatches, as a fraction of the grown size. */
export const BABY_SCALE = 0.5;

export interface EggState {
  kind: DinoKindId;
  golden: boolean;
  /** Where the egg lies (feet centre). */
  x: number;
  y: number;
  z: number;
  /** Seconds of play the egg has been waiting. Saved, so a reopen keeps the progress. */
  playSeconds: number;
}

export interface HatchSpot {
  kind: DinoKindId;
  golden: boolean;
  x: number;
  y: number;
  z: number;
}

export function createEgg(kind: DinoKindId, golden: boolean, x: number, y: number, z: number, playSeconds = 0): EggState {
  return { kind, golden, x, y, z, playSeconds: Math.max(0, Number.isFinite(playSeconds) ? playSeconds : 0) };
}

/** Adds `playDt` seconds of play. Returns true once the egg is ready to hatch. */
export function stepEgg(egg: EggState, playDt: number): boolean {
  if (playDt > 0 && Number.isFinite(playDt)) egg.playSeconds += playDt;
  return egg.playSeconds >= EGG_HATCH_SECONDS;
}

export function hatchTimeLeft(egg: EggState): number {
  return Math.max(0, EGG_HATCH_SECONDS - egg.playSeconds);
}

/** What a hatched egg leaves behind. The dino itself is made with `createDino`. */
export function hatchSpot(egg: EggState): HatchSpot {
  return { kind: egg.kind, golden: egg.golden, x: egg.x, y: egg.y, z: egg.z };
}

/** Size factor after `growth` seconds of life: BABY_SCALE at 0, 1 at GROW_SECONDS. */
export function growthScale(growth: number): number {
  const t = Math.min(1, Math.max(0, growth / GROW_SECONDS));
  return BABY_SCALE + (1 - BABY_SCALE) * t;
}
