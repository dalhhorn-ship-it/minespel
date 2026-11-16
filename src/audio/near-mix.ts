// The near sound mix (v24, decision 144, AC323 to AC326): pure rules for how loud and where a source sounds. The pan
// rule is shared with the pill arrow (`targetAngle`); the closeness runs from the start distance to the loudest distance
// of each kind; every kind has its own fixed beat; only the 2 sources with the highest closeness sound.
import type { TargetKind } from '../monsters/targets';
import { NEAR_SPECS, type NearName } from './near-recipes';

/** How one kind of source sounds (PRD v24 table). Distances in blocks, beats in loop ms. */
export interface NearKindSpec {
  name: NearName;
  /** The beat: a fixed time between two plays. It never changes with the distance (AC323). */
  everyMs: number;
  /** From this distance on the sound is heard (closeness 0 at or beyond it). */
  start: number;
  /** At this distance or nearer the sound is at its peak (closeness 1). */
  loudest: number;
}

export const NEAR_KINDS: Record<TargetKind, NearKindSpec> = {
  bubble: { name: 'blub', everyMs: 1500, start: 16, loudest: 3 },
  klodder: { name: 'giechel', everyMs: 2500, start: 20, loudest: 3 },
  mole: { name: 'snuffel', everyMs: 2000, start: 20, loudest: 3 },
  'mole-caught': { name: 'snurk', everyMs: 4000, start: 8, loudest: 2 },
  bar: { name: 'sis', everyMs: 2000, start: 12, loudest: 3 },
};

/** The bar's little tune plays on the same voice every 10 s, instead of the sizzle of that moment. */
export const BAR_TUNE: { name: NearName; everyMs: number } = { name: 'deuntje', everyMs: 10000 };

/** The pan of a source: half the sine of the arrow angle (degrees), so -0.5 left, 0 ahead and behind, 0.5 right (AC325). */
export function panOf(angleDeg: number): number {
  return 0.5 * Math.sin((angleDeg * Math.PI) / 180);
}

/** How close a source of this kind is, 0 to 1: 0 at the start distance or further, 1 at the loudest distance or nearer. */
export function closeness(kind: TargetKind, distance: number): number {
  const k = NEAR_KINDS[kind];
  if (!(distance === distance)) return 0;
  const c = (k.start - distance) / (k.start - k.loudest);
  return c <= 0 ? 0 : c >= 1 ? 1 : c;
}

/** The gain a voice has: the recipe peak times closeness times Volume (0 to 1). */
export function gainOf(name: NearName, level: number, volume: number): number {
  return NEAR_SPECS[name].peak * level * volume;
}

/**
 * Picks up to 2 candidates (closeness above 0) with the highest closeness. `held[i]` is the candidate index that voice i
 * holds now or -1. A tie keeps the voice it had. Writes the candidate index for each voice into `out` (-1 for none), a
 * source that already holds a voice keeping that voice. No allocation.
 */
export function pickVoices(levels: ArrayLike<number>, count: number, held: ArrayLike<number>, out: [number, number]): void {
  let a = -1;
  let b = -1;
  let ka = 0;
  let kb = 0;
  for (let i = 0; i < count; i++) {
    const level = levels[i] as number;
    if (!(level > 0)) continue;
    const key = level + (held[0] === i || held[1] === i ? 1e-9 : 0);
    if (a < 0 || key > ka) {
      b = a;
      kb = ka;
      a = i;
      ka = key;
    } else if (b < 0 || key > kb) {
      b = i;
      kb = key;
    }
  }
  out[0] = -1;
  out[1] = -1;
  for (const pick of [a, b]) {
    if (pick < 0) continue;
    if (held[0] === pick) out[0] = pick;
    else if (held[1] === pick) out[1] = pick;
  }
  for (const pick of [a, b]) {
    if (pick < 0 || out[0] === pick || out[1] === pick) continue;
    if (out[0] < 0) out[0] = pick;
    else out[1] = pick;
  }
}
