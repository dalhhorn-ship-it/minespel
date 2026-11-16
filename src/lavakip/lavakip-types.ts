// Types, numbers and the backup check of the Lavakip-bar (v23, decision 144). No logic beyond the check, so every
// lavakip file can import it.
import type { LavakipRecord } from '../storage/schema';

export type { LavakipRecord };

/** The food truck costs 60 points, one lavakip 3 (AC310, AC312). */
export const LAVAKIP_BAR_PRICE = 60;
export const LAVAKIP_PRICE = 3;
/** The kid carries at most this many lavakip (AC312). */
export const LAVAKIP_MAX = 10;

export interface LavakipSpot {
  x: number;
  y: number;
  z: number;
}

/** What the shop section needs (V23a fills it; the section stays hidden while `shopState()` gives undefined). */
export interface LavakipShopState {
  points: number;
  bought: boolean;
  /** The truck stands in the world ("Staat in je wereld"). */
  placed: boolean;
  carried: number;
  /** A free spot exists in front of the kid, so "Zet hier neer" works. */
  canPlaceHere: boolean;
}

/** What `lavakipState()` shows to tests. */
export interface LavakipStateView {
  bought: boolean;
  spot: LavakipSpot | null;
  carried: number;
}

/** Who may get a lavakip: a dino, golden dino or chicken (`dino`) or a knight (`knight`), by id. */
export interface FeedTarget {
  kind: 'dino' | 'knight';
  id: string;
}

/** The "Lavakip geven" entry of the dino and knight menu. `null` means the menu shows nothing (no bar or none carried). */
export interface LavakipMenuOption {
  text: string;
  /** Gives one lavakip to the target. The menu closes itself first. */
  give(): void;
}

/** What `feedState()` shows to tests. */
export interface FeedStateView {
  /** Animals and knights with a snack running now. */
  snacking: { kind: 'dino' | 'knight'; id: string; msLeft: number }[];
  fed: number;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const inside = (n: unknown, max: number): boolean => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= max;

/**
 * The backup check of the `lavakip` record (format 7). `bought` a boolean, `carried` a whole number 0 to 10, `spot`
 * null or inside the world (`size` wide, `height` high). A spot with `bought` false is refused; `bought` true with a
 * null spot is allowed and read as the home spot. Never throws.
 */
export function checkLavakip(raw: unknown, size: number, height: number): boolean {
  if (!isObj(raw)) return false;
  if (typeof raw.bought !== 'boolean') return false;
  if (typeof raw.carried !== 'number' || !Number.isInteger(raw.carried) || raw.carried < 0 || raw.carried > LAVAKIP_MAX) return false;
  const spot = raw.spot;
  if (spot === null) return true;
  if (!raw.bought || !isObj(spot)) return false;
  return inside(spot.x, size) && inside(spot.y, height) && inside(spot.z, size);
}
