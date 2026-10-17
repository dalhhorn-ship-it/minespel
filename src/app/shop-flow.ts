// Dinowinkel flow orchestrator (T47, AC20, AC23, AC110, AC149, AC150).
// Writes economy, dinos, and ledger in a single atomic IndexedDB transaction (`transact(db, ['kv', 'ledger'], 'readwrite', ...)`),
// spawns the egg next to the player through `dino-store.ts`, plays `clink`, and guards against fast multi-tap purchases.

import type { Sound } from '../audio/sound';
import { systemClock, today, type Clock } from '../core/clock';
import { purchaseEgg, shopDinoCount } from '../core/economy';
import { registerHook } from '../dev/e2e-hooks';
import {
  addEgg,
  getActiveDinoStore,
  type DinoStore,
} from '../dinos/dino-store';
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
  deployChickens(count?: number): Promise<number>;
  destroy(): void;
}

export function createShopFlow(options: ShopFlowOptions): ShopFlow {
  const clock = options.clock ?? systemClock;
  let activeView: ShopView | null = null;
  let lastToast: string | null = null;
  let buyLock: Promise<boolean> = Promise.resolve(false);

  function resolveDinoStore(): DinoStore | null {
    return options.dinoStore ?? getActiveDinoStore();
  }

  async function readViewState(): Promise<ShopViewState> {
    const store = resolveDinoStore();
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

  async function executeBuy(kind: DinoKindId): Promise<boolean> {
    const store = resolveDinoStore();
    const dayStr = today(clock);
    const ts = clock.now();

    // Atomic IndexedDB transaction writing economy, dinos, and ledger together (AC150)
    if (options.db && store) {
      let spawnedEggId: string | null = null;
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
            const currentShopCount = store.shopCount();
            const res = purchaseEgg(currentEco, currentShopCount, kind);
            if (!res.ok) return false;

            const egg = store.spawnEggInMemory(kind, false);
            spawnedEggId = egg.id;
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
        lastToast = `Hoera! Je ${DINO_KINDS[kind].name}-ei ligt naast je in de wereld!`;
        if (activeView) {
          activeView.render(await readViewState());
        }
        return true;
      } catch {
        if (spawnedEggId) {
          store.removeEggInMemory(spawnedEggId);
        }
        return false;
      }
    }

    // Fallback when `db` is not passed directly (uses `records`, `addEgg`, and `logStore.appendLedger`)
    if (options.records) {
      const [eco, dinosRec] = await Promise.all([
        options.records.get('economy'),
        options.records.get('dinos'),
      ]);
      const currentShopCount = store
        ? store.shopCount()
        : shopDinoCount(
            (dinosRec.dinos ?? []) as { golden?: boolean; kind?: string }[],
            (dinosRec.eggs ?? []) as { golden?: boolean; kind?: string }[],
          );
      const res = purchaseEgg(eco, currentShopCount, kind);
      if (!res.ok) return false;

      await options.records.put('economy', res.economy);
      if (store) {
        await addEgg(kind, false);
      } else {
        await options.records.put('dinos', {
          dinos: [...(dinosRec.dinos ?? [])],
          eggs: [
            ...(dinosRec.eggs ?? []),
            { id: `egg-${ts}`, kind, golden: false, x: 32, y: 10, z: 32, playSeconds: 0 },
          ],
        });
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
      lastToast = `Hoera! Je ${DINO_KINDS[kind].name}-ei ligt naast je in de wereld!`;
      if (activeView) {
        activeView.render(await readViewState());
      }
      return true;
    }

    return false;
  }

  /** Serializes purchase calls so 10 rapid taps in 1 second never double-spend (AC110). */
  function buyEgg(kind: DinoKindId): Promise<boolean> {
    const next = buyLock.then(() => executeBuy(kind)).catch(() => false);
    buyLock = next;
    return next;
  }

  async function deployChickens(count = 1): Promise<number> {
    const store = resolveDinoStore();
    const n = Math.max(1, Math.min(10, Math.floor(count)));
    if (store) {
      const spawned = await store.deployChicken(n);
      options.sound?.play('chirp');
      lastToast =
        spawned.length === 1
          ? 'Tok tok! Er loopt nu een kip naast je in de wereld!'
          : `Tok tok! Er lopen nu ${spawned.length} nieuwe kippen naast je in de wereld!`;
      if (activeView) {
        activeView.render(await readViewState());
      }
      return spawned.length;
    }
    if (options.records) {
      const dinosRec = await options.records.get('dinos');
      const newChickens = Array.from({ length: n }, (_, idx) => ({
        id: `kip-${clock.now()}-${idx}`,
        kind: 'kip' as const,
        golden: false,
        name: '',
        mode: 'follow' as const,
        x: 32 + idx,
        y: 10,
        z: 32,
        heading: 0,
        growth: 2,
        stayX: 32 + idx,
        stayZ: 32,
      }));
      await options.records.put('dinos', {
        dinos: [...(dinosRec.dinos ?? []), ...newChickens],
        eggs: [...(dinosRec.eggs ?? [])],
      });
      options.sound?.play('chirp');
      lastToast =
        n === 1
          ? 'Tok tok! Er loopt nu een kip naast je in de wereld!'
          : `Tok tok! Er lopen nu ${n} nieuwe kippen naast je in de wereld!`;
      if (activeView) {
        activeView.render(await readViewState());
      }
      return n;
    }
    return 0;
  }

  function clear() {
    if (activeView) {
      activeView.destroy();
      activeView = null;
    }
    lastToast = null;
  }

  const flow: ShopFlow = {
    async open() {
      clear();
      const initialState = await readViewState();
      activeView = createShopView({
        state: initialState,
        now: options.now,
        onBuy: async (kind) => {
          await buyEgg(kind);
        },
        onDeployChickens: async (count) => {
          await deployChickens(count);
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
      options.screens.showKidOverlay(activeView.element);
    },
    buyEgg,
    deployChickens,
    destroy() {
      clear();
    },
  };

  if (__E2E__) {
    registerHook('openShop', () => flow.open());
    registerHook('buyEggInShop', (kind: DinoKindId) => flow.buyEgg(kind));
    registerHook('deployChickensInShop', (count?: number) => flow.deployChickens(count));
  }

  return flow;
}
