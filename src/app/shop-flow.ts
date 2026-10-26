// Dinowinkel flow orchestrator (T47, AC20, AC23, AC110, AC149, AC150, Inruilen decision 111).
// Writes economy, dinos, and ledger in a single atomic IndexedDB transaction (`transact(db, ['kv', 'ledger'], 'readwrite', ...)`),
// spawns the egg next to the player through `dino-store.ts`, plays `clink`, and guards against fast multi-tap purchases.

import type { Sound } from '../audio/sound';
import { systemClock, today, type Clock } from '../core/clock';
import { purchaseChicken, purchaseEgg, tradeIn } from '../core/economy';
import { registerHook } from '../dev/e2e-hooks';
import type { DinoStore } from '../dinos/dino-store';
import { DINO_KINDS, type DinoKindId } from '../dinos/kinds';
import { request, transact } from '../storage/db';
import type { LedgerInput, LogStore } from '../storage/log-store';
import type { Records } from '../storage/records';
import { defaultKv, type DinosRecord, type EconomyRecord } from '../storage/schema';
import {
  createShopView,
  type ShopDinoSummary,
  type ShopEggSummary,
  type ShopView,
  type ShopViewState,
} from '../ui/shop';
import type { ScreenManager } from './screens';

const MSG_NO_STORE = 'De winkel kan nu even niet kopen. Probeer het zo nog eens!';

export interface ShopFlowOptions {
  screens: ScreenManager;
  db?: IDBDatabase;
  records?: Records;
  logStore?: LogStore;
  dinoStore?: DinoStore;
  clock?: Clock;
  sound?: Pick<Sound, 'play'>;
  /** Optional fallback getter for lightweight tests without full Records. */
  getPoints?: () => Promise<number>;
  /** Optional callback to override the countdown clock and earn coins right away. */
  onEarnCoins?: () => void;
  now?: () => number;
}

export interface ShopFlow {
  open(): Promise<void>;
  buyEgg(kind: DinoKindId): Promise<boolean>;
  buyChicken(): Promise<boolean>;
  /** Trades in one dino or chicken by id for half its price. A golden dino is refused. */
  tradeIn(dinoId: string): Promise<boolean>;
  destroy(): void;
}

export function createShopFlow(options: ShopFlowOptions): ShopFlow {
  const clock = options.clock ?? systemClock;
  let activeView: ShopView | null = null;
  let lastToast: string | null = null;
  let buyLock: Promise<boolean> = Promise.resolve(false);

  async function readViewState(): Promise<ShopViewState> {
    const store = options.dinoStore ?? null;
    let points = 0;
    if (options.records) {
      const eco = await options.records.get('economy');
      points = eco.points;
    } else if (options.getPoints) {
      points = await options.getPoints();
    }

    let dinos: readonly ShopDinoSummary[] = [];
    let eggs: readonly ShopEggSummary[] = [];

    if (store) {
      dinos = store.dinos();
      eggs = store.eggs();
    } else if (options.records) {
      const raw = await options.records.get('dinos');
      dinos = (raw.dinos ?? []) as unknown as ShopDinoSummary[];
      eggs = (raw.eggs ?? []) as unknown as ShopEggSummary[];
    }

    return {
      points,
      dinos,
      eggs,
      toastMessage: lastToast,
    };
  }

  function boughtToast(kind: DinoKindId): string {
    return kind === 'kip'
      ? 'Tok tok! Je nieuwe kip loopt naast je in de wereld!'
      : `Hoera! Je ${DINO_KINDS[kind].name}-ei ligt naast je in de wereld!`;
  }

  async function executeBuy(kind: DinoKindId): Promise<boolean> {
    const store = options.dinoStore ?? null;
    const dayStr = today(clock);
    const ts = clock.now();

    // No dino store (world not started): refuse the buy and change no points.
    if (!store) {
      lastToast = MSG_NO_STORE;
      if (activeView) activeView.render(await readViewState());
      return false;
    }

    // Atomic IndexedDB transaction writing economy, dinos, and ledger together (AC150)
    if (options.db && store) {
      let spawnedId: string | null = null;
      try {
        const bought = await transact(
          options.db,
          ['kv', 'ledger'],
          'readwrite',
          async (tx) => {
            const kvStore = tx.objectStore('kv');
            const ledgerStore = tx.objectStore('ledger');
            const rawEco = await request<EconomyRecord | undefined>(kvStore.get('economy'));
            const currentEco: EconomyRecord = {
              ...defaultKv('economy'),
              ...(rawEco ?? {}),
            };
            const res =
              kind === 'kip'
                ? purchaseChicken(currentEco, store.chickenCount())
                : purchaseEgg(currentEco, store.shopCount(), kind);
            if (!res.ok) return false;

            const spawned = kind === 'kip' ? store.spawnChickenInMemory() : store.spawnEggInMemory(kind, false);
            spawnedId = spawned.id;
            const nextDinosRecord: DinosRecord = store.toRecord();
            const ledgerEntry: LedgerInput = {
              ts,
              day: dayStr,
              delta: -res.price,
              reason: 'shop',
            };

            await request(kvStore.put(res.economy, 'economy'));
            await request(kvStore.put(nextDinosRecord, 'dinos'));
            await request(ledgerStore.add(ledgerEntry));
            return true;
          },
        );
        if (!bought) {
          return false;
        }
        options.sound?.play('clink');
        lastToast = boughtToast(kind);
        if (activeView) {
          activeView.render(await readViewState());
        }
        return true;
      } catch {
        if (spawnedId) {
          store.removeEggInMemory(spawnedId);
          store.removeDinoInMemory(spawnedId);
        }
        return false;
      }
    }

    // Fallback when `db` is not passed directly (uses `records`, the store's `addEgg`, and `logStore.appendLedger`)
    if (options.records && store) {
      const eco = await options.records.get('economy');
      const res =
        kind === 'kip'
          ? purchaseChicken(eco, store.chickenCount())
          : purchaseEgg(eco, store.shopCount(), kind);
      if (!res.ok) return false;

      await options.records.put('economy', res.economy);
      if (kind === 'kip') {
        store.spawnChickenInMemory();
        await store.saveNow();
      } else {
        await store.addEgg(kind, false);
      }
      if (options.logStore) {
        await options.logStore.appendLedger({
          ts,
          day: dayStr,
          delta: -res.price,
          reason: 'shop',
        });
      }
      options.sound?.play('clink');
      lastToast = boughtToast(kind);
      if (activeView) {
        activeView.render(await readViewState());
      }
      return true;
    }

    return false;
  }

  function tradedToast(name: string, refund: number): string {
    return `Dag ${name}! Je kreeg ${refund} ${refund === 1 ? 'punt' : 'punten'} terug.`;
  }

  async function executeTradeIn(dinoId: string): Promise<boolean> {
    const store = options.dinoStore ?? null;
    if (!store) {
      lastToast = MSG_NO_STORE;
      if (activeView) activeView.render(await readViewState());
      return false;
    }
    const dino = store.getDino(dinoId);
    if (!dino) return false;
    const name = dino.name || DINO_KINDS[dino.kind].name;
    const dayStr = today(clock);
    const ts = clock.now();
    const index = store.dinos().indexOf(dino);

    let refund = 0;
    if (options.db) {
      let removed = false;
      try {
        const traded = await transact(options.db, ['kv', 'ledger'], 'readwrite', async (tx) => {
          const kvStore = tx.objectStore('kv');
          const ledgerStore = tx.objectStore('ledger');
          const rawEco = await request<EconomyRecord | undefined>(kvStore.get('economy'));
          const currentEco: EconomyRecord = { ...defaultKv('economy'), ...(rawEco ?? {}) };
          const res = tradeIn(currentEco, dino);
          if (!res.ok) return false;
          refund = res.refund;
          store.removeDinoInMemory(dinoId);
          removed = true;
          const ledgerEntry: LedgerInput = { ts, day: dayStr, delta: res.refund, reason: 'tradein' };
          await request(kvStore.put(res.economy, 'economy'));
          await request(kvStore.put(store.toRecord(), 'dinos'));
          await request(ledgerStore.add(ledgerEntry));
          return true;
        });
        if (!traded) return false;
      } catch {
        if (removed) store.restoreDinoInMemory(dino, index);
        return false;
      }
    } else if (options.records) {
      const eco = await options.records.get('economy');
      const res = tradeIn(eco, dino);
      if (!res.ok) return false;
      refund = res.refund;
      await options.records.put('economy', res.economy);
      store.removeDinoInMemory(dinoId);
      await store.saveNow();
      if (options.logStore) {
        await options.logStore.appendLedger({ ts, day: dayStr, delta: res.refund, reason: 'tradein' });
      }
    } else {
      return false;
    }

    options.sound?.play('clink');
    lastToast = tradedToast(name, refund);
    if (activeView) activeView.render(await readViewState());
    return true;
  }

  /** Trade ins share the purchase lock, so a fast double tap trades in one animal once. */
  function tradeInDino(dinoId: string): Promise<boolean> {
    const next = buyLock.then(() => executeTradeIn(dinoId)).catch(() => false);
    buyLock = next;
    return next;
  }

  /** Serializes purchase calls (eggs and chickens) so rapid taps never double-spend (AC110). */
  function buyEgg(kind: DinoKindId): Promise<boolean> {
    const next = buyLock.then(() => executeBuy(kind)).catch(() => false);
    buyLock = next;
    return next;
  }

  function clear() {
    if (activeView) {
      activeView.destroy();
      activeView = null;
    }
    lastToast = null;
  }

  const flow: ShopFlow = {
    /** Opens at once with a placeholder, then fills in the points and Kopen buttons once read (AC164). */
    async open() {
      clear();
      const view = createShopView({
        state: null,
        now: options.now,
        onBuy: async (kind) => {
          await buyEgg(kind);
        },
        onTradeIn: async (dinoId) => {
          await tradeInDino(dinoId);
        },
        onEarnCoins: options.onEarnCoins
          ? () => {
              clear();
              options.onEarnCoins?.();
            }
          : undefined,
        onClose: () => {
          clear();
          options.screens.showWorld();
        },
      });
      activeView = view;
      options.screens.showKidOverlay(view.element);
      try {
        const loaded = await readViewState();
        if (activeView === view) view.render(loaded);
      } catch {
        // The placeholder stays and "Sluiten" still works. No buying without known points.
      }
    },
    buyEgg,
    buyChicken: () => buyEgg('kip'),
    tradeIn: tradeInDino,
    destroy() {
      clear();
    },
  };

  if (__E2E__) {
    registerHook('openShop', () => flow.open());
    registerHook('buyEggInShop', (kind: DinoKindId) => flow.buyEgg(kind));
    registerHook('buyChickenInShop', () => flow.buyChicken());
    registerHook('tradeInInShop', (dinoId: string) => flow.tradeIn(dinoId));
  }

  return flow;
}
