// Buying a stone (v20, AC273). STUB from V19a: `buy` resolves false and writes nothing; V20c fills it in with the
// shared `buyInOneTransaction` helper, the `stone` ledger reason and `flow.markBought(id)` after the commit.
import type { Clock } from '../core/clock';
import type { StonesFlow } from './stones-flow';

export interface StonesEconomy {
  /** Buys a found stone once. False when it is not found, owned, points are short or a buy runs. */
  buy(id: number): Promise<boolean>;
}

export interface StonesEconomyOptions {
  db: IDBDatabase;
  flow: Pick<StonesFlow, 'state' | 'isBought' | 'markBought'>;
  clock?: Clock;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- a stub with its final signature
export function createStonesEconomy(_options: StonesEconomyOptions): StonesEconomy {
  return { buy: () => Promise.resolve(false) };
}
