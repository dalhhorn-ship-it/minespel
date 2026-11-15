import { STORE_DEFS } from './schema';

/**
 * One step moves a database from version `to - 1` to `to`. Steps run inside the IndexedDB
 * upgrade transaction, so a step that throws aborts the whole upgrade and the old save stays.
 */
export interface MigrationStep {
  to: number;
  run(db: IDBDatabase, tx: IDBTransaction): void;
}

/** Version 1: create every store. Later versions add steps below. */
function createStores(db: IDBDatabase, tx: IDBTransaction): void {
  for (const def of STORE_DEFS) {
    const store = db.objectStoreNames.contains(def.name)
      ? tx.objectStore(def.name)
      : db.createObjectStore(def.name, {
          ...(def.keyPath ? { keyPath: def.keyPath } : {}),
          ...(def.autoIncrement ? { autoIncrement: true } : {}),
        });
    for (const idx of def.indexes ?? []) {
      if (!store.indexNames.contains(idx.name)) store.createIndex(idx.name, idx.keyPath);
    }
  }
}

/**
 * Version 2 (v15, decision 138) changes no store. It is a rollback guard: a 0.7.0 build cannot open a 0.8.0
 * database, so it never reads the big world as a small one and saves over it.
 */
export const MIGRATIONS: MigrationStep[] = [
  { to: 1, run: createStores },
  { to: 2, run: () => {} },
];

/** Runs every step with `oldVersion < to <= newVersion`, in order. */
export function runMigrations(
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
  newVersion: number,
  steps: MigrationStep[] = MIGRATIONS,
): void {
  const todo = steps.filter((s) => s.to > oldVersion && s.to <= newVersion).sort((a, b) => a.to - b.to);
  for (const step of todo) step.run(db, tx);
}
