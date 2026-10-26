import { describe, expect, it } from 'vitest';
import { openDb } from '../storage/db';
import { createRecords } from '../storage/records';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createDinoStore } from './dino-store';

describe('dino-store (T42)', () => {
  it('spawns eggs next to the player, hatches into baby dinos, names and changes modes, and persists', async () => {
    const db = await openDb({ name: `dino-store-test-${Math.random()}` });
    const records = createRecords(db);
    const world = new World();
    const store = createDinoStore({
      world,
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });

    const egg = await store.addEgg('compy', false);
    expect(store.eggs()).toHaveLength(1);
    expect(store.shopCount()).toBe(1);
    const dist = Math.hypot(egg.x - START_SPOT.x, egg.z - START_SPOT.z);
    expect(dist).toBeGreaterThanOrEqual(1);
    expect(dist).toBeLessThanOrEqual(3);

    // Golden egg does not count toward shopCount (AC111)
    await store.addEgg('brachiosaurus', true);
    expect(store.eggs()).toHaveLength(2);
    expect(store.shopCount()).toBe(1);

    const hatched = store.hatchEgg(egg.id);
    expect(hatched).not.toBeNull();
    expect(hatched?.kind).toBe('compy');
    expect(hatched?.growth).toBe(0);
    expect(store.dinos()).toHaveLength(1);
    expect(store.eggs()).toHaveLength(1);

    store.setDinoName(hatched!.id, '  Rexie   de Grote  ');
    expect(store.getDino(hatched!.id)?.name).toBe('Rexie de Gro');

    store.setDinoMode(hatched!.id, 'stay');
    expect(store.getDino(hatched!.id)?.mode).toBe('stay');

    await store.saveNow();

    // Restore into a fresh store
    const store2 = createDinoStore({
      world,
      getPlayerSpot: () => ({ x: START_SPOT.x, y: START_SPOT.y, z: START_SPOT.z }),
      records,
    });
    await store2.load();
    expect(store2.dinos()).toHaveLength(1);
    expect(store2.dinos()[0]?.name).toBe('Rexie de Gro');
    expect(store2.dinos()[0]?.mode).toBe('stay');
    expect(store2.eggs()).toHaveLength(1);
    expect(store2.eggs()[0]?.golden).toBe(true);

    db.close();
  });
});
