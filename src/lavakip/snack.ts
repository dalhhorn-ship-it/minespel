// The lavakip snack (v23, decision 144): for 3 seconds an animal or a knight stands and munches, turns left and right
// twice (a silly dance) and hops twice a little. `stepDino` and the knight step call `snackStep` first and skip their
// normal step while it returns true. It reads no rng, so a seeded run only differs by the 3 seconds he stood still.
// The snack lives on the body only: never saved.
import type { DinoState } from '../dinos/dino-ai';

/** The snack of one animal or knight: loop ms left and the heading to turn back to. Never saved. */
export interface Snack {
  ms: number;
  heading: number;
  /** The ground height he hops from, so he lands exactly where he stood. */
  baseY?: number;
  /** True with reduced motion: he stands still and munches, no dance and no hop. */
  still?: boolean;
}

export const SNACK_MS = 3000;
/** The dance turns the heading this far left and right, twice. */
export const DANCE_ANGLE = Math.PI / 6;
/** The two small hops are this high in blocks. */
export const HOP_HEIGHT = 0.2;

type SnackBody = Pick<DinoState, 'snack'> & Partial<Pick<DinoState, 'heading' | 'y' | 'vy'>>;

/** Starts a snack of 3 seconds. A body that already snacks keeps its snack. True when it started. */
export function startSnack(body: SnackBody, reducedMotion = false): boolean {
  if (body.snack) return false;
  body.snack = { ms: SNACK_MS, heading: body.heading ?? 0, baseY: body.y, still: reducedMotion };
  if (body.vy !== undefined) body.vy = 0;
  return true;
}

/**
 * Steps the snack of `body` by `dt` seconds. True while the body is snacking, so the caller does nothing else with it
 * this frame. At the end the heading and the height are back where they were and the snack is gone (false).
 */
export function snackStep(body: SnackBody, dt: number): boolean {
  const s = body.snack;
  if (!s) return false;
  if (!(dt > 0) || !Number.isFinite(dt)) return true;
  s.ms -= dt * 1000;
  if (s.ms <= 0) {
    if (body.heading !== undefined) body.heading = s.heading;
    if (body.y !== undefined && s.baseY !== undefined) body.y = s.baseY;
    body.snack = undefined;
    return false;
  }
  if (!s.still) {
    const t = Math.min(1, Math.max(0, 1 - s.ms / SNACK_MS));
    if (body.heading !== undefined) body.heading = s.heading + DANCE_ANGLE * Math.sin(4 * Math.PI * t);
    if (body.y !== undefined && s.baseY !== undefined) body.y = s.baseY + HOP_HEIGHT * Math.abs(Math.sin(2 * Math.PI * t));
  }
  return true;
}
