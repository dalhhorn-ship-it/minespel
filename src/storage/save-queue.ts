import { registerHook } from '../dev/e2e-hooks';
import { transact, request } from './db';
import type { KvName } from './schema';

export interface SaveQueueOptions {
  db: IDBDatabase;
  /** Delay before dirty records are written. Default 1000 ms. */
  delayMs?: number;
  /** Injectable for tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  onError?: (error: unknown) => void;
}

export interface SaveQueue {
  /** Tells the queue how to read the current value of a record. */
  register(name: KvName, read: () => unknown): void;
  /** Marks a record changed. It is written within `delayMs`. */
  markDirty(name: KvName): void;
  /** Writes all dirty records now, in one transaction. */
  flushNow(): Promise<void>;
  /**
   * Runs `fn` alone on the queue's write chain. No flush starts or reads records while it runs.
   * Flushes asked for meanwhile wait, then read fresh values. Do not call flushNow inside `fn`.
   */
  hold<T>(fn: () => Promise<T>): Promise<T>;
  /** Flushes when the page is hidden (not after simulateKill). Returns a detach function. */
  attachPageListeners(doc?: Document, win?: Window): () => void;
  /** Test only: stops flushing on hide, like iOS killing the app. */
  simulateKill(): void;
  pendingCount(): number;
}

export function createSaveQueue(options: SaveQueueOptions): SaveQueue {
  const { db, delayMs = 1000, onError } = options;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const readers = new Map<KvName, () => unknown>();
  const dirty = new Set<KvName>();
  let timer: unknown = null;
  let killed = false;
  let chain: Promise<void> = Promise.resolve();

  function flushOnce(): Promise<void> {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
    if (dirty.size === 0) return Promise.resolve();
    const names = [...dirty];
    dirty.clear();
    // Values are read now, so a write that comes later is not mixed into this batch.
    const batch: [KvName, unknown][] = [];
    for (const name of names) {
      const read = readers.get(name);
      if (read) batch.push([name, read()]);
    }
    return transact(db, 'kv', 'readwrite', async (tx) => {
      const store = tx.objectStore('kv');
      for (const [name, value] of batch) await request(store.put(value, name));
    }).catch((e: unknown) => {
      for (const name of names) dirty.add(name); // keep them, try again at the next flush
      onError?.(e);
    });
  }

  function flushNow(): Promise<void> {
    chain = chain.then(flushOnce);
    return chain;
  }

  function hold<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn);
    chain = run.then(() => undefined, () => undefined);
    return run;
  }

  const queue: SaveQueue = {
    register(name, read) {
      readers.set(name, read);
    },
    markDirty(name) {
      dirty.add(name);
      if (timer === null && !killed) {
        timer = setTimer(() => {
          timer = null;
          void flushNow();
        }, delayMs);
      }
    },
    flushNow,
    hold,
    attachPageListeners(doc = document, win = window) {
      const onHide = () => {
        if (killed) return;
        if (doc.visibilityState === 'hidden') void flushNow();
      };
      const onPageHide = () => {
        if (!killed) void flushNow();
      };
      doc.addEventListener('visibilitychange', onHide);
      win.addEventListener('pagehide', onPageHide);
      return () => {
        doc.removeEventListener('visibilitychange', onHide);
        win.removeEventListener('pagehide', onPageHide);
      };
    },
    simulateKill() {
      killed = true;
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
    },
    pendingCount: () => dirty.size,
  };

  if (__E2E__) {
    registerHook('simulateKill', () => queue.simulateKill());
  }
  return queue;
}
