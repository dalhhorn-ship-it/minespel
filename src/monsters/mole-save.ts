// Saving the moles (v22, decision 144, AC299 and AC335). V22a holds the record, the backup check and the read; V22c
// adds the writer (what the slot saves on every change of caught, freed, away or gone, and about every second while the
// free mole walks or an away mole counts down).
import type { SavedMole } from '../storage/schema';
import type { MoleState } from './monster-types';

export type { SavedMole };

/** At most this many moles are saved: 3 caught and 1 free or away (AC298). */
export const MAX_SAVED_MOLES = 4;
/** The longest time an away mole is saved with: 90 seconds of play time (AC330). */
export const MAX_AWAY_MS = 90_000;
/** An away mole saved with no time left value reads as the shortest away time. */
export const DEFAULT_AWAY_MS = 60_000;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inside = (n: unknown, max: number): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

/**
 * The backup check of `monsters.moles` (formats 6 and 7). Missing is fine. Otherwise an array of at most 4, at most
 * 1 that is free or away, every spot finite and inside the world (`size` wide, `height` high), `awayMs` only on an
 * away mole and a whole number from 0 to 90 000. Never throws.
 */
export function checkMoles(raw: unknown, size: number, height: number): boolean {
  if (raw === undefined) return true;
  if (!Array.isArray(raw) || raw.length > MAX_SAVED_MOLES) return false;
  let notCaught = 0;
  for (const m of raw) {
    if (!isObj(m)) return false;
    if (!inside(m.x, size) || !inside(m.y, height) || !inside(m.z, size)) return false;
    if (m.state !== 'free' && m.state !== 'away' && m.state !== 'caught') return false;
    if (m.state !== 'caught') notCaught++;
    if (m.awayMs !== undefined) {
      if (m.state !== 'away') return false;
      if (typeof m.awayMs !== 'number' || !Number.isInteger(m.awayMs) || m.awayMs < 0 || m.awayMs > MAX_AWAY_MS) return false;
    }
  }
  return notCaught <= 1;
}

/** The moles of a record as clean copies. A bad or missing list gives []. Never throws. */
export function readMoles(record: { moles?: unknown }): SavedMole[] {
  const raw = record.moles;
  if (!Array.isArray(raw)) return [];
  const out: SavedMole[] = [];
  let notCaught = 0;
  for (const m of raw) {
    if (out.length >= MAX_SAVED_MOLES || !isObj(m)) continue;
    const { x, y, z, state } = m;
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || ![x, y, z].every(Number.isFinite)) continue;
    if (state !== 'free' && state !== 'away' && state !== 'caught') continue;
    if (state !== 'caught' && ++notCaught > 1) continue;
    if (state === 'away') {
      const a = m.awayMs;
      const awayMs = typeof a === 'number' && Number.isFinite(a) ? Math.min(MAX_AWAY_MS, Math.max(0, Math.round(a))) : DEFAULT_AWAY_MS;
      out.push({ x, y, z, state, awayMs });
    } else out.push({ x, y, z, state });
  }
  return out;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The row of one mole, or null for a rumble (nothing is saved of it, AC299). A caught mole and a free one keep their
 * feet spot; an away mole (also one that is still sinking with `dove` set) keeps where he dove under and the play time
 * left, a whole number from 0 to 90 000. `groundY` is the feet level where he dove, as he has sunk since.
 */
export function toSavedMole(m: Pick<MoleState, 'caught' | 'phase' | 'dove' | 'x' | 'y' | 'z' | 'awayMs'>, groundY: number): SavedMole | null {
  if (m.phase === 'rumble' || m.phase === 'none') return null;
  if (m.phase === 'away' || (m.phase === 'leaving' && m.dove)) {
    const at = m.dove ?? m;
    const awayMs = Math.min(MAX_AWAY_MS, Math.max(0, Math.round(m.awayMs)));
    return { x: round2(at.x), y: round2(groundY), z: round2(at.z), state: 'away', awayMs };
  }
  if (m.phase !== 'out') return null;
  return { x: round2(m.x), y: round2(m.y), z: round2(m.z), state: m.caught ? 'caught' : 'free' };
}

/** True when two lists hold the same rows (an away time within `awayTolerance` ms counts as the same), so nothing is written twice. */
export function sameMoles(a: readonly SavedMole[], b: readonly SavedMole[], awayTolerance = 0): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const p = a[i] as SavedMole;
    const q = b[i] as SavedMole;
    if (p.x !== q.x || p.y !== q.y || p.z !== q.z || p.state !== q.state || Math.abs((p.awayMs ?? -1) - (q.awayMs ?? -1)) > awayTolerance) return false;
  }
  return true;
}
