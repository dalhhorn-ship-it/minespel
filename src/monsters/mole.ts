// The mole (v16, decision 138). STUB until V16b: `stepMole` does nothing yet, so he stands where he came up.
// V16b fills in the walk by path (mole-path.ts, path-follow.ts), "Boe!" and the tease, the fence rule, "Niemand om mee
// te spelen...", tired after MOLE_TIRED_MS and keeping clear of the kid.
//
// The contract with the monster system:
//  * `stepMole` is called every step while `phase` is `out` or `leaving`, with the loop dt in `ctx.dt` (seconds).
//  * The system adds `dt` to `phaseMs` (rumble, leaving) and `outMs` (out) BEFORE the call.
//  * To make him go, set `mole.phase = 'leaving'` (and `pose = 'sink'`); the system sees the change, plays `plop`,
//    resets `phaseMs` and removes him after LEAVE_MS. In `leaving`, `stepMole` only moves `y` down and sets the pose.
//  * `mole.x`, `y`, `z` are the feet centre; only `stepMole` (the follower) moves him, never physics.
import type { Point } from '../dinos/dino-ai';
import type { Box } from '../world/build';
import { MOLE_BOX, type MoleState, type MonsterContext } from './monster-types';

/** He comes up at `at` (feet centre) after the rumble. */
export function createMole(at: Point, digColumn: { x: number; z: number }): MoleState {
  return {
    phase: 'out', x: at.x, y: at.y, z: at.z, heading: 0, phaseMs: 0, outMs: 0, noPathMs: 0, lonelyMs: 0, searchMs: 0,
    target: null, lastTeased: null, path: null, moed: 0, pokers: 0, digColumn: { ...digColumn }, pose: 'rise',
  };
}

/** The mole during the rumble: not in the world yet, only the dig column is known. */
export function createRumble(digColumn: { x: number; z: number }, y: number): MoleState {
  return { ...createMole({ x: digColumn.x + 0.5, y, z: digColumn.z + 0.5 }, digColumn), phase: 'rumble', pose: undefined };
}

export function moleBox(m: MoleState): Box {
  const h = MOLE_BOX.side / 2;
  return [m.x - h, m.y, m.z - h, m.x + h, m.y + MOLE_BOX.height, m.z + h];
}

/** One step of loop time. V16b writes the body. */
export function stepMole(mole: MoleState, ctx: MonsterContext): void {
  // Stub: he stands still.
  void mole;
  void ctx;
}
