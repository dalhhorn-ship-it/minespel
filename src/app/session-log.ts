// The one writer for what a learning session earns (R2b, TECH_REVIEW N5).
// Break and practice both use it. Exam keeps its own writes.
// A points change and its ledger row land in one IndexedDB transaction. The total is read inside
// the transaction and the delta is added to it, so a change by another writer (a golden egg,
// a restore) between two answers is kept and not overwritten by the session's own copy.

import type { Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import type { Response } from '../learning/answer-check';
import { request, transact } from '../storage/db';
import type { LedgerInput, LedgerReason } from '../storage/log-store';
import { defaultKv, type EconomyRecord } from '../storage/schema';

export interface PointsWrite {
  /** The session's economy after the change. Its day counters are kept; its total is not. */
  sessionEconomy: EconomyRecord;
  /** Net points really applied (plus or minus). */
  applied: number;
  ts: number;
  day: string;
  /** Used for a gain. A loss is always written as `malus`. */
  reason: Extract<LedgerReason, 'break' | 'practice'>;
}

/** Adds `applied` to the stored total and writes the ledger row, all or nothing. Returns the new total. */
export async function writeEffects(db: IDBDatabase, write: PointsWrite): Promise<number> {
  return transact(db, ['kv', 'ledger'], 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    const raw = await request<Partial<EconomyRecord> | undefined>(kv.get('economy'));
    const current: EconomyRecord = { ...defaultKv('economy'), ...(raw ?? {}) };
    const points = Math.max(0, current.points + write.applied);
    const next: EconomyRecord = { ...write.sessionEconomy, points };
    await request(kv.put(next, 'economy'));
    if (write.applied !== 0) {
      const row: LedgerInput = {
        ts: write.ts,
        day: write.day,
        delta: write.applied,
        reason: write.applied < 0 ? 'malus' : write.reason,
      };
      await request(tx.objectStore('ledger').add(row));
    }
    return points;
  });
}

export function formatGivenResponse(item: Item, response: Response): string {
  switch (response.type) {
    case 'choice':
      return item.type === 'choice' ? (item.options[response.index] ?? String(response.index)) : String(response.index);
    case 'find-error':
      if (response.index === -1) return 'geen fout';
      return item.type === 'find-error'
        ? (item.words[response.index] ?? String(response.index))
        : String(response.index);
    case 'type':
      return response.text;
    case 'punctuate':
      return response.gaps.join(',');
  }
}

/** The lesson of the topic an item belongs to, if any. `fallbackTopicId` is used when the catalog does not know the item. */
export function lessonForItem(
  catalog: Catalog | undefined,
  moduleId: string,
  item: Item,
  fallbackTopicId = '',
): Lesson | undefined {
  if (!catalog) return undefined;
  const topicId = catalog.topicOfItem(moduleId, item.id) || fallbackTopicId;
  if (!topicId) return undefined;
  return catalog.getTopic(moduleId, topicId)?.lesson;
}
