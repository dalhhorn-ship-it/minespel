import { describe, expect, it } from 'vitest';
import { get, openDb, put } from './db';
import { runMigrations, type MigrationStep } from './migrate';

let n = 0;
const name = () => `migrate-db-${n++}`;

function rawOpen(dbName: string, version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onupgradeneeded = () => upgrade(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

describe('migrations', () => {
  it('upgrades a fake v0 save and keeps its data', async () => {
    const dbName = name();
    const old = await rawOpen(dbName, 1, (db) => {
      db.createObjectStore('kv');
    });
    await put(old, 'kv', { points: 7 }, 'economy');
    old.close();

    const steps: MigrationStep[] = [
      {
        to: 2,
        run(_db, tx) {
          const store = tx.objectStore('kv');
          const req = store.get('economy');
          req.onsuccess = () => {
            const eco = req.result as { points: number };
            store.put({ ...eco, practicePointsToday: 0 }, 'economy');
          };
        },
      },
    ];
    const db = await openDb({ name: dbName, version: 2, steps });
    expect(await get(db, 'kv', 'economy')).toEqual({ points: 7, practicePointsToday: 0 });
    db.close();
  });

  it('runs only the steps between the versions, in order', () => {
    const ran: number[] = [];
    const mk = (to: number): MigrationStep => ({ to, run: () => void ran.push(to) });
    runMigrations({} as IDBDatabase, {} as IDBTransaction, 1, 3, [mk(3), mk(1), mk(2), mk(4)]);
    expect(ran).toEqual([2, 3]);
  });

  it('a failing step aborts the upgrade and leaves the old save', async () => {
    const dbName = name();
    const old = await rawOpen(dbName, 1, (db) => {
      db.createObjectStore('kv');
    });
    await put(old, 'kv', { points: 7 }, 'economy');
    old.close();

    const steps: MigrationStep[] = [
      {
        to: 2,
        run(_db, tx) {
          tx.objectStore('kv').put({ points: 0 }, 'economy');
          throw new Error('boom');
        },
      },
    ];
    await expect(openDb({ name: dbName, version: 2, steps })).rejects.toThrow('Migration failed');
    const still = await rawOpen(dbName, 1, () => {});
    expect(await get(still, 'kv', 'economy')).toEqual({ points: 7 });
    still.close();
  });
});
