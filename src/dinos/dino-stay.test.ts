import { describe, expect, it } from 'vitest';
import { openDb } from '../storage/db';
import { createRecords } from '../storage/records';
import type { DinosRecord } from '../storage/schema';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createDinoStore } from './dino-store';

async function setup() {
  const db = await openDb({ name: `dino-stay-test-${Math.random()}` });
  const records = createRecords(db);
  const make = () =>
    createDinoStore({
      world: new World(),
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
  return { db, records, make };
}

const oldDino = (id: string, mode: string, x: number, z: number) => ({
  id, kind: 'compy', golden: false, name: '', mode, x, y: 10, z, heading: 0, growth: 100, stayX: 1, stayZ: 2,
});

describe('dinos stay by default (decision 122)', () => {
  it('a hatched dino and a new chicken start on Blijf hier at their own spot', async () => {
    const { db, make } = await setup();
    const store = make();
    const egg = await store.addEgg('compy', false);
    const dino = store.hatchEgg(egg.id)!;
    expect(dino.mode).toBe('stay');
    expect([dino.stayX, dino.stayZ]).toEqual([dino.x, dino.z]);
    const chicken = store.spawnChickenInMemory();
    expect(chicken.mode).toBe('stay');
    expect([chicken.stayX, chicken.stayZ]).toEqual([chicken.x, chicken.z]);
    db.close();
  });

  it('Allemaal blijven puts every follower on stay where it is, and saves at once', async () => {
    const { db, make } = await setup();
    const store = make();
    const a = store.hatchEgg((await store.addEgg('compy')).id)!;
    const b = store.hatchEgg((await store.addEgg('compy')).id)!;
    store.setDinoMode(a.id, 'follow');
    store.setDinoMode(b.id, 'follow');
    a.x = 20; a.z = 21;
    expect(store.stayAll()).toBe(2);
    expect(a.mode).toBe('stay');
    expect([a.stayX, a.stayZ]).toEqual([20, 21]);
    expect(store.stayAll()).toBe(0);
    await store.saveNow();
    const store2 = make();
    await store2.load();
    expect(store2.dinos().map((d) => d.mode)).toEqual(['stay', 'stay']);
    db.close();
  });

  it('an old save without the flag is switched to Blijf hier once, at the current spot', async () => {
    const { db, records, make } = await setup();
    const old = {
      dinos: [oldDino('d1', 'follow', 12, 13), oldDino('d2', 'stay', 5, 6)],
      eggs: [],
    } as DinosRecord;
    await records.put('dinos', old);
    const store = make();
    await store.load();
    const [d1, d2] = store.dinos();
    expect([d1!.mode, d1!.stayX, d1!.stayZ]).toEqual(['stay', 12, 13]);
    expect([d2!.mode, d2!.stayX, d2!.stayZ]).toEqual(['stay', 5, 6]);
    expect(store.toRecord().staySwitched).toBe(true);
    await store.saveNow();
    expect((await records.get('dinos')).staySwitched).toBe(true);
    db.close();
  });

  it('after the switch a dino set to Volg mij keeps following across reloads', async () => {
    const { db, records, make } = await setup();
    await records.put('dinos', { dinos: [oldDino('d1', 'follow', 12, 13)], eggs: [] } as DinosRecord);
    const store = make();
    await store.load();
    store.setDinoMode('d1', 'follow');
    await store.saveNow();
    const store2 = make();
    await store2.load();
    expect(store2.getDino('d1')?.mode).toBe('follow');
    await store2.saveNow();
    const store3 = make();
    await store3.load();
    expect(store3.getDino('d1')?.mode).toBe('follow');
    db.close();
  });

  it('an old save with a missing or odd mode still loads, on Blijf hier', async () => {
    const { db, records, make } = await setup();
    const odd = oldDino('d1', 'x', 3, 4) as Record<string, unknown>;
    delete odd.mode;
    await records.put('dinos', { dinos: [odd], eggs: [] } as DinosRecord);
    const store = make();
    await store.load();
    expect(store.dinos()).toHaveLength(1);
    expect(store.dinos()[0]!.mode).toBe('stay');
    db.close();
  });
});
