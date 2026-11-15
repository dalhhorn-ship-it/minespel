// Klodder, the black monster (v18). STUB until V18b: he stands where the bubble was, counts his age and tires
// after 5 minutes (then leaves), so a game with the stub never gets stuck with him. V18b adds walking, nibbles,
// keeping away from the kid and the restore; the exported names stay.
import type { Box } from '../world/build';
import { KLODDER_BOX, KLODDER_TIRED_MS, type KlodderState, type MonsterContext } from './monster-types';

export type KlodderResult = 'left' | null;

/** Klodder jumps out of the bubble at `at` (feet position). V18b adds "Hihihi!" and the jump. */
export function createKlodder(at: { x: number; y: number; z: number }): KlodderState {
  return {
    x: at.x, y: at.y, z: at.z, heading: 0, ageMs: 0, nibbled: 0, nibbleWaitMs: 0, target: null,
    moed: 0, pokers: 0, tired: false, leaving: false,
  };
}

export function klodderBox(k: KlodderState): Box {
  const h = KLODDER_BOX.side / 2;
  return [k.x - h, k.y, k.z - h, k.x + h, k.y + KLODDER_BOX.height, k.z + h];
}

/**
 * One step of loop time. Returns 'left' when he is gone for good, and then every hidden cell is back
 * (`restoreAll` is V18b; the stub nibbles nothing). The system unhides stragglers either way.
 */
export function stepKlodder(k: KlodderState, ctx: MonsterContext): KlodderResult {
  k.ageMs += ctx.dt * 1000;
  if (k.ageMs >= KLODDER_TIRED_MS) {
    k.tired = true;
    k.leaving = true;
  }
  return k.leaving ? 'left' : null;
}
