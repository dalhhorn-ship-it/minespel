import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createKnightEconomy } from '../knights/knight-economy';
import { MAX_KNIGHTS } from '../knights/knight-types';
import { openDb, request, transact } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import type { EconomyRecord, MonstersRecord } from '../storage/schema';
import { defaultKv } from '../storage/schema';
import { buyInOneTransaction } from './buy';

let n = 0;
async function fresh(points: number) {
  const db = await openDb({ name: `buy-db-${n++}` });
  await transact(db, 'kv', 'readwrite', async (tx) => {
    await request(tx.objectStore('kv').put({ ...defaultKv('economy'), points }, 'economy'));
  });
  return db;
}
const read = <T>(db: IDBDatabase, key: string) => transact(db, 'kv', 'readonly', (tx) => request<T>(tx.objectStore('kv').get(key)));
const points = async (db: IDBDatabase) => (await read<EconomyRecord>(db, 'economy')).points;
const saved = async (db: IDBDatabase) => ((await read<MonstersRecord | undefined>(db, 'monsters')) ?? defaultKv('monsters')).knights;

function fakeKnights() {
  const list: string[] = [];
  return {
    list,
    add: (r: { id: string }) => { list.push(r.id); return true; },
    remove: (id: string) => { const i = list.indexOf(id); if (i >= 0) list.splice(i, 1); return i >= 0; },
    knights: () => [],
  };
}

describe('buyInOneTransaction', () => {
  it('AC201: points, knight and ledger row land together', async () => {
    const db = await fresh(30);
    const k = fakeKnights();
    const eco = createKnightEconomy({ db, knights: k as never });
    expect(await eco.buy()).toBe(true);
    expect(await points(db)).toBe(0);
    expect(await saved(db)).toHaveLength(1);
    expect(k.list).toHaveLength(1);
    const ledger = await createLogStore(db).listLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ reason: 'knight', delta: -30 });
  });

  it('AC201: 29 points buys nothing', async () => {
    const db = await fresh(29);
    const eco = createKnightEconomy({ db, knights: fakeKnights() as never });
    expect(await eco.buy()).toBe(false);
    expect(await points(db)).toBe(29);
    expect(await saved(db)).toHaveLength(0);
    expect(await createLogStore(db).listLedger()).toHaveLength(0);
  });

  it('AC201: a throw halfway leaves points, knights and ledger as they were', async () => {
    const db = await fresh(60);
    await expect(
      buyInOneTransaction(db, {
        price: 30,
        reason: 'knight',
        now: 1,
        apply: async (kv) => {
          await request(kv.put({ ...defaultKv('monsters'), knights: [{ id: 'x', mode: 'follow', spot: null, boughtFor: 30 }] }, 'monsters'));
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow();
    expect(await points(db)).toBe(60);
    expect(await saved(db)).toHaveLength(0);
    expect(await createLogStore(db).listLedger()).toHaveLength(0);
  });

  it('AC201: 10 calls in a row with 60 points buy one knight at a time under the lock', async () => {
    const db = await fresh(30);
    const eco = createKnightEconomy({ db, knights: fakeKnights() as never });
    const results = await Promise.all(Array.from({ length: 10 }, () => eco.buy()));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(db)).toBe(0);
    expect(await saved(db)).toHaveLength(1);
    expect(await createLogStore(db).listLedger()).toHaveLength(1);
  });

  it('AC200: the cap of 3 is checked inside the transaction', async () => {
    const db = await fresh(300);
    const eco = createKnightEconomy({ db, knights: fakeKnights() as never });
    for (let i = 0; i < MAX_KNIGHTS; i++) expect(await eco.buy()).toBe(true);
    expect(await eco.buy()).toBe(false);
    expect(await points(db)).toBe(300 - 30 * MAX_KNIGHTS);
    expect(await saved(db)).toHaveLength(MAX_KNIGHTS);
  });

  it('AC202: trade in gives 15 back, writes +15 and removes him from the save', async () => {
    const db = await fresh(30);
    const k = fakeKnights();
    const eco = createKnightEconomy({ db, knights: k as never });
    await eco.buy();
    const id = (await saved(db))[0]!.id;
    expect(await eco.tradeIn(id)).toBe(true);
    expect(await points(db)).toBe(15);
    expect(await saved(db)).toHaveLength(0);
    expect(k.list).toHaveLength(0);
    const ledger = await createLogStore(db).listLedger();
    expect(ledger.map((l) => [l.reason, l.delta])).toEqual([['knight', -30], ['tradein', 15]]);
    expect(await eco.tradeIn(id)).toBe(false);
    expect(await points(db)).toBe(15);
  });
});
