// Buying and trading in a knight (v17, AC200 to AC202). One transaction holds the points, the `monsters` record
// and the ledger row; only after the commit does the live knight system change. A lock makes a second Ja wait.
import { buyInOneTransaction } from '../app/buy';
import type { Clock } from '../core/clock';
import { systemClock } from '../core/clock';
import { defaultKv, type MonstersRecord } from '../storage/schema';
import { request } from '../storage/db';
import { dropKnight, readGear, toGearRecord } from './gear';
import type { GearEconomy } from './gear-economy';
import type { KnightSystem } from './knight-system';
import { KNIGHT_PRICE, KNIGHT_TRADEIN, MAX_KNIGHTS, type KnightRecord } from './knight-types';

export interface KnightEconomy {
  /** Buys one knight. False when points are short, the cap is reached, a buy is running or the write failed. */
  buy(): Promise<boolean>;
  /** Trades the knight in for KNIGHT_TRADEIN points. False when he is not there or the write failed. */
  tradeIn(id: string): Promise<boolean>;
}

export interface KnightEconomyOptions {
  db: IDBDatabase;
  knights: Pick<KnightSystem, 'add' | 'remove' | 'knights'>;
  /** The gear economy (v19): after a trade in its copy follows. Without it nothing wears gear. */
  gear?: Pick<GearEconomy, 'afterTradeIn'>;
  clock?: Clock;
}

async function readMonsters(kv: IDBObjectStore): Promise<MonstersRecord> {
  const raw = await request<Partial<MonstersRecord> | undefined>(kv.get('monsters'));
  return { ...defaultKv('monsters'), ...(raw ?? {}) };
}

export function createKnightEconomy(options: KnightEconomyOptions): KnightEconomy {
  const clock = options.clock ?? systemClock;
  let busy = false;
  let counter = 0;

  async function locked(run: () => Promise<boolean>): Promise<boolean> {
    if (busy) return false;
    busy = true;
    try {
      return await run();
    } catch {
      return false;
    } finally {
      busy = false;
    }
  }

  return {
    buy: () =>
      locked(async () => {
        const now = clock.now();
        const record: KnightRecord = {
          id: `knight-${now.toString(36)}-${(counter++).toString(36)}`,
          mode: 'follow',
          spot: null,
          boughtFor: KNIGHT_PRICE,
        };
        const done = await buyInOneTransaction(options.db, {
          price: KNIGHT_PRICE,
          reason: 'knight',
          now,
          apply: async (kv) => {
            const m = await readMonsters(kv);
            if (m.knights.length >= MAX_KNIGHTS) return false;
            await request(kv.put({ ...m, knights: [...m.knights, record] }, 'monsters'));
            return true;
          },
        });
        if (done) options.knights.add(record);
        return done;
      }),
    tradeIn: (id) =>
      locked(async () => {
        const done = await buyInOneTransaction(options.db, {
          price: -KNIGHT_TRADEIN,
          reason: 'tradein',
          now: clock.now(),
          apply: async (kv) => {
            const m = await readMonsters(kv);
            if (!m.knights.some((k) => k.id === id)) return false;
            const next: MonstersRecord = { ...m, knights: m.knights.filter((k) => k.id !== id) };
            // His gear goes back to the wapenkast in this same transaction (AC266). No gear field: nothing is added.
            if (m.gear) next.gear = toGearRecord(dropKnight(readGear(m), id));
            await request(kv.put(next, 'monsters'));
            return true;
          },
        });
        if (done) {
          options.knights.remove(id);
          options.gear?.afterTradeIn(id);
        }
        return done;
      }),
  };
}
