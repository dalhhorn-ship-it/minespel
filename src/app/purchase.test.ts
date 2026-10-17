import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../core/clock';
import { createDinoStore } from '../dinos/dino-store';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createRecords } from '../storage/records';
import { buyEgg, MSG_BUY_FAILED } from './purchase';

let n = 0;
async function setup(points: number) {
  const db = await openDb({ name: `purchase-${n++}` });
  const records = createRecords(db);
  await records.put('economy', { points, practicePointsToday: 0, practiceDay: '' });
  const dinos = createDinoStore();
  const clock = createFakeClock(Date.UTC(2026, 9, 17, 12));
  return { db, records, dinos, clock, deps: { db, dinos, clock } };
}

describe('buyEgg', () => {
  it('takes the points, keeps the egg, saves the dinos and writes one ledger line', async () => {
    const s = await setup(45);
    const r = await buyEgg(s.deps, 'triceratops');
    expect(r).toMatchObject({ ok: true, points: 5, price: 40 });
    expect(s.dinos.eggs).toHaveLength(1);
    expect((await s.records.get('economy')).points).toBe(5);
    expect((await s.records.get('dinos')).eggs).toHaveLength(1);
    const ledger = await createLogStore(s.db).listLedger();
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: -40, reason: 'shop' });
  });

  it('ten taps at once buy exactly one egg (AC110)', async () => {
    const s = await setup(45);
    const results = await Promise.all(Array.from({ length: 10 }, () => buyEgg(s.deps, 'triceratops')));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(s.dinos.eggs).toHaveLength(1);
    expect((await s.records.get('economy')).points).toBe(5);
    expect(await createLogStore(s.db).listLedger()).toHaveLength(1);
  });

  it('too few points: no egg, nothing written, points never below 0', async () => {
    const s = await setup(10);
    const r = await buyEgg(s.deps, 'compy');
    expect(r).toMatchObject({ ok: false, reason: 'points', note: 'Nog 10 punten nodig' });
    expect(s.dinos.eggs).toHaveLength(0);
    expect((await s.records.get('economy')).points).toBe(10);
    expect(await createLogStore(s.db).listLedger()).toHaveLength(0);
  });

  it('refuses at 12 shop dinos and eggs, golden ones do not count', async () => {
    const s = await setup(500);
    s.dinos.addEgg('compy', true);
    for (let i = 0; i < 11; i++) s.dinos.addEgg('compy');
    expect((await buyEgg(s.deps, 'compy')).ok).toBe(true); // 12th shop egg
    const r = await buyEgg(s.deps, 'compy');
    expect(r).toMatchObject({ ok: false, reason: 'cap', note: "Je hebt al 12 dino's! Wat een kudde." });
    expect(s.dinos.eggs).toHaveLength(13);
    expect((await s.records.get('economy')).points).toBe(480);
  });

  it('a failing commit leaves points, dinos and ledger as before and no egg in memory', async () => {
    const s = await setup(45);
    const bad = { ...s.deps, clock: { now: (): number => { throw new Error('boom'); } } };
    const r = await buyEgg(bad, 'triceratops');
    expect(r).toEqual({ ok: false, reason: 'storage', note: MSG_BUY_FAILED, points: null });
    expect(s.dinos.eggs).toHaveLength(0);
    expect((await s.records.get('economy')).points).toBe(45);
    expect((await s.records.get('dinos')).eggs).toHaveLength(0);
    expect(await createLogStore(s.db).listLedger()).toHaveLength(0);
    // and a later purchase still works
    expect((await buyEgg(s.deps, 'compy')).ok).toBe(true);
  });
});

describe('removeEgg', () => {
  it('removes only the egg asked for', () => {
    const store = createDinoStore();
    const a = store.addEgg('compy');
    const b = store.addEgg('compy');
    expect(store.removeEgg(a.id)).toBe(true);
    expect(store.removeEgg(a.id)).toBe(false);
    expect(store.eggs.map((e) => e.id)).toEqual([b.id]);
  });
});
