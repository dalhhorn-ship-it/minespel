// The state of the lilac bubble pill (v22, decision 144, AC301 to AC305): pure, no DOM, no timers. V22a holds the types
// and a stub that hides the pill; V22b fills `computeBubbleHud` (the clock text, "Bubbel komt zo!", the nearest target,
// the arrow angle, the distance, above or below, the switches).
import type { ClockView } from './monster-types';
import type { LookPose } from './target-angle';
import type { TargetList } from './targets';

/** What the pill says: the clock, the bubble about to come, the floating bubble, Klodder or the free mole. */
export type BubbleHudKind = 'clock' | 'soon' | 'bubble' | 'klodder' | 'mole';

/** One state object, reused by the flow every time (no allocation per update). */
export interface BubbleHudState {
  shown: boolean;
  kind: BubbleHudKind;
  /** The one line of the pill, for example `Bubbel over 3:20`, `Klodder: 1 blok`. Empty when not shown. */
  text: string;
  /** Degrees from where the kid looks: 0 ahead, 90 right, 180 behind, -90 left (`targetAngle`). */
  angle: number;
  /** Straight distance in blocks from the feet to the target, 0 for the clock. */
  distance: number;
  /** The target is 3 or more blocks above or below the feet, else null. */
  vertical: 'above' | 'below' | null;
}

export interface BubbleHudInput {
  clock: ClockView;
  /** The bubble, Klodder and the moles (`monsters.collectTargets`). The bar and caught moles are never shown. */
  targets: TargetList;
  /** The kid's feet and yaw. */
  pose: LookPose & { y: number };
  /** The switches: the Zwarte bubbel and the Monstermol. */
  bubbleOn: boolean;
  moleOn: boolean;
}

export function createBubbleHudState(): BubbleHudState {
  return { shown: false, kind: 'clock', text: '', angle: 0, distance: 0, vertical: null };
}

/** Fills `out` (and returns it). Hidden until V22b. */
export function computeBubbleHud(input: BubbleHudInput, out: BubbleHudState): BubbleHudState {
  void input;
  out.shown = false;
  out.kind = 'clock';
  out.text = '';
  out.angle = 0;
  out.distance = 0;
  out.vertical = null;
  return out;
}
