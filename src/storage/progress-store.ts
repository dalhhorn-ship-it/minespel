// Leitner box and due day per item. Key in the `progress` store is `moduleId|itemId`.
import { request, transact } from './db';

export interface ProgressRecord {
  moduleId: string;
  itemId: string;
  box: number;
  /** Local calendar day, "2026-10-18". */
  due: string;
  level: number;
  topic: string;
  skill: string;
  seen: number;
}

export const progressKey = (moduleId: string, itemId: string): string => `${moduleId}|${itemId}`;

/** Key range holding every item of one module. */
function moduleRange(moduleId: string): IDBKeyRange {
  return IDBKeyRange.bound(`${moduleId}|`, `${moduleId}|￿`);
}

export interface ProgressStore {
  get(moduleId: string, itemId: string): Promise<ProgressRecord | undefined>;
  put(record: ProgressRecord): Promise<void>;
  /** All records of one module, or of every module when omitted. */
  list(moduleId?: string): Promise<ProgressRecord[]>;
  /** Returns how many records were removed. */
  deleteByModule(moduleId: string): Promise<number>;
  deleteByTopic(moduleId: string, topic: string): Promise<number>;
}

export function createProgressStore(db: IDBDatabase): ProgressStore {
  return {
    get: (moduleId, itemId) =>
      transact(db, 'progress', 'readonly', (tx) =>
        request<ProgressRecord | undefined>(tx.objectStore('progress').get(progressKey(moduleId, itemId))),
      ),
    async put(record) {
      await transact(db, 'progress', 'readwrite', (tx) =>
        request(tx.objectStore('progress').put(record, progressKey(record.moduleId, record.itemId))),
      );
    },
    list: (moduleId) =>
      transact(db, 'progress', 'readonly', (tx) =>
        request<ProgressRecord[]>(
          tx.objectStore('progress').getAll(moduleId === undefined ? undefined : moduleRange(moduleId)),
        ),
      ),
    deleteByModule: (moduleId) =>
      transact(db, 'progress', 'readwrite', async (tx) => {
        const store = tx.objectStore('progress');
        const keys = await request(store.getAllKeys(moduleRange(moduleId)));
        for (const key of keys) await request(store.delete(key));
        return keys.length;
      }),
    deleteByTopic: (moduleId, topic) =>
      transact(db, 'progress', 'readwrite', async (tx) => {
        const store = tx.objectStore('progress');
        const range = moduleRange(moduleId);
        const [keys, values] = await Promise.all([
          request(store.getAllKeys(range)),
          request<ProgressRecord[]>(store.getAll(range)),
        ]);
        let removed = 0;
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (key !== undefined && values[i]?.topic === topic) {
            await request(store.delete(key));
            removed++;
          }
        }
        return removed;
      }),
  };
}
