// The `lavakip` kv record (v23, decision 144): the food truck and the lavakip the kid carries.
// One writer rule, like `updateMonsters`: every write is ONE readwrite transaction that reads, changes and puts the
// record, through one serial queue. The buy helpers (v23a) write this record and the ledger row in one transaction
// of their own and use `readLavakip` to read it.
import { request, transact } from './db';
import { defaultKv, type LavakipRecord } from './schema';

/** A stored value read as a record: anything that is not an object gives the default. Never throws. */
export function readLavakip(raw: unknown): LavakipRecord {
  const base = defaultKv('lavakip');
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base;
  const r = raw as Partial<LavakipRecord>;
  const spot = r.spot;
  const okSpot = typeof spot === 'object' && spot !== null && [spot.x, spot.y, spot.z].every((n) => typeof n === 'number' && Number.isFinite(n));
  return {
    bought: r.bought === true,
    spot: okSpot ? { x: spot.x, y: spot.y, z: spot.z } : null,
    carried: typeof r.carried === 'number' && Number.isInteger(r.carried) ? Math.min(10, Math.max(0, r.carried)) : 0,
  };
}

const queues = new WeakMap<IDBDatabase, Promise<unknown>>();

/** Reads, changes and puts `lavakip` in one transaction. Calls for one database run one after the other. */
export function updateLavakip(db: IDBDatabase, change: (current: LavakipRecord) => LavakipRecord): Promise<LavakipRecord> {
  const run = () =>
    transact(db, 'kv', 'readwrite', async (tx) => {
      const kv = tx.objectStore('kv');
      const next = change(readLavakip(await request<unknown>(kv.get('lavakip'))));
      await request(kv.put(next, 'lavakip'));
      return next;
    });
  const previous = queues.get(db) ?? Promise.resolve();
  const result = previous.then(run, run);
  queues.set(db, result.catch(() => undefined));
  return result;
}
