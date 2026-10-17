// Saved generated sums (AC63, AC126). Pure functions over progress records.
// A generated sum (optellen, aftrekken) has no stored content. The id rebuilds it, so the progress
// record (box, due day, level name) is all that is saved. A sum is saved when it was asked and
// answered wrong on the first try. Its record then stays and follows the boxes. It is never
// offered as new, because its id is in the exclude set below.
import type { ProgressRecord } from '../storage/progress-store';

/** At most this many saved sums per open topic. */
export const GENERATED_CAP = 200;

/** Saved sums of one open topic, oldest first. Age is when the sum was first saved (`added`). No `added` counts as oldest. Ties keep the given order. */
export function savedSums(records: readonly ProgressRecord[], moduleId: string, topicId: string): ProgressRecord[] {
  return records
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.moduleId === moduleId && r.topic === topicId)
    .sort((a, b) => (a.r.added ?? -1) - (b.r.added ?? -1) || a.i - b.i)
    .map(({ r }) => r);
}

/**
 * Ids that must never come back as a new sum: every saved sum of the topic (AC63) and
 * anything else in `extra`, for example the ids already asked in this break.
 */
export function newSumExclude(
  records: readonly ProgressRecord[],
  moduleId: string,
  topicId: string,
  extra: Iterable<string> = [],
): Set<string> {
  const out = new Set<string>(extra);
  for (const r of records) if (r.moduleId === moduleId && r.topic === topicId) out.add(r.itemId);
  return out;
}

/**
 * Records to delete so only the `cap` newest saved sums of the topic stay (AC126).
 * Pass the records including the one just saved. Returns the oldest ones over the cap.
 */
export function sumsToForget(
  records: readonly ProgressRecord[],
  moduleId: string,
  topicId: string,
  cap: number = GENERATED_CAP,
): ProgressRecord[] {
  const saved = savedSums(records, moduleId, topicId);
  return saved.length > cap ? saved.slice(0, saved.length - cap) : [];
}
