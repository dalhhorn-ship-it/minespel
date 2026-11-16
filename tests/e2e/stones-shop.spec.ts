// The Edelstenen section of the Dinowinkel (V20c, AC273, AC274). The found stone comes from a seeded `monsters` record.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Ledger { delta: number; reason: string }
interface StonesState { found: number[]; bought: number[] }

function kv(page: Page, mode: 'get' | 'put', key: string, value?: unknown): Promise<unknown> {
  return page.evaluate(
    ({ mode, key, value }) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', mode === 'put' ? 'readwrite' : 'readonly');
          const store = tx.objectStore('kv');
          const req = mode === 'put' ? store.put(value, key) : store.get(key);
          tx.oncomplete = () => resolve(req.result);
          tx.onerror = () => reject(tx.error);
        };
      }),
    { mode, key, value },
  );
}

/** Seeds the stones and the points, optionally turns every switch off, and reopens the app. */
async function seed(page: Page, stones: StonesState, points: number, off = false) {
  await openApp(page);
  const m = ((await kv(page, 'get', 'monsters')) ?? {}) as Record<string, unknown>;
  await kv(page, 'put', 'monsters', { ...m, stones });
  if (off) {
    const s = ((await kv(page, 'get', 'settings')) ?? {}) as Record<string, unknown>;
    await kv(page, 'put', 'settings', { ...s, monstersEnabled: false, knightsEnabled: false, moleEnabled: false });
  }
  await page.reload();
  await openApp(page);
  await readState(page, 'setPoints', points);
  await readState(page, 'openShop');
  await expect(page.locator('[data-testid="shop-points"]')).toContainText(`${points} punt`);
}

const card = (page: Page, id: number) => page.locator(`[data-testid="shop-stone-${id}"]`);
const ids = [43, 44, 45, 46, 47, 48, 49, 50];

for (const off of [false, true]) {
  const where = off ? 'with the master, Ridders and Monstermol off' : 'with the switches on';
  test.describe(`Stones shop ${where} (V20c)`, () => {
    test('AC273: 8 cards in price order, "?" with the hint and no Kopen for stones not found', async ({ page }) => {
      await seed(page, { found: [], bought: [] }, 1000, off);
      await expect(page.locator('[data-testid="shop-stones"]')).toBeVisible();
      const order = await page.locator('.shop-stone').evaluateAll((n) => n.map((e) => e.getAttribute('data-testid')));
      expect(order).toEqual(ids.map((i) => `shop-stone-${i}`));
      for (const id of ids) {
        await expect(card(page, id)).toContainText('Ergens diep onder de grond');
        await expect(card(page, id).locator('button')).toHaveCount(0);
        const box = (await card(page, id).boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(56);
        expect(box.height).toBeGreaterThanOrEqual(56);
      }
      expect(await readState<boolean>(page, 'buyStoneInShop', 43)).toBe(false);
      expect(await readState<number>(page, 'points')).toBe(1000);
    });

    test('AC273: Maansteen found with 79 points is greyed with "Nog 1 punt nodig" and cannot be bought', async ({ page }) => {
      await seed(page, { found: [43], bought: [] }, 79, off);
      await expect(card(page, 43)).toContainText('Maansteen');
      await expect(card(page, 43)).toContainText('80');
      await expect(page.locator('[data-testid="shop-stone-note-43"]')).toHaveText('Nog 1 punt nodig');
      await expect(page.locator('[data-testid="shop-stone-buy-43"]')).toBeDisabled();
      expect(await readState<boolean>(page, 'buyStoneInShop', 43)).toBe(false);
      expect(await readState<number>(page, 'points')).toBe(79);
      await expect(card(page, 44)).toContainText('Ergens diep onder de grond');
    });

    test('AC273 AC274: Kopen has a 44 x 44 tap area, Nee changes nothing, Ja buys once with one stone ledger row', async ({ page }) => {
      await seed(page, { found: [43], bought: [] }, 80, off);
      const buy = page.locator('[data-testid="shop-stone-buy-43"]');
      const box = (await buy.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      await buy.tap();
      await page.locator('[data-testid="shop-stone-no-43"]').tap();
      expect(await readState<number>(page, 'points')).toBe(80);
      expect(await readState<Ledger[]>(page, 'ledgerLog')).toHaveLength(0);
      await buy.tap();
      await page.locator('[data-testid="shop-stone-yes-43"]').tap();
      await expect(page.locator('[data-testid="shop-stone-bought-43"]')).toHaveText('Gekocht!');
      await expect(page.locator('[data-testid="shop-stone-buy-43"]')).toHaveCount(0);
      expect(await readState<number>(page, 'points')).toBe(0);
      const rows = await readState<Ledger[]>(page, 'ledgerLog');
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ reason: 'stone', delta: -80 });
      expect(await readState<StonesState>(page, 'stonesState')).toEqual({ found: [43], bought: [43] });
      expect(((await kv(page, 'get', 'monsters')) as { stones: StonesState }).stones).toEqual({ found: [43], bought: [43] });
    });

    test('AC274: 160 points and 10 fast Ja taps buy Maansteen once and leave 80', async ({ page }) => {
      await seed(page, { found: [43], bought: [] }, 160, off);
      await page.locator('[data-testid="shop-stone-buy-43"]').tap();
      await page.locator('[data-testid="shop-stone-yes-43"]').evaluate(async (node) => {
        for (let i = 0; i < 10; i++) {
          const init = { pointerId: 1, bubbles: true, clientX: 5, clientY: 5 };
          node.dispatchEvent(new PointerEvent('pointerdown', init));
          node.dispatchEvent(new PointerEvent('pointerup', init));
          await new Promise((r) => setTimeout(r, 50));
        }
      });
      await expect(page.locator('[data-testid="shop-stone-bought-43"]')).toBeVisible();
      expect(await readState<number>(page, 'points')).toBe(80);
      expect((await readState<Ledger[]>(page, 'ledgerLog')).filter((l) => l.reason === 'stone')).toHaveLength(1);
      expect(await readState<boolean>(page, 'buyStoneInShop', 43)).toBe(false);
      expect(await readState<number>(page, 'points')).toBe(80);
    });
  });
}
