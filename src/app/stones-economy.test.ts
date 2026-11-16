import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb, request, transact } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import type { EconomyRecord, MonstersRecord } from '../storage/schema';
import { defaultKv } from '../storage/schema';
import { createStonesEconomy } from './stones-economy';
import { createStonesFlow } from './stones-flow';

let n = 0;
async function fresh(points: number, stones?: { found: number[]; bought: number[] }) {
  const db = await openDb({ name: `stones-eco-${n++}` });
  await transact(db, 'kv', 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    await request(kv.put({ ...defaultKv('economy'), points }, 'economy'));
    await request(kv.put({ ...defaultKv('monsters'), ...(stones ? { stones } : {}) }, 'monsters'));
  });
  const flow = createStonesFlow({ db, say: () => {}, game: { setStones: () => {} }, startBlock: () => 0 });
  flow.load(stones ? { stones } : {});
  return { db, flow, economy: createStonesEconomy({ db, flow }) };
}
const read = <T>(db: IDBDatabase, key: string) => transact(db, 'kv', 'readonly', (tx) => request<T>(tx.objectStore('kv').get(key)));
const points = async (db: IDBDatabase) => (await read<EconomyRecord>(db, 'economy')).points;
const stored = async (db: IDBDatabase) => (await read<MonstersRecord>(db, 'monsters')).stones;
const ledger = (db: IDBDatabase) => createLogStore(db).listLedger();

describe('stones economy (AC274)', () => {
  it('AC274: buys a found stone with the points, the bought id and one stone ledger row', async () => {
    const { db, flow, economy } = await fresh(80, { found: [43, 44], bought: [] });
    expect(await economy.buy(43)).toBe(true);
    expect(await points(db)).toBe(0);
    expect(await stored(db)).toEqual({ found: [43, 44], bought: [43] });
    const rows = await ledger(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: 'stone', delta: -80 });
    expect(flow.isBought(43)).toBe(true);
  });

  it('AC274: refuses a stone that is not found, nothing is written', async () => {
    const { db, flow, economy } = await fresh(500, { found: [44], bought: [] });
    expect(await economy.buy(43)).toBe(false);
    expect(await economy.buy(99)).toBe(false);
    expect(await points(db)).toBe(500);
    expect(await ledger(db)).toHaveLength(0);
    expect(flow.isBought(43)).toBe(false);
  });

  it('AC274: refuses a stone already bought', async () => {
    const { db, economy } = await fresh(500, { found: [43], bought: [43] });
    expect(await economy.buy(43)).toBe(false);
    expect(await points(db)).toBe(500);
    expect(await ledger(db)).toHaveLength(0);
  });

  it('AC274: refuses when the points are short', async () => {
    const { db, flow, economy } = await fresh(79, { found: [43], bought: [] });
    expect(await economy.buy(43)).toBe(false);
    expect(await points(db)).toBe(79);
    expect(await ledger(db)).toHaveLength(0);
    expect(flow.isBought(43)).toBe(false);
  });

  it('AC274: 10 calls at once buy once and leave 80 of 160 points', async () => {
    const { db, economy } = await fresh(160, { found: [43], bought: [] });
    const results = await Promise.all(Array.from({ length: 10 }, () => economy.buy(43)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(db)).toBe(80);
    expect((await ledger(db)).filter((r) => r.reason === 'stone')).toHaveLength(1);
  });

  it('AC274: two economies on one record still buy once (the record decides)', async () => {
    const { db, economy } = await fresh(160, { found: [43], bought: [] });
    const other = createStonesEconomy({ db, flow: { state: () => ({ found: [43], bought: [] }), isBought: () => false, markBought: () => {} } });
    const results = await Promise.all([economy.buy(43), other.buy(43)]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(db)).toBe(80);
  });
});
