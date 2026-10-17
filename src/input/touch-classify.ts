// Tap or drag rule (PRD 4.1, AC104). Pure. A touch that moves less than 10 points and
// lasts less than 300 ms is a tap. Anything else is a drag.

export const TAP_MAX_MOVE = 10; // points
export const TAP_MAX_MS = 300;

export type TouchKind = 'tap' | 'drag';

export function classifyTouch(dx: number, dy: number, ms: number): TouchKind {
  if (Math.hypot(dx, dy) >= TAP_MAX_MOVE) return 'drag';
  if (ms >= TAP_MAX_MS) return 'drag';
  return 'tap';
}
