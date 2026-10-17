// onTap: a pointer based tap that acts once. A second tap on the same element within
// REPEAT_MS is ignored, so a double tap never fires twice (AC117 part).

export const TAP_MOVE_LIMIT = 10; // points
export const REPEAT_MS = 350;

export interface TapOptions {
  /** Clock, injectable for tests. */
  now?: () => number;
}

export function onTap(target: HTMLElement, handler: (event: PointerEvent) => void, options: TapOptions = {}): () => void {
  const now = options.now ?? (() => performance.now());
  let activeId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastActed = -Infinity;

  const down = (e: PointerEvent) => {
    if (activeId !== null) return; // a second finger on the same button does not count
    activeId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== activeId) return;
    activeId = null;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > TAP_MOVE_LIMIT) return;
    const t = now();
    if (t - lastActed < REPEAT_MS) return;
    lastActed = t;
    handler(e);
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === activeId) activeId = null;
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', cancel);
  return () => {
    target.removeEventListener('pointerdown', down);
    target.removeEventListener('pointerup', up);
    target.removeEventListener('pointercancel', cancel);
  };
}
