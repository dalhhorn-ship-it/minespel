// Instellingen actions (T55a): Volume, version, Wereld opnieuw beginnen, Alles wissen.
import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

const VERSION = pkg.version;

async function openSettings(page: Page) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
  await page.locator('.parent-settings').waitFor();
}

async function tapButton(page: Page, name: string | RegExp) {
  const b = page.locator('.parent-settings button', { hasText: name }).first();
  await b.scrollIntoViewIfNeeded();
  await b.tap();
}

test.describe('Instellingen actions (T55a)', () => {
  test('AC192 AC93: Volume is 70 on a new game and 40 stays after a reopen', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    const slider = page.locator('[data-testid="volume-setting"]');
    await expect(slider).toHaveValue('70');
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = '40';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-testid="volume-value"]')).toHaveText('40');
    // Wait until the value is really in IndexedDB before the reopen.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            new Promise<number | null>((resolve) => {
              const open = indexedDB.open('dino-blokwereld');
              open.onsuccess = () => {
                const get = open.result.transaction('kv').objectStore('kv').get('settings');
                get.onsuccess = () => resolve((get.result as { volume?: number } | undefined)?.volume ?? null);
                get.onerror = () => resolve(null);
              };
              open.onerror = () => resolve(null);
            }),
        ),
      )
      .toBe(0.4);
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
    await openSettings(page);
    await expect(page.locator('[data-testid="volume-setting"]')).toHaveValue('40');
  });

  test('AC135: the version at the bottom of Instellingen equals package.json', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await expect(page.locator('[data-testid="app-version"]')).toHaveText(`Versie ${VERSION}`);
  });

  test('AC94 AC152: Wereld opnieuw beginnen resets blocks, keeps points and dinos', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setBlock', 7, 25, 7, 3);
    await readState(page, 'setPoints', 42);
    await readState(page, 'addEgg', 'compy', false);
    const eggs = await readState<unknown[]>(page, 'eggs');
    const dinos = await readState<unknown[]>(page, 'dinos');
    expect(await readState<number>(page, 'blockAt', 7, 25, 7)).toBe(3);
    await openSettings(page);
    await tapButton(page, 'Wereld opnieuw beginnen');
    await tapButton(page, /Ja, maak een nieuwe wereld/);
    await expect.poll(() => readState<number>(page, 'blockAt', 7, 25, 7)).toBe(0);
    expect(await readState<number>(page, 'points')).toBe(42);
    expect(await readState<unknown[]>(page, 'eggs')).toHaveLength(eggs.length);
    expect(await readState<unknown[]>(page, 'dinos')).toHaveLength(dinos.length);
  });

  test('AC193: Annuleren at either step changes nothing', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setPoints', 42);
    await openSettings(page);
    await tapButton(page, 'Alles wissen');
    await tapButton(page, 'Annuleren');
    await tapButton(page, 'Alles wissen');
    await tapButton(page, 'Ja, ga verder');
    await tapButton(page, 'Annuleren');
    await expect(page.locator('.parent-settings button', { hasText: 'Alles wissen' })).toBeVisible();
    expect(await readState<number>(page, 'points')).toBe(42);
  });

  test('AC193: both confirms wipe everything, then a new game asks the grown up question before a new pincode', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setPoints', 42);
    await readState(page, 'setBlock', 7, 25, 7, 3);
    await readState(page, 'flushSave');
    await openSettings(page);
    await tapButton(page, 'Alles wissen');
    await tapButton(page, 'Ja, ga verder');
    await tapButton(page, 'Ja, wis alles echt');
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
    await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
    expect(await readState<number>(page, 'points')).toBe(0);
    expect(await readState<number>(page, 'blockAt', 7, 25, 7)).toBe(0);
    // No pincode any more: the lock asks the grown up question first (decision 52).
    await readState(page, 'openParentControls');
    await expect(page.locator('.parent-gate-card p').first()).toContainText(/tel|trek|Tel/);
    await expect(page.locator('.parent-gate-key[data-key="1"]')).toHaveCount(0);
  });
});
