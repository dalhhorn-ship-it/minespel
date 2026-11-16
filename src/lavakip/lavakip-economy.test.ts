import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng } from '../core/rng';
import { get, openDb, put } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { defaultKv, type EconomyRecord, type LavakipRecord } from '../storage/schema';
import { World } from '../world/world';
import { isFreeSpot } from './bar-spot';
import { createLavakipEconomy } from './lavakip-economy';

let n = 0;
const world = new World();
async function setup(points: number) {
  const db = await openDb({ name: `lavakip-eco-${n++}` });
  await put(db, 'kv', { ...defaultKv('economy'), points }, 'economy');
  const eco = createLavakipEconomy({ db, world, pose: () => ({ x: 120, y: 24, z: 120, yaw: 0.4, pitch: 0 }), rng: createRng(5), clock: { now: () => 1000 } });
  return { db, eco };
}
const points = async (db: IDBDatabase) => ((await get<EconomyRecord>(db, 'kv', 'economy'))?.points) ?? -1;
const saved = (db: IDBDatabase) => get<LavakipRecord>(db, 'kv', 'lavakip');
const ledger = (db: IDBDatabase) => createLogStore(db).listLedger();

afterEach(() => vi.restoreAllMocks());

describe('Lavakip economy (AC311, AC314, AC318)', () => {
  it('AC311: the bar, the points and one ledger row land together', async () => {
    const { db, eco } = await setup(60);
    expect(await eco.buyBar()).toBe(true);
    expect(await points(db)).toBe(0);
    const rec = await saved(db);
    expect(rec?.bought).toBe(true);
    expect(rec?.spot && isFreeSpot(world, rec.spot)).toBe(true);
    const rows = await ledger(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: 'lavakip', delta: -60 });
    expect(eco.state()).toEqual(rec);
  });
  it('AC311: 59 points buys nothing', async () => {
    const { db, eco } = await setup(59);
    expect(await eco.buyBar()).toBe(false);
    expect(await points(db)).toBe(59);
    expect(await saved(db)).toBeUndefined();
    expect(await ledger(db)).toHaveLength(0);
  });
  it('AC311: 10 buys in a row with 120 points buy one bar', async () => {
    const { db, eco } = await setup(120);
    const results = await Promise.all(Array.from({ length: 10 }, () => eco.buyBar()));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(db)).toBe(60);
    expect(await ledger(db)).toHaveLength(1);
  });
  it('AC311: a throw leaves the points, the bar and the ledger as they were', async () => {
    const { db, eco } = await setup(60);
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      if (key === 'economy') throw new Error('boom');
      return original.call(this, value, key);
    });
    expect(await eco.buyBar()).toBe(false);
    vi.restoreAllMocks();
    expect(await points(db)).toBe(60);
    expect(await saved(db)).toBeUndefined();
    expect(await ledger(db)).toHaveLength(0);
    expect(eco.state().bought).toBe(false);
  });
  it('AC314: no order before the bar is bought', async () => {
    const { db, eco } = await setup(30);
    expect(await eco.order()).toBe(false);
    expect(await points(db)).toBe(30);
  });
  it('AC314: 20 orders in a row with 30 points give 10, points 0 and 10 rows', async () => {
    const { db, eco } = await setup(90);
    await eco.buyBar();
    const results = await Promise.all(Array.from({ length: 20 }, () => eco.order()));
    const got = results.filter(Boolean).length;
    expect(got).toBe(10);
    expect(eco.state().carried).toBe(10);
    expect(await points(db)).toBe(30 - 3 * 10 + 0);
    expect(await ledger(db)).toHaveLength(1 + got);
  });
  it('AC314: 30 points after the bar give N at most 10 with 30 minus 3 N points', async () => {
    const { db, eco } = await setup(90);
    await eco.buyBar();
    await Promise.all(Array.from({ length: 20 }, () => eco.order()));
    const rows = (await ledger(db)).filter((r) => r.delta === -3);
    expect(rows).toHaveLength(eco.state().carried);
    expect(eco.state().carried).toBeLessThanOrEqual(10);
    expect(await points(db)).toBeGreaterThanOrEqual(0);
  });
  it('AC314: 7 points, one order leaves 4, then 1, then it refuses', async () => {
    const { db, eco } = await setup(67);
    await eco.buyBar();
    expect(await eco.order()).toBe(true);
    expect(await points(db)).toBe(4);
    expect(await eco.order()).toBe(true);
    expect(await points(db)).toBe(1);
    expect(await eco.order()).toBe(false);
    expect(await points(db)).toBe(1);
  });
  it('AC314: useOne never goes below 0', async () => {
    const { eco } = await setup(66);
    await eco.buyBar();
    await eco.order();
    expect(await eco.useOne()).toBe(true);
    expect(eco.state().carried).toBe(0);
    expect(await eco.useOne()).toBe(false);
    expect(eco.state().carried).toBe(0);
  });
  it('AC312: placeHere moves the bar in front of the kid with no points and no ledger row', async () => {
    const { db, eco } = await setup(60);
    await eco.buyBar();
    const before = await points(db);
    const rows = (await ledger(db)).length;
    expect(await eco.placeHere()).toBe(true);
    const spot = eco.state().spot!;
    expect(isFreeSpot(world, spot)).toBe(true);
    expect(Math.hypot(spot.x - 120, spot.z - 120)).toBeLessThanOrEqual(5);
    expect((await saved(db))?.spot).toEqual(spot);
    expect(await points(db)).toBe(before);
    expect(await ledger(db)).toHaveLength(rows);
  });
  it('AC312: placeHere before the bar is bought does nothing', async () => {
    const { eco } = await setup(60);
    expect(await eco.placeHere()).toBe(false);
  });
  it('AC318: moveHome keeps carried and moves the spot to a free one', async () => {
    const { db, eco } = await setup(80);
    await eco.buyBar();
    await eco.order();
    await eco.order();
    await eco.placeHere();
    await eco.moveHome();
    const rec = await saved(db);
    expect(rec?.carried).toBe(2);
    expect(rec?.bought).toBe(true);
    expect(rec?.spot && isFreeSpot(world, rec.spot)).toBe(true);
    expect(eco.state()).toEqual(rec);
  });
  it('AC318: moveHome with no bar changes nothing', async () => {
    const { db, eco } = await setup(10);
    await eco.moveHome();
    expect(await saved(db)).toBeUndefined();
  });
  it('AC318: a loaded bar with no spot gets the home spot', async () => {
    const { eco } = await setup(0);
    eco.load({ bought: true, spot: null, carried: 4 });
    expect(eco.state().carried).toBe(4);
    expect(eco.state().spot).not.toBeNull();
  });
  it('AC310: shopState tells bought, placed, carried and whether Zet hier neer fits', async () => {
    const { eco } = await setup(60);
    expect(eco.shopState(59)).toEqual({ points: 59, bought: false, placed: false, carried: 0, canPlaceHere: false });
    await eco.buyBar();
    const s = eco.shopState(0)!;
    expect(s).toMatchObject({ bought: true, placed: true, carried: 0 });
    expect(typeof s.canPlaceHere).toBe('boolean');
  });
});
