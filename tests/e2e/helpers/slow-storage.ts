import type { Page } from '@playwright/test';

// R1d: makes saved data slow or silent, so a spec can tap before the app is ready.
// Call before the first page.goto. Nothing here waits for the app.

export type StorageHold =
  /** Opening the database answers after `ms`. Boot (and the whole app) is late by that long. */
  | { kind: 'open'; ms: number }
  /** Opening the database never answers. */
  | { kind: 'open-never' }
  /**
   * The database opens and the Lesboek has its lessons, but the first read of the kv record "settings"
   * is finished after `ms`. This is the late part of boot, after the lessons are loaded and before the app is ready.
   */
  | { kind: 'settings'; ms: number }
  /** Same as `settings`, but the read never answers. */
  | { kind: 'settings-never' };

export async function holdStorage(page: Page, hold: StorageHold): Promise<void> {
  await page.addInitScript((h: StorageHold) => {
    if (h.kind === 'open' || h.kind === 'open-never') {
      const realOpen = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (this: IDBFactory, ...args: Parameters<IDBFactory['open']>) {
        if (h.kind === 'open-never') return {} as IDBOpenDBRequest;
        const real = realOpen.apply(this, args);
        // Hold the success event: the handler is called late, the result is already there.
        const desc = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
        if (!desc?.set) return real;
        const set = desc.set;
        Object.defineProperty(real, 'onsuccess', {
          configurable: true,
          get: () => desc.get?.call(real),
          set: (fn: ((ev: Event) => unknown) | null) => {
            set.call(real, fn ? (ev: Event) => void setTimeout(() => fn.call(real, ev), h.ms) : fn);
          },
        });
        return real;
      };
      return;
    }
    // settings / settings-never: hold the end of the transaction that reads the kv record "settings".
    // (The app resolves a read when its transaction completes, so that is the event to hold.)
    const realGet = IDBObjectStore.prototype.get;
    const held = new WeakSet<object>();
    IDBObjectStore.prototype.get = function (this: IDBObjectStore, query: IDBValidKey | IDBKeyRange) {
      if (this.name === 'kv' && query === 'settings') held.add(this.transaction);
      return realGet.call(this, query);
    };
    const desc = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
    if (!desc?.set) return;
    const set = desc.set;
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      configurable: true,
      get: desc.get,
      set(this: IDBTransaction, fn: ((ev: Event) => unknown) | null) {
        // The app sets oncomplete before it reads, so decide when the event arrives.
        set.call(
          this,
          fn
            ? (ev: Event) => {
                if (!held.has(this)) return fn.call(this, ev);
                held.delete(this);
                if (h.kind === 'settings-never') return undefined;
                setTimeout(() => fn.call(this, ev), h.ms);
                return undefined;
              }
            : fn,
        );
      },
    });
  }, hold);
}
