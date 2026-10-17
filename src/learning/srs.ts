// Spaced repetition boxes and due days (PRD 4.6). Pure functions, no clock reads.
import { addDays, effectiveDay, isDue } from '../core/clock';

export const MAX_BOX = 5;
export const MASTERED_BOX = 4;

/** Calendar days until an item in this box is due again. Box 1 is due today (next break). */
const DUE_OFFSET: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 21 };

export interface BoxState {
  box: number;
  /** Local calendar day, "2026-10-18". */
  due: string;
}

/** Box after a first try. Right: up by 1 (0 goes to 2, max 5). Wrong: box 1. Retries never count. */
export function nextBox(box: number, firstTryRight: boolean): number {
  if (!firstTryRight) return 1;
  if (box <= 0) return 2;
  return Math.min(MAX_BOX, box + 1);
}

/** Due day for a box, counted from `today` (use the effective day). */
export function dueDayFor(box: number, today: string): string {
  const offset = DUE_OFFSET[Math.min(MAX_BOX, Math.max(1, box))] ?? 0;
  return addDays(today, offset);
}

/** New box and due day after the first try of an item. */
export function applyFirstTry(box: number, firstTryRight: boolean, today: string): BoxState {
  const next = nextBox(box, firstTryRight);
  return { box: next, due: dueDayFor(next, today) };
}

/** Mastered (beheerst) at box 4 or 5. */
export function isMastered(box: number): boolean {
  return box >= MASTERED_BOX;
}

/**
 * Is a seen item due? Box 0 (never seen) is new, not due. Uses the effective day so a clock
 * set back keeps due items due (AC118). Never changes the stored due day.
 */
export function isItemDue(
  item: { box: number; due: string },
  clockDay: string,
  lastSeenDay?: string | null,
): boolean {
  if (item.box <= 0) return false;
  return isDue(item.due, effectiveDay(clockDay, lastSeenDay));
}
