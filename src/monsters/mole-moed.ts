// The mole's Moed bar (v16, decision 138). STUB until V16d: knights notice him within 8 along x and z (16 on guard),
// poke him within 1.5, the bar is full at MOLE_MOED_FULL and then the knights say "Wegwezen!". The system already calls it.
import { MOLE_MOED_FULL, type MoleState, type MonsterContext } from './monster-types';

/**
 * One step of loop time while the mole is out. Returns true when the bar is full and he must leave: it says
 * "Wegwezen!" and "Oké, oké, ik ga al!" and sets every `chase` on him to null. The system then starts `leaving`.
 */
export function stepMoleMoed(mole: MoleState, ctx: MonsterContext): boolean {
  void mole;
  void ctx;
  return false;
}

/** Bar fraction 0 to 1 for the Moed bar. */
export function moleMoedFraction(mole: MoleState): number {
  return Math.min(1, Math.max(0, mole.moed / MOLE_MOED_FULL));
}
