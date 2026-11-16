import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb, request, transact } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { defaultKv, type EconomyRecord, type MonstersRecord } from '../storage/schema';
import { createGearEconomy } from './gear-economy';
import { createKnightEconomy } from './knight-economy';
import type { Worn } from './gear';

let n = 0;
const rec = (id: string) => ({ id, mode: 'follow' as const, spot: null, boughtFor: 30 });

async function fresh(points: number, knights: string[]) {
  const db = await openDb({ name: `gear-db-${n++}` });
  await transact(db, 'kv', 'readwrite', async (tx) => {
    await request(tx.objectStore('kv').put({ ...defaultKv('economy'), points }, 'economy'));
    await request(tx.objectStore('kv').put({ ...defaultKv('monsters'), knights: knights.map(rec) }, 'monsters'));
  });
  return db;
}
const read = <T>(db: IDBDatabase, key: string) => transact(db, 'kv', 'readonly', (tx) => request<T>(tx.objectStore('kv').get(key)));
const points = async (db: IDBDatabase) => (await read<EconomyRecord>(db, 'economy')).points;
const monsters = (db: IDBDatabase) => read<MonstersRecord>(db, 'monsters');

function fakeKnights(ids: string[]) {
  const worn = new Map<string, Worn | undefined>();
  const list = ids.map((id) => ({ id }));
  return {
    worn,
    system: {
      knights: () => list,
      setGear: (id: string, w: Worn | undefined) => { worn.set(id, w); return true; },
      add: () => true,
      remove: (id: string) => { const i = list.findIndex((k) => k.id === id); if (i >= 0) list.splice(i, 1); return i >= 0; },
    },
  };
}

describe('AC259: the gear economy', () => {
  it('AC259: a buy writes the points, the item and one ledger row gear together', async () => {
    const db = await fresh(50, ['a']);
    const k = fakeKnights(['a']);
    const eco = createGearEconomy({ db, knights: k.system as never });
    expect(await eco.buy('pony')).toBe(true);
    expect(await points(db)).toBe(0);
    expect((await monsters(db)).gear).toEqual({ owned: ['pony'], worn: {} });
    expect(eco.state().owned).toEqual(['pony']);
    const ledger = await createLogStore(db).listLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ reason: 'gear', delta: -50 });
  });

  it('AC260: a second buy of the same item, a buy with no knight, short points and an unknown id are refused', async () => {
    const db = await fresh(100, ['a']);
    const eco = createGearEconomy({ db, knights: fakeKnights(['a']).system as never });
    expect(await eco.buy('leren-kap')).toBe(true);
    expect(await eco.buy('leren-kap')).toBe(false);
    expect(await eco.buy('drakenhelm')).toBe(false);
    expect(await points(db)).toBe(90);
    const none = await fresh(100, []);
    expect(await createGearEconomy({ db: none, knights: fakeKnights([]).system as never }).buy('leren-kap')).toBe(false);
    expect(await points(none)).toBe(100);
    expect((await monsters(none)).gear).toBeUndefined();
    const poor = await fresh(9, ['a']);
    expect(await createGearEconomy({ db: poor, knights: fakeKnights(['a']).system as never }).buy('leren-kap')).toBe(false);
    expect(await points(poor)).toBe(9);
    expect(await createLogStore(poor).listLedger()).toHaveLength(0);
  });

  it('AC259: 10 calls in a row buy one', async () => {
    const db = await fresh(500, ['a']);
    const eco = createGearEconomy({ db, knights: fakeKnights(['a']).system as never });
    const results = await Promise.all(Array.from({ length: 10 }, () => eco.buy('glimzwaard')));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(db)).toBe(450);
    expect(await createLogStore(db).listLedger()).toHaveLength(1);
  });

  it('AC261: wear, move to another knight and take off are saved and sent to the knights', async () => {
    const db = await fresh(500, ['a', 'b']);
    const k = fakeKnights(['a', 'b']);
    const eco = createGearEconomy({ db, knights: k.system as never });
    await eco.buy('pony');
    await eco.buy('leren-kap');
    expect(await eco.wear('a', 'pony', 'rijdier')).toBe(true);
    expect(k.worn.get('a')).toEqual({ rijdier: 'pony' });
    expect(await eco.wear('b', 'pony', 'rijdier')).toBe(true);
    expect(k.worn.get('a')).toEqual({});
    expect(k.worn.get('b')).toEqual({ rijdier: 'pony' });
    expect((await monsters(db)).gear?.worn).toEqual({ b: { rijdier: 'pony' } });
    expect(await eco.wear('b', null, 'rijdier')).toBe(true);
    expect(await eco.wear('a', 'drakenhelm', 'hoofd')).toBe(false);
    expect(await eco.wear('zz', 'leren-kap', 'hoofd')).toBe(false);
    expect(await eco.wear('a', 'leren-kap', 'schild')).toBe(false);
    expect(await points(db)).toBe(500 - 60);
  });

  it('AC266: a trade in sends his gear back in the same transaction and the copy follows', async () => {
    const db = await fresh(500, ['a', 'b']);
    const k = fakeKnights(['a', 'b']);
    const gear = createGearEconomy({ db, knights: k.system as never });
    await gear.buy('pony');
    await gear.buy('leren-kap');
    await gear.wear('a', 'pony', 'rijdier');
    await gear.wear('a', 'leren-kap', 'hoofd');
    const eco = createKnightEconomy({ db, knights: k.system as never, gear });
    expect(await eco.tradeIn('a')).toBe(true);
    const m = await monsters(db);
    expect(m.knights.map((x) => x.id)).toEqual(['b']);
    expect(m.gear).toEqual({ owned: ['pony', 'leren-kap'], worn: {} });
    expect(gear.state().owned).toEqual(['pony', 'leren-kap']);
    expect(gear.state().worn.a).toBeUndefined();
  });

  it('AC267: a trade in with no gear adds no gear field, and load reads a 0.9.0 record as empty', async () => {
    const db = await fresh(0, ['a']);
    const k = fakeKnights(['a']);
    const gear = createGearEconomy({ db, knights: k.system as never });
    gear.load(await monsters(db));
    expect(gear.state()).toEqual({ owned: [], worn: {} });
    expect(await createKnightEconomy({ db, knights: k.system as never, gear }).tradeIn('a')).toBe(true);
    expect('gear' in (await monsters(db))).toBe(false);
  });

  it('AC267: load puts the saved gear on the knights', async () => {
    const db = await fresh(0, ['a']);
    const k = fakeKnights(['a']);
    const gear = createGearEconomy({ db, knights: k.system as never });
    gear.load({ knights: [rec('a')] as never, gear: { owned: ['pony'], worn: { a: { rijdier: 'pony' }, gone: { hoofd: 'leren-kap' } } } });
    expect(k.worn.get('a')).toEqual({ rijdier: 'pony' });
  });
});
