// Typed access to the `kv` store. Every record name from schema.ts has a type and a default.
import { get as dbGet, put as dbPut } from './db';
import { defaultKv, type KvName, type KvRecords } from './schema';

/** Fills in missing fields from the default, so an older or partial save still loads. */
function withDefaults<K extends KvName>(name: K, stored: unknown): KvRecords[K] {
  const base = defaultKv(name);
  if (stored === undefined || stored === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return stored as KvRecords[K];
  if (typeof stored !== 'object' || Array.isArray(stored)) return base;
  if (name === 'world') return { diff: new Uint32Array(0), ...(stored as object) } as KvRecords[K];
  return { ...base, ...(stored as object) } as KvRecords[K];
}

export async function getRecord<K extends KvName>(db: IDBDatabase, name: K): Promise<KvRecords[K]> {
  return withDefaults(name, await dbGet<unknown>(db, 'kv', name));
}

export async function putRecord<K extends KvName>(db: IDBDatabase, name: K, value: KvRecords[K]): Promise<void> {
  await dbPut(db, 'kv', value, name);
}

export interface Records {
  get<K extends KvName>(name: K): Promise<KvRecords[K]>;
  put<K extends KvName>(name: K, value: KvRecords[K]): Promise<void>;
  /** Reads, changes a copy and writes back. */
  update<K extends KvName>(name: K, change: (current: KvRecords[K]) => KvRecords[K]): Promise<KvRecords[K]>;
}

export function createRecords(db: IDBDatabase): Records {
  const records: Records = {
    get: (name) => getRecord(db, name),
    put: (name, value) => putRecord(db, name, value),
    async update(name, change) {
      const next = change(await getRecord(db, name));
      await putRecord(db, name, next);
      return next;
    },
  };
  return records;
}
