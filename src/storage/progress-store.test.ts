import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import { createProgressStore, type ProgressRecord } from './progress-store';

let n = 0;
const fresh = () => openDb({ name: `progress-db-${n++}` });

const rec = (moduleId: string, itemId: string, topic = 't1', box = 1): ProgressRecord => ({
  moduleId,
  itemId,
  box,
  due: '2026-10-18',
  level: 3,
  topic,
  skill: 's',
  seen: 2,
});

describe('progress store', () => {
  it('puts and gets one record, undefined when missing', async () => {
    const db = await fresh();
    const store = createProgressStore(db);
    expect(await store.get('taal', 'a')).toBeUndefined();
    await store.put(rec('taal', 'a'));
    expect(await store.get('taal', 'a')).toEqual(rec('taal', 'a'));
    await store.put(rec('taal', 'a', 't1', 4));
    expect((await store.get('taal', 'a'))?.box).toBe(4);
    db.close();
  });

  it('lists by module and all', async () => {
    const db = await fresh();
    const store = createProgressStore(db);
    await store.put(rec('taal', 'a'));
    await store.put(rec('taal', 'b'));
    await store.put(rec('taal2', 'a'));
    await store.put(rec('rek', 'a'));
    expect((await store.list('taal')).map((r) => r.itemId).sort()).toEqual(['a', 'b']);
    expect(await store.list('nope')).toEqual([]);
    expect(await store.list()).toHaveLength(4);
    db.close();
  });

  it('deletes by module only that module', async () => {
    const db = await fresh();
    const store = createProgressStore(db);
    await store.put(rec('taal', 'a'));
    await store.put(rec('taal', 'b'));
    await store.put(rec('taal2', 'a'));
    expect(await store.deleteByModule('taal')).toBe(2);
    expect(await store.list('taal')).toEqual([]);
    expect(await store.list('taal2')).toHaveLength(1);
    db.close();
  });

  it('deletes by topic only in that module', async () => {
    const db = await fresh();
    const store = createProgressStore(db);
    await store.put(rec('taal', 'a', 't1'));
    await store.put(rec('taal', 'b', 't2'));
    await store.put(rec('taal', 'c', 't1'));
    await store.put(rec('rek', 'a', 't1'));
    expect(await store.deleteByTopic('taal', 't1')).toBe(2);
    expect((await store.list('taal')).map((r) => r.itemId)).toEqual(['b']);
    expect(await store.list('rek')).toHaveLength(1);
    db.close();
  });
});
