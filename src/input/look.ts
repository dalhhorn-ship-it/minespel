// Right half: drag to look around, quick short touch is a tap (AC104).
import { classifyTouch } from './touch-classify';
import type { PointerOwner } from './pointer-router';

export interface LookOptions {
  /** Called once for a tap, with screen coordinates. */
  onTap: (x: number, y: number) => void;
  /** Test clock. Without it the time of each event itself is used (`event.timeStamp`), see `stamp`. */
  now?: () => number;
}

export interface Look extends PointerOwner {
  /** Pixels dragged since the last call. Resets to zero. */
  consumeDelta(): { dx: number; dy: number };
}

export function createLook(options: LookOptions): Look {
  // The tap is measured from the time the browser made the events, not from when a handler runs. The first pointerup
  // of a page first runs the audio unlock (a capture listener), which can take over 300 ms on a busy iPad. Reading the
  // clock in our own handler would then read that delay as a long press or a drag.
  const stamp = (e: PointerEvent): number => {
    if (options.now) return options.now();
    return Number.isFinite(e.timeStamp) && e.timeStamp > 0 ? e.timeStamp : performance.now();
  };
  let id: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startT = 0;
  let accX = 0;
  let accY = 0;

  return {
    consumeDelta() {
      const d = { dx: accX, dy: accY };
      accX = 0;
      accY = 0;
      return d;
    },
    down(e) {
      id = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      startT = stamp(e);
    },
    move(e) {
      if (e.pointerId !== id) return;
      accX += e.clientX - lastX;
      accY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    },
    up(e) {
      if (e.pointerId !== id) return;
      id = null;
      const kind = classifyTouch(e.clientX - startX, e.clientY - startY, stamp(e) - startT);
      if (kind === 'tap') options.onTap(e.clientX, e.clientY);
    },
    cancel(e) {
      if (e.pointerId === id) id = null;
    },
  };
}
