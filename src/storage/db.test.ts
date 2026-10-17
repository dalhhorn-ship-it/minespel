import { describe, expect, it } from 'vitest';
import { del, get, getAll, openDb, put, request, transact } from './db';
import { KV_NAMES, STORE_NAMES, defaultKv } from './schema';

let n = 0;
const fresh = () => openDb({ name: `test-db-${n++}` });

describe('db', () => {
  it('creates every store and index', async () => {
    const db = await fresh();
    expect([...db.objectStoreNames].sort()).toEqual([...STORE_NAMES].sort());
    const tx = db.transaction('answers');
    expect([...tx.objectStore('answers').indexNames].sort()).toEqual(['moduleId', 'ts']);
    db.close();
  });

  it('puts, gets, lists and deletes', async () => {
    const db = await fresh();
    await put(db, 'kv', { points: 3 }, 'economy');
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 3 });
    await put(db, 'ledger', { delta: 1 });
    await put(db, 'ledger', { delta: 2 });
    const all = await getAll<{ id: number; delta: number }>(db, 'ledger');
    expect(all.map((r) => r.delta)).toEqual([1, 2]);
    expect(all[0]?.id).toBe(1);
    await del(db, 'kv', 'economy');
    expect(await get(db, 'kv', 'economy')).toBeUndefined();
    db.close();
  });

  it('keeps the old record when a transaction aborts halfway (AC136)', async () => {
    const db = await fresh();
    await put(db, 'kv', { points: 5 }, 'economy');
    await expect(
      transact(db, 'kv', 'readwrite', async (tx) => {
        const store = tx.objectStore('kv');
        await request(store.put({ points: 99 }, 'economy'));
        await request(store.put({ x: 1 }, 'player'));
        throw new Error('cut off');
      }),
    ).rejects.toThrow('cut off');
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 5 });
    expect(await get(db, 'kv', 'player')).toBeUndefined();
    db.close();
  });
});

describe('schema defaults', () => {
  it('has a default for every kv record, as fresh copies', () => {
    for (const name of KV_NAMES) {
      expect(defaultKv(name)).toBeDefined();
    }
    expect(defaultKv('rotation')).not.toBe(defaultKv('rotation'));
    expect(defaultKv('economy').points).toBe(0);
    expect(defaultKv('meta').lastBackup).toBeNull();
    expect(defaultKv('session')).toBeNull();
  });
});
