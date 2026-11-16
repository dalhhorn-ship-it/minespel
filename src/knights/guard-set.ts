// Who a knight on Pas op de dieren guards (v22, AC331) and the shield marks (AC333). A guard knight watches the 4
// target animals nearest to his spot within 7 blocks, never two knights on one animal. The sets are recomputed every
// 1000 ms of loop time and nowhere else; the marks are world labels shown while a free or away mole exists, and for
// 5 seconds after the kid taps a guarding knight. Nothing here allocates per frame beyond the label projection.
import { isCalled, type DinoState } from '../dinos/dino-ai';
import type { CameraPose } from '../render/renderer';
import { labelPoint, type ActorLabels } from '../ui/actor-labels';
import type { KnightState } from './knight-types';

/** At most this many animals per knight (AC331). */
export const GUARD_MAX = 4;
/** Along x and z, from his spot, in blocks (AC331). */
export const GUARD_REACH = 7;
/** Loop ms between two recomputes (AC331: a replacement within 2 seconds). */
export const GUARD_EVERY_MS = 1000;
/** Loop ms the marks show after a tap on a guarding knight (AC333). */
export const MARK_TAP_MS = 5000;
export const SHIELD_TEXT = '\u{1F6E1}️';

export type GuardAnimal = DinoState & { id: string };

/** An animal a guard may watch: on Vrij rondlopen and not on a Dinofluit call. Followers and called dinos never are. */
export function isGuardable(a: DinoState): boolean {
  return a.mode === 'stay' && !isCalled(a);
}

/**
 * Fills `out` (animal id to knight id) and `refs` (the animal objects, for the marks) for the guard knights in list
 * order: each takes the nearest free animals up to 4. `scratch` is a reused array.
 */
export function computeGuards(
  knights: readonly KnightState[],
  animals: readonly GuardAnimal[],
  out: Map<string, string>,
  refs: GuardAnimal[],
  scratch: { a: GuardAnimal; d: number }[] = [],
): void {
  out.clear();
  refs.length = 0;
  for (const k of knights) {
    if (k.mode !== 'guard' || !k.visible) continue;
    const sx = k.spot ? k.spot.x : k.body.x;
    const sz = k.spot ? k.spot.z : k.body.z;
    scratch.length = 0;
    for (const a of animals) {
      if (out.has(a.id) || !isGuardable(a)) continue;
      if (Math.abs(a.x - sx) > GUARD_REACH || Math.abs(a.z - sz) > GUARD_REACH) continue;
      scratch.push({ a, d: Math.hypot(a.x - sx, a.z - sz) });
    }
    scratch.sort((p, q) => p.d - q.d);
    for (let i = 0; i < scratch.length && i < GUARD_MAX; i++) {
      const a = (scratch[i] as { a: GuardAnimal }).a;
      out.set(a.id, k.id);
      refs.push(a);
    }
  }
}

export interface GuardSetOptions {
  knights: () => readonly KnightState[];
  /** The live dinos and chickens (boot passes `dinoStore.dinos()`). Missing: nobody is guarded. */
  animals?: () => readonly GuardAnimal[];
  labels?: ActorLabels;
  /** True while a free or away mole exists: the marks show. */
  moleAround?: () => boolean;
  pose?: () => CameraPose;
  viewport?: () => { width: number; height: number };
}

export interface GuardSet {
  guardedBy(animalId: string): string | null;
  state(): { animalId: string; knightId: string }[];
  /** One step of loop seconds: recomputes every 1000 ms, then moves the marks. */
  step(dt: number): void;
  /** The kid tapped a knight: the marks of his animals show for 5 seconds. */
  tapped(knightId: string): void;
}

export function createGuardSet(options: GuardSetOptions): GuardSet {
  const guards = new Map<string, string>();
  const refs: GuardAnimal[] = [];
  const scratch: { a: GuardAnimal; d: number }[] = [];
  /** Label keys that show now. */
  const shown = new Set<string>();
  /** Which animal ids the tap marks: the tapped knight's. */
  let tapKnight: string | null = null;
  let tapMs = 0;
  let sinceMs = GUARD_EVERY_MS;

  const key = (id: string) => `shield-${id}`;

  function wanted(id: string): boolean {
    if (options.moleAround?.()) return true;
    return tapMs > 0 && tapKnight !== null && guards.get(id) === tapKnight;
  }

  function sync(): void {
    const labels = options.labels;
    if (!labels) return;
    for (const k of shown) {
      const id = k.slice(7);
      if (!guards.has(id) || !wanted(id)) {
        labels.hide(k);
        shown.delete(k);
      }
    }
    for (const id of guards.keys()) {
      if (shown.has(key(id)) || !wanted(id)) continue;
      if (labels.show(key(id), SHIELD_TEXT, 'shield')) shown.add(key(id));
    }
  }

  function place(): void {
    const labels = options.labels;
    if (!labels || shown.size === 0 || !options.pose || !options.viewport) return;
    const pose = options.pose();
    const { width, height } = options.viewport();
    for (const a of refs) {
      if (shown.has(key(a.id))) labels.place(key(a.id), labelPoint(pose, width, height, { x: a.x, y: a.y + 1.4, z: a.z }));
    }
  }

  return {
    guardedBy: (id) => guards.get(id) ?? null,
    state: () => [...guards].map(([animalId, knightId]) => ({ animalId, knightId })),
    step(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      sinceMs += dt * 1000;
      if (tapMs > 0) tapMs = Math.max(0, tapMs - dt * 1000);
      if (sinceMs >= GUARD_EVERY_MS) {
        sinceMs = 0;
        computeGuards(options.knights(), options.animals?.() ?? [], guards, refs, scratch);
        sync();
      } else if (options.labels && Math.floor(sinceMs / 100) !== Math.floor((sinceMs - dt * 1000) / 100)) {
        // The mole may come or go and the tap time may run out between two recomputes: marks follow within 100 ms.
        sync();
      }
      place();
    },
    tapped(knightId) {
      let any = false;
      for (const v of guards.values()) if (v === knightId) any = true;
      if (!any) return;
      tapKnight = knightId;
      tapMs = MARK_TAP_MS;
      sync();
    },
  };
}
