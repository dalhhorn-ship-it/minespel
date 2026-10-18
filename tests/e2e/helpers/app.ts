import type { BrowserContext, Page } from '@playwright/test';
import { numberToDutch } from '../../../src/core/dutch-numbers';

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

/** Solves the grown up sum in words ("Neem negen keer zeven en trek daar ... van af."). Same words as src/gate/reset-question.ts. */
export function solveGateQuestion(text: string): number {
  const words = new Map<string, number>();
  for (let n = 0; n <= 999; n++) words.set(numberToDutch(n), n);
  const nums = (text.match(/[a-zë]+/g) ?? []).filter((w) => words.has(w)).map((w) => words.get(w) as number);
  const [a = 0, b = 0, c = 0] = nums;
  if (text.includes('trek daar')) return a * b - c;
  if (text.includes('tel daar')) return a * b + c;
  return (a + b) * c; // "Tel A en B bij elkaar op en neem dat dan C keer."
}

/** Answers the grown up sum shown by the PIN gate (no PIN yet, or PIN vergeten). */
export async function answerGateQuestion(page: Page, wrong = false): Promise<void> {
  const text = await page.locator('.parent-gate-card p').first().innerText();
  const answer = solveGateQuestion(text) + (wrong ? 1 : 0);
  await page.locator('.parent-input').fill(String(answer));
  await page.locator('.parent-gate-footer .parent-btn-primary').click();
}
