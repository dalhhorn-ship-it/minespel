// One atomic buy (v17, decision 135): the points, what was bought and the ledger row land in ONE IndexedDB
// transaction, or none of them do. Used by the knight buy and trade in. A negative price is a refund.
import { request, transact } from '../storage/db';
import { dayKey } from '../core/clock';
import type { LedgerReason } from '../storage/log-store';
import { defaultKv, type EconomyRecord } from '../storage/schema';

export interface BuyRequest {
  /** Points to pay. Negative: the kid gets points (a trade in). */
  price: number;
  reason: LedgerReason;
  /** Milliseconds since 1970, for the ledger row. */
  now: number;
  /**
   * Runs inside the transaction after the points check. May read and put other `kv` records.
   * Returns false to refuse (for example the cap): nothing is written then. A throw aborts everything.
   */
  apply(kv: IDBObjectStore): Promise<boolean> | boolean;
}

/** True when it was written, false when it was refused (points short, or `apply` said no). */
export async function buyInOneTransaction(db: IDBDatabase, req: BuyRequest): Promise<boolean> {
  return transact(db, ['kv', 'ledger'], 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    const raw = await request<EconomyRecord | undefined>(kv.get('economy'));
    const eco: EconomyRecord = { ...defaultKv('economy'), ...(raw ?? {}) };
    if (req.price > 0 && eco.points < req.price) return false;
    if (!(await req.apply(kv))) return false;
    await request(kv.put({ ...eco, points: eco.points - req.price }, 'economy'));
    await request(tx.objectStore('ledger').add({ ts: req.now, day: dayKey(req.now), delta: -req.price, reason: req.reason }));
    return true;
  });
}
