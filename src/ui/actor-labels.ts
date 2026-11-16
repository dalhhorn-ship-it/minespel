// World labels (v22, decision 144): the short words and signs that float over an animal, a knight or a mole:
// "Hihi!", Zzz, the "Gevangen!" sign, the guard shield and the snack hearts. One shared pool of at most 16 DOM nodes.
// Owners call `show` and `hide` when something starts or ends and `place` once a frame with the projected point
// (`labelPoint` projects with `screenPointOf`). The DOM is written only when something changed, never while the
// game is not running. textContent only, no taps (`pointer-events: none`), no network.
import '../styles/actor-labels.css';
import { screenPointOf } from '../game/actor-hit';
import type { CameraPose } from '../render/renderer';

export const MAX_LABELS = 16;
/** A label farther away than this many blocks is hidden. */
export const LABEL_RANGE = 16;

export type LabelStyle = 'speech' | 'zzz' | 'sign' | 'shield' | 'snack';

export interface ActorLabels {
  /** Shows or changes the label under `key`. `ms` of loop time until it hides by itself, none: until `hide`. False when all 16 are in use. */
  show(key: string, text: string, style: LabelStyle, ms?: number): boolean;
  hide(key: string): void;
  /** Where the label goes (css pixels), or null: hidden for now (behind the camera or too far). Call once a frame. */
  place(key: string, at: { x: number; y: number } | null): void;
  /** Counts the `ms` down by `dt` loop seconds. */
  step(dt: number): void;
  /** False: every label is hidden and the times stop. True: they show again where they were. */
  setRunning(on: boolean): void;
  /** Labels in use now. */
  count(): number;
  has(key: string): boolean;
}

/** The screen point of a world point, or null when it is behind the camera or beyond 16 blocks of the pose. */
export function labelPoint(
  pose: CameraPose, width: number, height: number, p: { x: number; y: number; z: number },
): { x: number; y: number } | null {
  if (Math.hypot(p.x - pose.x, p.z - pose.z) > LABEL_RANGE) return null;
  return screenPointOf(pose, width, height, p);
}

interface Slot {
  node: HTMLElement;
  key: string | null;
  text: string;
  style: LabelStyle | '';
  msLeft: number;
  at: { x: number; y: number } | null;
  // What the DOM holds now, so nothing is written twice.
  domText: string;
  domStyle: string;
  domShown: boolean;
  domX: number;
  domY: number;
}

export interface ActorLabelsOptions {
  container: HTMLElement;
}

export function createActorLabels(options: ActorLabelsOptions): ActorLabels {
  const slots: Slot[] = [];
  const byKey = new Map<string, Slot>();
  let running = true;

  function makeSlot(): Slot | null {
    if (slots.length >= MAX_LABELS) return null;
    const node = document.createElement('div');
    node.className = 'actor-label';
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
    options.container.append(node);
    const slot: Slot = { node, key: null, text: '', style: '', msLeft: Infinity, at: null, domText: '', domStyle: '', domShown: false, domX: NaN, domY: NaN };
    slots.push(slot);
    return slot;
  }

  /** Writes the slot to the DOM, changing only what differs. */
  function paint(s: Slot): void {
    const shown = running && s.key !== null && s.at !== null;
    if (s.text !== s.domText) {
      s.node.textContent = s.text;
      s.domText = s.text;
    }
    if (s.style !== s.domStyle) {
      s.node.className = s.style ? `actor-label actor-label-${s.style}` : 'actor-label';
      s.domStyle = s.style;
    }
    if (shown && s.at) {
      const x = Math.round(s.at.x);
      const y = Math.round(s.at.y);
      if (x !== s.domX || y !== s.domY) {
        s.node.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        s.domX = x;
        s.domY = y;
      }
    }
    if (shown !== s.domShown) {
      s.node.hidden = !shown;
      s.domShown = shown;
    }
  }

  function free(s: Slot): void {
    if (s.key !== null) byKey.delete(s.key);
    s.key = null;
    s.text = '';
    s.style = '';
    s.at = null;
    s.msLeft = Infinity;
    paint(s);
  }

  return {
    show(key, text, style, ms) {
      if (typeof text !== 'string' || text.length === 0) return false;
      let s = byKey.get(key);
      if (!s) {
        s = slots.find((x) => x.key === null) ?? makeSlot() ?? undefined;
        if (!s) return false;
        s.key = key;
        s.at = null;
        byKey.set(key, s);
      }
      s.text = text;
      s.style = style;
      s.msLeft = ms !== undefined && Number.isFinite(ms) && ms > 0 ? ms : Infinity;
      paint(s);
      return true;
    },
    hide(key) {
      const s = byKey.get(key);
      if (s) free(s);
    },
    place(key, at) {
      const s = byKey.get(key);
      if (!s) return;
      const same = s.at === null ? at === null : at !== null && s.at.x === at.x && s.at.y === at.y;
      if (same) return;
      s.at = at ? { x: at.x, y: at.y } : null;
      paint(s);
    },
    step(dt) {
      if (!running || !(dt > 0) || !Number.isFinite(dt)) return;
      for (const s of slots) {
        if (s.key === null || s.msLeft === Infinity) continue;
        s.msLeft -= dt * 1000;
        if (s.msLeft <= 0) free(s);
      }
    },
    setRunning(on) {
      if (on === running) return;
      running = on;
      for (const s of slots) if (s.key !== null) paint(s);
    },
    count: () => byKey.size,
    has: (key) => byKey.has(key),
  };
}
