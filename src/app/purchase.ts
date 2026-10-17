// Egg purchase (T47, decision 48, AC110, AC150). The egg goes into the in memory store first. Then ONE
// transaction over `kv` and `ledger` reads the economy, checks the price and the 12 cap again, and writes the
// economy, the dinos record and the ledger line together. If anything fails the egg is taken out again and
// nothing was written. A kill can therefore never take the points without the egg, or give the egg for free.
// Buys run one after the other, so ten fast taps buy at most one egg for the points the kid has.
import type { Clock } from '../core/clock';
import { dayKey } from '../core/clock';
import { MSG_CAP_REACHED, purchaseEgg, shopDinoCount, capReached } from '../core/economy';
import type { DinoStore } from '../dinos/dino-store';
import type { DinoKindId } from '../dinos/kinds';
import { DINO_KINDS } from '../dinos/kinds';
import { request, transact } from '../storage/db';
import { defaultKv, type EconomyRecord } from '../storage/schema';

export interface PurchaseDeps {
  db: IDBDatabase;
  dinos: DinoStore;
  clock: Clock;
}

export type BuyOutcome =
  | { ok: true; points: number; kind: DinoKindId; price: number }
  | { ok: false; reason: 'cap' | 'points' | 'storage'; note: string; points: number | null };

export const MSG_BUY_FAILED = 'Het kopen lukt nu niet. Er is niets afgerekend. Probeer het straks nog eens.';

class Blocked extends Error {
  constructor(readonly reason: 'cap' | 'points', readonly note: string, readonly points: number) {
    super(note);
  }
}

const queues = new WeakMap<DinoStore, Promise<unknown>>();

/** Buys one egg of `kind`. Never throws. */
export function buyEgg(deps: PurchaseDeps, kind: DinoKindId): Promise<BuyOutcome> {
  const before = queues.get(deps.dinos) ?? Promise.resolve();
  const run = before.then(() => buyNow(deps, kind));
  queues.set(deps.dinos, run.catch(() => undefined));
  return run;
}

async function buyNow({ db, dinos, clock }: PurchaseDeps, kind: DinoKindId): Promise<BuyOutcome> {
  const count = shopDinoCount(dinos.dinos.map((d) => d.state), dinos.eggs.map((e) => e.egg));
  if (capReached(count)) return { ok: false, reason: 'cap', note: MSG_CAP_REACHED, points: null };
  const entry = dinos.addEgg(kind);
  try {
    const points = await transact(db, ['kv', 'ledger'], 'readwrite', async (tx) => {
      const kv = tx.objectStore('kv');
      const stored = await request<Partial<EconomyRecord> | undefined>(kv.get('economy'));
      const eco: EconomyRecord = { ...defaultKv('economy'), ...(stored ?? {}) };
      // The count before this egg: the check must not count the egg that is being bought.
      const result = purchaseEgg(eco, count, kind);
      if (!result.ok) throw new Blocked(result.reason, result.note, eco.points);
      await request(kv.put(result.economy, 'economy'));
      await request(kv.put(dinos.toRecord(), 'dinos'));
      const now = clock.now();
      await request(tx.objectStore('ledger').add({ ts: now, day: dayKey(now), delta: -result.price, reason: 'shop' }));
      return result.economy.points;
    });
    return { ok: true, points, kind, price: DINO_KINDS[kind].price };
  } catch (e) {
    dinos.removeEgg(entry.id);
    if (e instanceof Blocked) return { ok: false, reason: e.reason, note: e.note, points: e.points };
    return { ok: false, reason: 'storage', note: MSG_BUY_FAILED, points: null };
  }
}
