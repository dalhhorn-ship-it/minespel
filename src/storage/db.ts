import { runMigrations, type MigrationStep } from './migrate';
import { DB_NAME, SCHEMA_VERSION, type StoreName } from './schema';

export class StorageError extends Error {}

export interface OpenOptions {
  name?: string;
  version?: number;
  steps?: MigrationStep[];
}

/** Opens the database and migrates it. Rejects when it cannot be read (broken save screen). */
export function openDb(options: OpenOptions = {}): Promise<IDBDatabase> {
  const { name = DB_NAME, version = SCHEMA_VERSION, steps } = options;
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(name, version);
    } catch (e) {
      reject(new StorageError(`Cannot open storage: ${String(e)}`));
      return;
    }
    req.onupgradeneeded = (ev) => {
      const tx = req.transaction;
      if (!tx) return;
      try {
        runMigrations(req.result, tx, ev.oldVersion, version, steps);
      } catch (e) {
        tx.abort();
        reject(new StorageError(`Migration failed: ${String(e)}`));
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new StorageError(`Cannot open storage: ${req.error?.message ?? 'unknown'}`));
    req.onblocked = () => reject(new StorageError('Storage is blocked by another window.'));
  });
}

/** Wraps one request in a promise. */
export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new StorageError('Request failed'));
  });
}

/**
 * Runs `fn` in one transaction. Resolves with its result after the transaction has completed.
 * If `fn` throws or rejects, the transaction is aborted and nothing is written (AC136).
 */
export function transact<T>(
  db: IDBDatabase,
  stores: StoreName | StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(stores, mode);
    } catch (e) {
      reject(new StorageError(`Transaction failed: ${String(e)}`));
      return;
    }
    let result: T;
    let failure: unknown;
    let failed = false;
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failed ? failure : (tx.error ?? new StorageError('Transaction aborted')));
    tx.onerror = () => {
      /* the abort handler reports it */
    };
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => {
        result = r;
      })
      .catch((e: unknown) => {
        failed = true;
        failure = e;
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
      });
  });
}

export function get<T>(db: IDBDatabase, store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return transact(db, store, 'readonly', (tx) => request<T | undefined>(tx.objectStore(store).get(key)));
}

/** `key` is needed for stores with out of line keys (kv, progress, ownModules). */
export function put(db: IDBDatabase, store: StoreName, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
  return transact(db, store, 'readwrite', (tx) => request(tx.objectStore(store).put(value, key)));
}

export function del(db: IDBDatabase, store: StoreName, key: IDBValidKey): Promise<void> {
  return transact(db, store, 'readwrite', async (tx) => {
    await request(tx.objectStore(store).delete(key));
  });
}

export function getAll<T>(db: IDBDatabase, store: StoreName): Promise<T[]> {
  return transact(db, store, 'readonly', (tx) => request<T[]>(tx.objectStore(store).getAll()));
}
