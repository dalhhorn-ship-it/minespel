// Buying a stone (v20, AC273, AC274). ONE transaction: the points, the stone in `monsters.stones.bought` and one ledger
// row `stone` (shared helper `buyInOneTransaction`). Only after the commit does `flow.markBought(id)` change the live copy.
import type { Clock } from '../core/clock';
import { systemClock } from '../core/clock';
import { request } from '../storage/db';
import type { MonstersRecord } from '../storage/schema';
import { defaultKv } from '../storage/schema';
import { stoneById } from '../world/stones';
import { buyInOneTransaction } from './buy';
import { readStones, type StonesFlow } from './stones-flow';

export interface StonesEconomy {
  /** Buys a found stone once. False when it is not found, owned, points are short or a buy runs. */
  buy(id: number): Promise<boolean>;
}

export interface StonesEconomyOptions {
  db: IDBDatabase;
  flow: Pick<StonesFlow, 'state' | 'isBought' | 'markBought'>;
  clock?: Clock;
}

export function createStonesEconomy(options: StonesEconomyOptions): StonesEconomy {
  const clock = options.clock ?? systemClock;
  let busy = false;
  return {
    async buy(id) {
      const stone = stoneById(id);
      if (!stone || busy || options.flow.isBought(id)) return false;
      busy = true;
      try {
        const done = await buyInOneTransaction(options.db, {
          price: stone.price,
          reason: 'stone',
          now: clock.now(),
          apply: async (kv) => {
            const raw = await request<Partial<MonstersRecord> | undefined>(kv.get('monsters'));
            const m: MonstersRecord = { ...defaultKv('monsters'), ...(raw ?? {}) };
            const current = readStones(m);
            if (!current.found.includes(id) || current.bought.includes(id)) return false;
            const bought = [...current.bought, id].sort((a, b) => a - b);
            await request(kv.put({ ...m, stones: { found: current.found, bought } }, 'monsters'));
            return true;
          },
        });
        if (done) options.flow.markBought(id);
        return done;
      } catch {
        return false;
      } finally {
        busy = false;
      }
    },
  };
}
