import { describe, expect, it } from 'vitest';
import { REKENEN_MODULE_ID } from '../content/catalog';
import { openDb } from '../storage/db';
import { createProgressStore, type ProgressRecord } from '../storage/progress-store';
import {
  applyProgressUpdate,
  MAX_SAVED_SUMS_PER_TOPIC,
  pruneSavedSumsForTopic,
  savedSumIds,
  saveProgressWithCap,
  shouldSaveProgress,
} from './generated-items';

describe('generated-items (T38)', () => {
  it('saves wrong plus/minus sums and keeps updating them once saved, ignores brand new right ones (AC63)', () => {
    expect(shouldSaveProgress(REKENEN_MODULE_ID, 'optellen', 0, true)).toBe(false);
    expect(shouldSaveProgress(REKENEN_MODULE_ID, 'optellen', 0, false)).toBe(true);
    expect(shouldSaveProgress(REKENEN_MODULE_ID, 'optellen', 1, true)).toBe(true);
    expect(shouldSaveProgress(REKENEN_MODULE_ID, 'tafels', 0, true)).toBe(true);

    let records: ProgressRecord[] = [];
    // Brand new plus sum right on first try -> not stored.
    records = applyProgressUpdate(records, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'optellen:25+37',
      topic: 'optellen',
      skill: 'plus',
      level: 'M6',
      box: 2,
      due: '2026-10-18',
      firstTryRight: true,
      at: 1000,
    }).records;
    expect(records).toHaveLength(0);

    // Wrong on first try -> saved in box 1.
    records = applyProgressUpdate(records, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'optellen:47+38',
      topic: 'optellen',
      skill: 'plus',
      level: 'M6',
      box: 1,
      due: '2026-10-17',
      firstTryRight: false,
      at: 2000,
    }).records;
    expect(records).toHaveLength(1);
    expect(records[0]?.box).toBe(1);
    expect(savedSumIds(records, 'optellen').has('optellen:47+38')).toBe(true);

    // Later answered right on first try -> moves to box 2 and stays saved so it is never offered as new.
    records = applyProgressUpdate(records, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'optellen:47+38',
      topic: 'optellen',
      skill: 'plus',
      level: 'M6',
      box: 2,
      due: '2026-10-18',
      firstTryRight: true,
      at: 3000,
    }).records;
    expect(records).toHaveLength(1);
    expect(records[0]?.box).toBe(2);
    expect(savedSumIds(records, 'optellen').has('optellen:47+38')).toBe(true);
  });

  it('keeps at most the 200 newest saved sums per topic (AC126)', async () => {
    const db = await openDb({ name: 'gen-items-cap-db' });
    const store = createProgressStore(db);

    for (let i = 1; i <= 205; i++) {
      await saveProgressWithCap(store, {
        moduleId: REKENEN_MODULE_ID,
        itemId: `optellen:${100 + i}+${100 + i}`,
        topic: 'optellen',
        skill: 'plus',
        level: 'E6',
        box: 1,
        due: '2026-10-17',
        firstTryRight: false,
        at: i * 1000,
      });
    }

    const all = await store.list(REKENEN_MODULE_ID);
    expect(all).toHaveLength(MAX_SAVED_SUMS_PER_TOPIC);
    const ids = new Set(all.map((r) => r.itemId));
    expect(ids.has('optellen:101+101')).toBe(false);
    expect(ids.has('optellen:105+105')).toBe(false);
    expect(ids.has('optellen:106+106')).toBe(true);
    expect(ids.has('optellen:305+305')).toBe(true);

    const pruned = pruneSavedSumsForTopic(all, 'optellen', 200);
    expect(pruned.keep).toHaveLength(200);
    expect(pruned.remove).toHaveLength(0);
    db.close();
  });
});
