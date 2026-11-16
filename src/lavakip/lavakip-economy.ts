// The Lavakip economy (v23, decision 144): buy the bar for 60, order a lavakip for 3 (at most 10), use one, move the
// bar home. A buy is ONE transaction through the shared helper (`buyInOneTransaction`): the points, the record and one
// `lavakip` ledger row. Every action runs through one queue, so 20 quick orders become 20 turns, never a race.
import { registerHook } from '../dev/e2e-hooks';
import type { Clock } from '../core/clock';
import type { Rng } from '../core/rng';
import { createRng } from '../core/rng';
import { systemClock } from '../core/clock';
import { buyInOneTransaction } from '../app/buy';
import { request } from '../storage/db';
import { readLavakip, updateLavakip } from '../storage/lavakip-store';
import { START_SPOT } from '../world/terrain';
import { findHomeSpot, findSpotInFront } from './bar-spot';
import {
  LAVAKIP_BAR_PRICE,
  LAVAKIP_MAX,
  LAVAKIP_PRICE,
  type LavakipRecord,
  type LavakipShopState,
  type LavakipSpot,
  type LavakipStateView,
} from './lavakip-types';
import type { ViewPose } from './bar-spot';
import type { World } from '../world/world';

export interface LavakipEconomyDeps {
  db: IDBDatabase;
  world: World;
  /** The eye and view of the kid, for "Zet hier neer". */
  pose(): ViewPose;
  rng?: Rng;
  clock?: Clock;
  /** Tells the bar system and the menus that the record changed. */
  onChange?(state: LavakipRecord): void;
}

export interface LavakipEconomy {
  /** Loads the saved record at boot. */
  load(record: LavakipRecord): void;
  /** A copy of the record now. */
  state(): LavakipRecord;
  /** What the shop section shows. Always a state here; the type keeps the seam of V22a (undefined hides the section). */
  shopState(points: number): LavakipShopState | undefined;
  /** Buys the bar for 60 once. */
  buyBar(): Promise<boolean>;
  /** Orders one lavakip for 3, at most 10 carried. False when points are short or 10 are carried. */
  order(): Promise<boolean>;
  /** Uses one carried lavakip (feeding). False at 0. */
  useOne(): Promise<boolean>;
  /** "Zet hier neer": moves the bar to the spot in front of the kid. */
  placeHere(): Promise<boolean>;
  /** Wereld opnieuw beginnen: the bar goes to the new home spot, `carried` stays. */
  moveHome(): Promise<void>;
}

export function createLavakipEconomy(deps: LavakipEconomyDeps): LavakipEconomy {
  const clock = deps.clock ?? systemClock;
  const rng = deps.rng ?? createRng(0x1a7a);
  let record: LavakipRecord = { bought: false, spot: null, carried: 0 };
  const copy = (): LavakipRecord => ({ bought: record.bought, spot: record.spot ? { ...record.spot } : null, carried: record.carried });
  const set = (next: LavakipRecord) => {
    record = { bought: next.bought, spot: next.spot ? { ...next.spot } : null, carried: next.carried };
    deps.onChange?.(copy());
  };
  const home = () => findHomeSpot(deps.world, START_SPOT, rng);

  let queue: Promise<unknown> = Promise.resolve();
  /** Runs one action after the ones before it; a throw is an answer of false, never a stuck queue. */
  function turn<T>(run: () => Promise<T>, failed: T): Promise<T> {
    const next = queue.then(run).catch(() => failed);
    queue = next;
    return next;
  }

  const economy: LavakipEconomy = {
    load(r) {
      set(r);
      if (r.bought && !r.spot) {
        // A bought bar with no spot (an old backup): the home spot, kept from now on.
        const spot = home();
        if (spot) {
          set({ ...r, spot });
          void updateLavakip(deps.db, (cur) => (cur.bought && !cur.spot ? { ...cur, spot } : cur)).catch(() => undefined);
        }
      }
    },
    state: copy,
    shopState(points) {
      return {
        points,
        bought: record.bought,
        placed: record.bought && record.spot !== null,
        carried: record.carried,
        canPlaceHere: record.bought && findSpotInFront(deps.world, deps.pose()) !== null,
      };
    },
    buyBar: () =>
      turn(async () => {
        if (record.bought) return false;
        const spot = home();
        let written: LavakipRecord | null = null;
        const done = await buyInOneTransaction(deps.db, {
          price: LAVAKIP_BAR_PRICE,
          reason: 'lavakip',
          now: clock.now(),
          apply: async (kv) => {
            const cur = readLavakip(await request<unknown>(kv.get('lavakip')));
            if (cur.bought) return false;
            written = { bought: true, spot, carried: cur.carried };
            await request(kv.put(written, 'lavakip'));
            return true;
          },
        });
        if (done && written) set(written);
        return done;
      }, false),
    order: () =>
      turn(async () => {
        let written: LavakipRecord | null = null;
        const done = await buyInOneTransaction(deps.db, {
          price: LAVAKIP_PRICE,
          reason: 'lavakip',
          now: clock.now(),
          apply: async (kv) => {
            const cur = readLavakip(await request<unknown>(kv.get('lavakip')));
            if (!cur.bought || cur.carried >= LAVAKIP_MAX) return false;
            written = { ...cur, carried: cur.carried + 1 };
            await request(kv.put(written, 'lavakip'));
            return true;
          },
        });
        if (done && written) set(written);
        return done;
      }, false),
    useOne: () =>
      turn(async () => {
        let used = false;
        const next = await updateLavakip(deps.db, (cur) => {
          used = cur.carried > 0;
          return used ? { ...cur, carried: cur.carried - 1 } : cur;
        });
        if (used) set(next);
        return used;
      }, false),
    placeHere: () =>
      turn(async () => {
        if (!record.bought) return false;
        const spot = findSpotInFront(deps.world, deps.pose());
        if (!spot) return false;
        set(await updateLavakip(deps.db, (cur) => (cur.bought ? { ...cur, spot } : cur)));
        return true;
      }, false),
    moveHome: () =>
      turn(async () => {
        if (!record.bought) return;
        const spot = home();
        set(await updateLavakip(deps.db, (cur) => (cur.bought ? { ...cur, spot: spot ?? cur.spot } : cur)));
      }, undefined),
  };

  if (__E2E__) {
    registerHook('lavakipState', (): LavakipStateView => {
      const s = economy.state();
      const spot: LavakipSpot | null = s.spot;
      return { bought: s.bought, spot, carried: s.carried };
    });
  }
  return economy;
}
