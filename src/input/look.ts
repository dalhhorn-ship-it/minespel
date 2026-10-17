// Right half: drag to look around, quick short touch is a tap (AC104).
import { classifyTouch } from './touch-classify';
import type { PointerOwner } from './pointer-router';

export interface LookOptions {
  /** Called once for a tap, with screen coordinates. */
  onTap: (x: number, y: number) => void;
  now?: () => number;
}

export interface Look extends PointerOwner {
  /** Pixels dragged since the last call. Resets to zero. */
  consumeDelta(): { dx: number; dy: number };
}

export function createLook(options: LookOptions): Look {
  const now = options.now ?? (() => performance.now());
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
      startT = now();
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
      const kind = classifyTouch(e.clientX - startX, e.clientY - startY, now() - startT);
      if (kind === 'tap') options.onTap(e.clientX, e.clientY);
    },
    cancel(e) {
      if (e.pointerId === id) id = null;
    },
  };
}
