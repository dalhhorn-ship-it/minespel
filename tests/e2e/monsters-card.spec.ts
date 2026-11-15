// The parent card "Monsters en ridders" (V17c, AC208).
import { expect, test, type Page } from '@playwright/test';
import v060 from '../fixtures/backups/v060-no-monsters.json' with { type: 'json' };
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

const HELP_MASTER = 'Zet alles hieronder in één keer aan of uit.';
const HELP_KNIGHTS = 'Ridders koop je in de Dinowinkel. Ze volgen, wachten of passen op de dieren.';

async function openSettings(page: Page) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
  await page.locator('.parent-settings').waitFor();
}
async function closeParent(page: Page) {
  await page.locator('.parent-close-btn').tap();
  await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
}
const toggle = (page: Page, id: string) => page.locator(`[data-testid="${id}-toggle"]`);

test.describe('Monsters en ridders card (V17c)', () => {
  test('AC208: a new install shows both rows Aan with their exact help lines and 44 point targets', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    const card = page.locator('[data-testid="monsters-card"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toContainText('Monsters en ridders');
    await expect(page.locator('[data-testid="monsters-master"] .parent-switch-help')).toHaveText(HELP_MASTER);
    await expect(page.locator('[data-testid="monsters-knights"] .parent-switch-help')).toHaveText(HELP_KNIGHTS);
    for (const id of ['monsters-master', 'monsters-knights']) {
      await expect(toggle(page, id)).toHaveText('Aan');
      const box = (await toggle(page, id).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('AC208: Ridders off hides knights and the shop section, on again brings both back with their modes', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'addKnight', 'follow');
    await readState(page, 'addKnight', 'stay');
    const modes = (await readState<{ mode: string }[]>(page, 'knights')).map((k) => k.mode);
    expect(modes).toEqual(['follow', 'stay']);

    await openSettings(page);
    await toggle(page, 'monsters-knights').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-knights').tap();
    await expect(toggle(page, 'monsters-knights')).toHaveText('Uit');
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knights"]')).toHaveCount(0);
    await page.locator('.shop-close-btn').tap();

    await openSettings(page);
    await toggle(page, 'monsters-knights').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-knights').tap();
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-knights"]')).toBeVisible();
    await page.locator('.shop-close-btn').tap();
    expect((await readState<{ mode: string }[]>(page, 'knights')).map((k) => k.mode)).toEqual(modes);
  });

  test('AC208: the master off greys the Ridders row, keeps its value and hides the shop section', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    await toggle(page, 'monsters-master').scrollIntoViewIfNeeded();
    await toggle(page, 'monsters-master').tap();
    await expect(toggle(page, 'monsters-master')).toHaveText('Uit');
    await expect(page.locator('[data-testid="monsters-knights"]')).toHaveAttribute('data-greyed', 'true');
    await expect(toggle(page, 'monsters-knights')).toHaveText('Aan');
    await closeParent(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knights"]')).toHaveCount(0);
  });

  test('AC208: an existing install (settings without the switches) reads master and Ridders as Aan', async ({ page }) => {
    // The 0.6.0 backup has no switches in its settings, like a restored backup from before 0.7.0.
    expect((v060 as { kv?: { settings?: Record<string, unknown> } }).kv?.settings?.knightsEnabled).toBeUndefined();
    await openApp(page);
    await setupPin(page);
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('dino-blokwereld');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('kv', 'readwrite');
            const store = tx.objectStore('kv');
            const get = store.get('settings');
            get.onsuccess = () => {
              const rest = { ...(get.result ?? {}) };
              delete rest.monstersEnabled;
              delete rest.knightsEnabled;
              store.put(rest, 'settings');
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();
    await openApp(page);
    await openSettings(page);
    await expect(toggle(page, 'monsters-master')).toHaveText('Aan');
    await expect(toggle(page, 'monsters-knights')).toHaveText('Aan');
  });
});
