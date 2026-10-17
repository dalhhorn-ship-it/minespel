import type { BrowserContext, Page } from '@playwright/test';

/** Opens the app and waits until the e2e build says it is ready. */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => {
    const hooks = (window as unknown as { __dino?: Record<string, () => unknown> }).__dino;
    return hooks?.ready?.() === true;
  });
}

/** Calls a state reading hook registered by a feature (e2e build only). */
export async function readState<T = unknown>(page: Page, hook: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ({ hook, args }) => {
      const hooks = (window as unknown as { __dino?: Record<string, (...a: unknown[]) => unknown> }).__dino;
      const fn = hooks?.[hook];
      if (!fn) throw new Error(`E2E hook "${hook}" is not registered.`);
      return fn(...args);
    },
    { hook, args },
  ) as Promise<T>;
}

/**
 * Simulates iOS killing the app: the save queue stops flushing, the page closes,
 * and a new page opens in the same context (IndexedDB stays, unsaved changes are lost).
 * Fails clearly until T5 registers the `simulateKill` hook.
 */
export async function killApp(page: Page): Promise<Page> {
  const hasHook = await page.evaluate(
    () => typeof (window as unknown as { __dino?: Record<string, unknown> }).__dino?.simulateKill === 'function',
  );
  if (!hasHook) {
    throw new Error('killApp needs the "simulateKill" hook, which task T5 registers in save-queue.ts.');
  }
  const context: BrowserContext = page.context();
  await readState(page, 'simulateKill');
  await page.close();
  const fresh = await context.newPage();
  await openApp(fresh);
  return fresh;
}

/**
 * Simulates plain http: removes crypto.subtle, serviceWorker, share and storage.persist,
 * and sets isSecureContext to false. Call before the first page.goto.
 */
export async function asInsecure(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    try {
      Object.defineProperty(crypto, 'subtle', { value: undefined, configurable: true });
    } catch {
      /* ignore */
    }
    Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    if (navigator.storage) {
      Object.defineProperty(navigator.storage, 'persist', { value: undefined, configurable: true });
    }
  });
}
