// Giving a lavakip to a dino, golden dino, chicken or knight (v23, decision 144). V22a holds the seam the menus read:
// `menuOption` is null (no "Lavakip geven" yet). V23c fills it with the option, the feed and the 3 second snack.
import { registerHook } from '../dev/e2e-hooks';
import type { LavakipEconomy } from './lavakip-economy';
import type { FeedStateView, FeedTarget, LavakipMenuOption } from './lavakip-types';

export interface Feeder {
  /** The "Lavakip geven" entry for this animal or knight, or null: no bar, none carried, or not a target. Null until V23c. */
  menuOption(target: FeedTarget): LavakipMenuOption | null;
  /** Gives one lavakip: one carried lavakip less, a snack for the target. False when none is carried. False until V23c. */
  feed(target: FeedTarget): Promise<boolean>;
  state(): FeedStateView;
}

export interface FeederDeps {
  economy: Pick<LavakipEconomy, 'state' | 'useOne'>;
}

export function createFeeder(deps: FeederDeps): Feeder {
  void deps;
  const feeder: Feeder = {
    menuOption: () => null,
    feed: () => Promise.resolve(false),
    state: () => ({ snacking: [], fed: 0 }),
  };

  if (__E2E__) {
    registerHook('feedLavakip', (kind: FeedTarget['kind'], id: string) => feeder.feed({ kind, id }));
    registerHook('feedState', () => feeder.state());
  }
  return feeder;
}
