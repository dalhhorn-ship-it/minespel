// The lavakip snack (v23, decision 144): for 3 seconds an animal or a knight stands and munches, dances a little and
// gets hearts. V22a holds the seam: `stepDino` and the knight step call `snackStep` first and skip their normal step
// while it returns true. V23c fills it (3000 ms, the dance, the hop, the heading back, no rng, never saved).
import type { DinoState } from '../dinos/dino-ai';

/** The snack of one animal or knight: loop ms left and the heading to turn back to. Never saved. */
export interface Snack {
  ms: number;
  heading: number;
}

/**
 * Steps the snack of `body` by `dt` seconds. True while the body is snacking, so the caller does nothing else with it
 * this frame. Nobody snacks until V23c, so this gives false and changes nothing.
 */
export function snackStep(body: Pick<DinoState, 'snack'>, dt: number): boolean {
  void body;
  void dt;
  return false;
}
