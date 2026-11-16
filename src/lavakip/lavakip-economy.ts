// The Lavakip economy (v23, decision 144): buy the bar for 60, order a lavakip for 3 (at most 10), use one, move the
// bar home. V22a holds the typed seam with an in memory record and refusals; V23a fills it with the shared buy helper
// (`buyInOneTransaction`, one `lavakip` ledger row) and `updateLavakip`.
import { registerHook } from '../dev/e2e-hooks';
import type { Clock } from '../core/clock';
import type { Rng } from '../core/rng';
import type { LavakipRecord, LavakipShopState, LavakipSpot, LavakipStateView } from './lavakip-types';
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
  /** What the shop section shows, or undefined: no section yet (until V23a). */
  shopState(points: number): LavakipShopState | undefined;
  /** Buys the bar for 60 once. False until V23a. */
  buyBar(): Promise<boolean>;
  /** Orders one lavakip for 3, at most 10 carried. False until V23a. */
  order(): Promise<boolean>;
  /** Uses one carried lavakip (feeding). False at 0. */
  useOne(): Promise<boolean>;
  /** "Zet hier neer": moves the bar to the spot in front of the kid. False until V23a. */
  placeHere(): Promise<boolean>;
  /** Wereld opnieuw beginnen: the bar goes to the new home spot, `carried` stays. */
  moveHome(): Promise<void>;
}

export function createLavakipEconomy(deps: LavakipEconomyDeps): LavakipEconomy {
  let record: LavakipRecord = { bought: false, spot: null, carried: 0 };
  const copy = (): LavakipRecord => ({ bought: record.bought, spot: record.spot ? { ...record.spot } : null, carried: record.carried });
  const economy: LavakipEconomy = {
    load(r) {
      record = { bought: r.bought, spot: r.spot ? { ...r.spot } : null, carried: r.carried };
      deps.onChange?.(copy());
    },
    state: copy,
    shopState: () => undefined,
    buyBar: () => Promise.resolve(false),
    order: () => Promise.resolve(false),
    useOne: () => Promise.resolve(false),
    placeHere: () => Promise.resolve(false),
    moveHome: () => Promise.resolve(),
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
