// Ridders in the Dinowinkel (V17c, AC200, AC201, AC202).
import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

interface Knight { id: string; mode: string; x: number; y: number; z: number }
interface Ledger { delta: number; reason: string }

const knights = (page: Page) => readState<Knight[]>(page, 'knights');
const ledger = (page: Page) => readState<Ledger[]>(page, 'ledgerLog');

async function openShop(page: Page, points: number) {
  await readState(page, 'setPoints', points);
  await readState(page, 'openShop');
  await expect(page.locator('[data-testid="shop-points"]')).toContainText(`${points} punt`);
}

test.describe('Ridders shop (V17c)', () => {
  test('AC200 AC201: the Ridder card shows, Nee changes nothing, Ja buys one knight within 3 blocks', async ({ page }) => {
    await openApp(page);
    await openShop(page, 30);
    await expect(page.locator('[data-testid="shop-knights"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knight"]')).toContainText('Ridder');
    await expect(page.locator('[data-testid="shop-knight"]')).toContainText('30 punten');
    const buy = page.locator('[data-testid="shop-buy-knight"]');
    const box = (await buy.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    await buy.tap();
    await page.locator('[data-testid="shop-confirm-no-knight"]').tap();
    expect(await readState<number>(page, 'points')).toBe(30);
    expect(await knights(page)).toHaveLength(0);
    expect(await ledger(page)).toHaveLength(0);

    await buy.tap();
    await page.locator('[data-testid="shop-confirm-yes-knight"]').tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('1 van de 3');
    expect(await readState<number>(page, 'points')).toBe(0);
    const list = await knights(page);
    expect(list).toHaveLength(1);
    const me = await readState<{ x: number; z: number }>(page, 'player');
    expect(Math.hypot(list[0]!.x - me.x, list[0]!.z - me.z)).toBeLessThanOrEqual(3.5);
    const rows = await ledger(page);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: 'knight', delta: -30 });
  });

  test('AC201: 60 points and 10 fast Ja calls buy exactly one knight, 29 points buy none', async ({ page }) => {
    await openApp(page);
    await openShop(page, 60);
    await page.locator('[data-testid="shop-buy-knight"]').tap();
    await page.locator('[data-testid="shop-confirm-yes-knight"]').evaluate(async (node) => {
      for (let i = 0; i < 10; i++) {
        const init = { pointerId: 1, bubbles: true, clientX: 5, clientY: 5 };
        node.dispatchEvent(new PointerEvent('pointerdown', init));
        node.dispatchEvent(new PointerEvent('pointerup', init));
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    await expect.poll(async () => (await knights(page)).length).toBe(1);
    expect(await readState<number>(page, 'points')).toBe(30);
    expect((await ledger(page)).filter((l) => l.reason === 'knight')).toHaveLength(1);

    await openApp(page);
    await openShop(page, 29);
    await expect(page.locator('[data-testid="shop-buy-knight"]')).toBeDisabled();
  });

  test('AC200: 3 knights show "Je hebt al 3 ridders!" and cannot be bought', async ({ page }) => {
    await openApp(page);
    for (let i = 0; i < 3; i++) await readState(page, 'addKnight', 'follow');
    await openShop(page, 90);
    await expect(page.locator('[data-testid="shop-note-knight"]')).toHaveText('Je hebt al 3 ridders!');
    await expect(page.locator('[data-testid="shop-buy-knight"]')).toBeDisabled();
    expect(await readState<boolean>(page, 'buyKnightInShop')).toBe(false);
    expect(await knights(page)).toHaveLength(3);
    expect(await readState<number>(page, 'points')).toBe(90);
  });

  test('AC200: with 25 shop dinos and 10 chickens a knight can still be bought and the counts stay', async ({ page }) => {
    await openApp(page);
    for (let i = 0; i < 25; i++) await readState(page, 'addEgg', 'compy', false);
    for (let i = 0; i < 10; i++) await readState(page, 'addEgg', 'kip', false);
    await openShop(page, 30);
    const herd = await page.locator('[data-testid="shop-herd-count"]').textContent();
    const chickens = await page.locator('[data-testid="shop-chicken-count"]').textContent();
    await page.locator('[data-testid="shop-buy-knight"]').tap();
    await page.locator('[data-testid="shop-confirm-yes-knight"]').tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('1 van de 3');
    await expect(page.locator('[data-testid="shop-herd-count"]')).toHaveText(herd!);
    await expect(page.locator('[data-testid="shop-chicken-count"]')).toHaveText(chickens!);
    expect(await knights(page)).toHaveLength(1);
  });

  test('AC202: trade in gives 15 points, a +15 ledger row, the knight leaves and stays gone after a restart', async ({ page }) => {
    await openApp(page);
    await openShop(page, 30);
    await page.locator('[data-testid="shop-buy-knight"]').tap();
    await page.locator('[data-testid="shop-confirm-yes-knight"]').tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('1 van de 3');
    const [k] = await knights(page);
    await page.locator(`[data-testid="shop-knight-trade-${k!.id}"]`).tap();
    await page.locator(`[data-testid="shop-knight-trade-yes-${k!.id}"]`).tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('0 van de 3');
    expect(await readState<number>(page, 'points')).toBe(15);
    expect(await knights(page)).toHaveLength(0);
    expect((await ledger(page)).map((l) => [l.reason, l.delta])).toEqual([['knight', -30], ['tradein', 15]]);
    const page2 = await killApp(page);
    expect(await knights(page2)).toHaveLength(0);
    expect(await readState<number>(page2, 'points')).toBe(15);
  });

  test('AC200: the master or Ridders off hides the section', async ({ page }) => {
    await openApp(page);
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('dino-blokwereld');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('kv', 'readwrite');
            const store = tx.objectStore('kv');
            const get = store.get('settings');
            get.onsuccess = () => store.put({ ...(get.result ?? {}), knightsEnabled: false }, 'settings');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-knights"]')).toHaveCount(0);
  });
});
