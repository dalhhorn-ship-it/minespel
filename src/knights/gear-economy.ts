// Buying, wearing and moving gear (v19, decision 142). The buy is ONE transaction: the points, the item in
// `monsters.gear.owned` and one ledger row `gear` (shared helper `buyInOneTransaction`). Wearing is one `updateMonsters`
// write. Only after a commit do the economy's copy and the live knights change. A busy lock makes a second buy wait out.
import { buyInOneTransaction } from '../app/buy';
import type { Clock } from '../core/clock';
import { systemClock } from '../core/clock';
import { registerHook } from '../dev/e2e-hooks';
import { updateMonsters } from '../storage/monsters-store';
import type { MonstersRecord } from '../storage/schema';
import { request } from '../storage/db';
import { defaultKv } from '../storage/schema';
import {
  EMPTY_GEAR, gearById, kracht, readGear, toGearRecord, walkSpeed, wear, dropKnight,
  type GearData, type GearSlot, type Worn,
} from './gear';
import type { KnightSystem } from './knight-system';

export interface GearEconomy {
  /** Takes the gear of a loaded `monsters` record and tells every knight what he wears. Boot calls it. */
  load(m: Pick<MonstersRecord, 'knights'> & { gear?: unknown }): void;
  /** The wapenkast (`owned`) and what each knight wears now. */
  state(): GearData;
  /** Buys one item once. False when it is owned, unknown, the points are short, there is no knight or a buy runs. */
  buy(id: string): Promise<boolean>;
  /** Puts an item on a knight (it leaves the knight who wore it, the item he had goes back) or, with null, takes the slot off. */
  wear(knightId: string, itemId: string | null, slot: GearSlot): Promise<boolean>;
  /** A knight was traded in and his `worn` entry is already gone from the record: the copy follows. */
  afterTradeIn(knightId: string): void;
}

export interface GearEconomyOptions {
  db: IDBDatabase;
  knights: Pick<KnightSystem, 'knights' | 'setGear'>;
  clock?: Clock;
}

export function createGearEconomy(options: GearEconomyOptions): GearEconomy {
  const clock = options.clock ?? systemClock;
  let data: GearData = EMPTY_GEAR;
  let busy = false;

  function apply(next: GearData): void {
    data = next;
    for (const k of options.knights.knights()) options.knights.setGear(k.id, next.worn[k.id]);
  }

  const economy: GearEconomy = {
    load(m) {
      apply(readGear(m));
    },
    state: () => data,
    async buy(id) {
      const item = gearById(id);
      if (!item || busy) return false;
      busy = true;
      try {
        const written: { v: GearData | null } = { v: null };
        const done = await buyInOneTransaction(options.db, {
          price: item.price,
          reason: 'gear',
          now: clock.now(),
          apply: async (kv) => {
            const raw = await request<Partial<MonstersRecord> | undefined>(kv.get('monsters'));
            const m: MonstersRecord = { ...defaultKv('monsters'), ...(raw ?? {}) };
            if (m.knights.length === 0) return false;
            const current = readGear(m);
            if (current.owned.includes(id)) return false;
            const next: GearData = { owned: [...current.owned, id], worn: current.worn };
            await request(kv.put({ ...m, gear: toGearRecord(next) }, 'monsters'));
            written.v = next;
            return true;
          },
        });
        if (done && written.v) apply(written.v);
        return done;
      } catch {
        return false;
      } finally {
        busy = false;
      }
    },
    async wear(knightId, itemId, slot) {
      try {
        let changed = false;
        let next: GearData = data;
        await updateMonsters(options.db, (m) => {
          const current = readGear(m);
          if (!m.knights.some((k) => k.id === knightId)) return m;
          const after = wear(current, knightId, itemId, slot);
          if (after === current) return m;
          changed = true;
          next = after;
          return { ...m, gear: toGearRecord(after) };
        });
        if (changed) apply(next);
        return changed;
      } catch {
        return false;
      }
    },
    afterTradeIn(knightId) {
      apply(dropKnight(data, knightId));
    },
  };

  if (__E2E__) {
    registerHook('gearState', () => ({
      owned: [...data.owned],
      worn: JSON.parse(JSON.stringify(data.worn)) as Record<string, Worn>,
      knights: options.knights.knights().map((k) => ({
        id: k.id, worn: { ...(data.worn[k.id] ?? {}) }, kracht: kracht(data.worn[k.id]), speed: walkSpeed(data.worn[k.id]),
      })),
    }));
    registerHook('wearGear', (knightId: string, itemId?: string | null, slot?: GearSlot) => {
      const id = itemId ?? null;
      const s = slot ?? (id ? gearById(id)?.slot : undefined);
      return s ? economy.wear(knightId, id, s) : Promise.resolve(false);
    });
  }

  return economy;
}

