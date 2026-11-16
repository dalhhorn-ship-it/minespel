// Types and caps of the knights (v17 Ridders, decision 135). No logic here, so every knight file can import it.
import type { DinoState } from '../dinos/dino-ai';
import type { Cell } from '../monsters/monster-types';
import { KNIGHT_MODES, type KnightMode, type KnightRecord } from '../storage/schema';

export { KNIGHT_MODES };
export type { KnightMode, KnightRecord };

/** A kid owns at most this many knights (AC200). */
export const MAX_KNIGHTS = 3;
/** Points a knight costs and what a trade in gives back (AC200, AC201). */
export const KNIGHT_PRICE = 30;
export const KNIGHT_TRADEIN = 15;
/** The body box a knight steps with: 0.6 wide, 1.8 high (like a villager). */
export const KNIGHT_BOX = { side: 0.6, height: 1.8 } as const;
/** A new knight, a reset or a follower on load stands within this many blocks of the kid (AC209). */
export const KNIGHT_NEAR = 3;
/** A tap hits a knight at most this far away, in blocks. */
export const KNIGHT_TAP_REACH = 6;
/** Seconds of loop time between two salutes of one knight is 60 (V17b); kept here as ms for every user. */
export const SALUTE_GAP_MS = 60_000;

export type KnightEvent = 'arrived' | 'salute';

/** One live knight: the saved record plus the parts that are never saved. */
export interface KnightState {
  id: string;
  mode: KnightMode;
  spot: { x: number; y: number; z: number } | null;
  boughtFor: number;
  /** Position and walking state, from `createDino`. Always stepped with `KNIGHT_BOX`. */
  body: DinoState;
  /** Set while he walks to something; null: he is back in his mode (V17b). Never saved. */
  chase: { x: number; z: number; y?: number } | null;
  /** The cells of the path search to the target (V16d), consumed as he walks. Never saved. */
  chasePath?: Cell[] | null;
  /** Loop ms until the next path search while he chases (V16d). Never saved. */
  searchMs?: number;
  /** Loop time in ms since the last salute (V17b). Never saved. */
  saluteClockMs: number;
  /** False while knights are switched off: he waves and hides. */
  visible: boolean;
}

export function toRecord(k: Pick<KnightState, 'id' | 'mode' | 'spot' | 'boughtFor'>): KnightRecord {
  return { id: k.id, mode: k.mode, spot: k.spot ? { ...k.spot } : null, boughtFor: k.boughtFor };
}
