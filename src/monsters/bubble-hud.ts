// The state of the lilac bubble pill (v22, decision 144, AC301 to AC305): pure, no DOM, no timers. `computeBubbleHud`
// gives the clock text, "Bubbel komt zo!", the nearest target, the arrow angle, the distance, above or below and
// obeys the switches.
import type { ClockView } from './monster-types';
import { targetAngle, type LookPose } from './target-angle';
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

const SECOND = 1000;
/** From this many blocks up or down the pill says "boven je" or "onder je" (AC304). */
export const VERTICAL_FROM = 3;

const KIND_WORD = { bubble: 'Bubbel', klodder: 'Klodder', mole: 'Mol' } as const;

// The last line built, so a steady target costs no new string every 100 ms.
let memoKind: BubbleHudKind = 'clock';
let memoN = -1;
let memoVertical: 'above' | 'below' | null = null;
let memoText = '';

function targetText(kind: 'bubble' | 'klodder' | 'mole', n: number, vertical: 'above' | 'below' | null): string {
  if (kind === memoKind && n === memoN && vertical === memoVertical) return memoText;
  const where = vertical === 'above' ? ' boven je' : vertical === 'below' ? ' onder je' : '';
  memoText = `${KIND_WORD[kind]}: ${n} ${n === 1 ? 'blok' : 'blokken'}${where}`;
  memoKind = kind;
  memoN = n;
  memoVertical = vertical;
  return memoText;
}

/** `Bubbel over m:ss`, the seconds rounded up so the last half second reads 0:01 and never 0:00. */
export function clockText(msLeft: number): string {
  const total = Math.max(1, Math.ceil(msLeft / SECOND));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `Bubbel over ${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function hide(out: BubbleHudState): BubbleHudState {
  out.shown = false;
  out.kind = 'clock';
  out.text = '';
  out.angle = 0;
  out.distance = 0;
  out.vertical = null;
  return out;
}

/**
 * Fills `out` (and returns it): the nearest target (bubble, Klodder, free mole) with its name, distance and arrow, else
 * the clock, else nothing. The Zwarte bubbel switch (with the master and Ridders) gates the clock, the bubble and
 * Klodder; the Monstermol switch gates the mole. Caught moles and the bar are never shown (AC301, AC302, AC304, AC305).
 */
export function computeBubbleHud(input: BubbleHudInput, out: BubbleHudState): BubbleHudState {
  const { targets, pose, clock } = input;
  let best = -1;
  let bestD2 = Infinity;
  for (let i = 0; i < targets.count; i++) {
    const t = targets.items[i] as TargetList['items'][number];
    if (t.kind === 'mole') {
      if (!input.moleOn) continue;
    } else if (t.kind === 'bubble' || t.kind === 'klodder') {
      if (!input.bubbleOn) continue;
    } else continue;
    const dx = t.x - pose.x;
    const dy = t.y - pose.y;
    const dz = t.z - pose.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = i;
    }
  }
  if (best >= 0) {
    const t = targets.items[best] as TargetList['items'][number];
    const dy = t.y - pose.y;
    const vertical = dy >= VERTICAL_FROM ? 'above' : dy <= -VERTICAL_FROM ? 'below' : null;
    const n = Math.max(1, Math.round(Math.sqrt(bestD2)));
    const kind = t.kind as 'bubble' | 'klodder' | 'mole';
    out.shown = true;
    out.kind = kind;
    out.text = targetText(kind, n, vertical);
    out.angle = targetAngle(pose, t);
    out.distance = n;
    out.vertical = vertical;
    return out;
  }
  if (!input.bubbleOn || !clock.runs) return hide(out);
  out.shown = true;
  out.angle = 0;
  out.distance = 0;
  out.vertical = null;
  if (clock.held || clock.msLeft <= 0) {
    out.kind = 'soon';
    out.text = 'Bubbel komt zo!';
  } else {
    out.kind = 'clock';
    out.text = clockText(clock.msLeft);
  }
  return out;
}
