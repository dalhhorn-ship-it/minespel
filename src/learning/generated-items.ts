// Saved wrong plus and minus sums for Rekenen (T38, PRD 4.10, AC63, AC126).
// Table and division facts are a fixed set, so they always live in progress once seen.
// Plus and minus sums (`optellen`, `aftrekken`) are open: a sum answered wrong on the first try
// is saved in box 1 and follows the boxes from there (also after it is answered right later).
// It is never offered as a new sum again. At most the 200 newest saved sums per topic are kept.

import { REKENEN_MODULE_ID } from '../content/catalog';
import type { ProgressRecord, ProgressStore } from '../storage/progress-store';

export const MAX_SAVED_SUMS_PER_TOPIC = 200;

export function isGeneratedSumTopic(moduleId: string, topicId: string): boolean {
  return moduleId === REKENEN_MODULE_ID && (topicId === 'optellen' || topicId === 'aftrekken');
}

/**
 * Decides whether a first-try answer on an item should be written to the progress store.
 * Fixed items are always written. Open Rekenen sums (`optellen`, `aftrekken`) are written
 * when answered wrong on the first try (new save in box 1) or when already saved earlier
 * (`existingBox > 0`, so they move to box 2..5 and follow the boxes, AC63).
 */
export function shouldSaveProgress(
  moduleId: string,
  topicId: string,
  existingBox: number,
  firstTryRight: boolean,
): boolean {
  if (!isGeneratedSumTopic(moduleId, topicId)) return true;
  return existingBox > 0 || !firstTryRight;
}

/**
 * All item ids saved in progress for an open Rekenen topic (`optellen` or `aftrekken`).
 * Pass this set as `exclude` to `generateItems` so a saved sum is never offered as new again (AC63).
 */
export function savedSumIds(
  progress: readonly ProgressRecord[],
  topicId?: string,
): Set<string> {
  const out = new Set<string>();
  for (const p of progress) {
    if (p.moduleId !== REKENEN_MODULE_ID) continue;
    if (topicId !== undefined && p.topic !== topicId) continue;
    if (isGeneratedSumTopic(p.moduleId, p.topic)) {
      out.add(p.itemId);
    }
  }
  return out;
}

/**
 * Splits the saved sums of one open topic (`optellen` or `aftrekken`) into the newest `max`
 * to keep and any older ones to remove (AC126).
 */
export function pruneSavedSumsForTopic(
  records: readonly ProgressRecord[],
  topicId: string,
  max: number = MAX_SAVED_SUMS_PER_TOPIC,
): { keep: ProgressRecord[]; remove: ProgressRecord[] } {
  const indexed = records
    .map((r, index) => ({ r, index }))
    .filter(({ r }) => r.moduleId === REKENEN_MODULE_ID && r.topic === topicId);

  if (indexed.length <= max) {
    return { keep: indexed.map((x) => x.r), remove: [] };
  }

  // Newest first: compare savedAt descending, then array index descending.
  indexed.sort((a, b) => {
    const ta = a.r.savedAt ?? 0;
    const tb = b.r.savedAt ?? 0;
    if (tb !== ta) return tb - ta;
    return b.index - a.index;
  });

  return {
    keep: indexed.slice(0, max).map((x) => x.r),
    remove: indexed.slice(max).map((x) => x.r),
  };
}

/**
 * Records a first-try box update in `progress` (in memory array) and prunes open Rekenen topics
 * to the 200 newest saved sums per topic. Pure helper used by tests and flows.
 */
export function applyProgressUpdate(
  progress: readonly ProgressRecord[],
  update: {
    moduleId: string;
    itemId: string;
    topic: string;
    skill: string;
    level: string | number;
    box: number;
    due: string;
    firstTryRight: boolean;
    at: number;
  },
  maxPerTopic: number = MAX_SAVED_SUMS_PER_TOPIC,
): { records: ProgressRecord[]; removedIds: string[] } {
  const existing = progress.find(
    (p) => p.moduleId === update.moduleId && p.itemId === update.itemId,
  );
  const existingBox = existing?.box ?? 0;

  if (!shouldSaveProgress(update.moduleId, update.topic, existingBox, update.firstTryRight)) {
    return { records: [...progress], removedIds: [] };
  }

  const nextRecord: ProgressRecord = {
    moduleId: update.moduleId,
    itemId: update.itemId,
    topic: update.topic,
    skill: update.skill,
    level: existing?.level ?? update.level,
    box: update.box,
    due: update.due,
    seen: (existing?.seen ?? 0) + 1,
    ...(isGeneratedSumTopic(update.moduleId, update.topic)
      ? { savedAt: existing?.savedAt ?? update.at }
      : {}),
  };

  const without = progress.filter(
    (p) => !(p.moduleId === update.moduleId && p.itemId === update.itemId),
  );
  const combined = [...without, nextRecord];

  if (!isGeneratedSumTopic(update.moduleId, update.topic)) {
    return { records: combined, removedIds: [] };
  }

  const { remove } = pruneSavedSumsForTopic(combined, update.topic, maxPerTopic);
  if (remove.length === 0) {
    return { records: combined, removedIds: [] };
  }
  const removeSet = new Set(remove.map((r) => r.itemId));
  return {
    records: combined.filter(
      (p) => !(p.moduleId === REKENEN_MODULE_ID && p.topic === update.topic && removeSet.has(p.itemId)),
    ),
    removedIds: [...removeSet],
  };
}

/** Writes a progress update to IndexedDB and enforces the 200-newest cap for open Rekenen topics. */
export async function saveProgressWithCap(
  store: ProgressStore,
  update: {
    moduleId: string;
    itemId: string;
    topic: string;
    skill: string;
    level: string | number;
    box: number;
    due: string;
    firstTryRight: boolean;
    at: number;
  },
  maxPerTopic: number = MAX_SAVED_SUMS_PER_TOPIC,
): Promise<void> {
  const moduleRecords = await store.list(update.moduleId);
  const { records, removedIds } = applyProgressUpdate(moduleRecords, update, maxPerTopic);
  const updated = records.find(
    (p) => p.moduleId === update.moduleId && p.itemId === update.itemId,
  );
  if (!updated) return;
  await store.put(updated);
  if (removedIds.length > 0) {
    // Rewrite only the kept records of that topic if any were pruned.
    const topicKept = records.filter((p) => p.topic === update.topic);
    await store.deleteByTopic(update.moduleId, update.topic);
    for (const r of topicKept) {
      await store.put(r);
    }
  }
}
