import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

// Set SHOTS_DIR to also save a screenshot of the shop.
const shotsDir = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.SHOTS_DIR;

interface Counts { dinos: number; eggs: number }
const counts = async (page: Page): Promise<Counts> => {
  const s = await readState<{ dinos: unknown[]; eggs: unknown[] }>(page, 'dinoState');
  return { dinos: s.dinos.length, eggs: s.eggs.length };
};
const owned = async (page: Page) => {
  const c = await counts(page);
  return c.dinos + c.eggs;
};
const points = (page: Page) => readState<number>(page, 'points');
const ledger = async (page: Page) => (await readState<{ ledger: number[] }>(page, 'logCounts')).ledger;

/** Writes the points straight into the save, like earlier breaks did. */
async function givePoints(page: Page, n: number) {
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('dino-blokwereld');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put({ points: value, practicePointsToday: 0, practiceDay: '' }, 'economy');
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, n);
}

async function tapOn(page: Page, selector: string) {
  const target = page.locator(selector).first();
  await target.waitFor({ state: 'visible' });
  const box = await target.boundingBox();
  if (!box) throw new Error(`No box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function openShop(page: Page) {
  await tapOn(page, '.hud-pause');
  await tapOn(page, '[data-pause="shop"]');
  await expect(page.locator('[data-screen-id="shop"]')).toBeVisible();
}

async function startWith(page: Page, n: number) {
  await openApp(page);
  await givePoints(page, n);
  await openShop(page);
}

test.describe('Dinowinkel', () => {
  test('four cards, Kopen with Ja buys an egg and takes the points (AC20)', async ({ page }) => {
    await startWith(page, 45);
    // The cards appear once the points are read from storage.
    const shop = page.locator('[data-screen-id="shop"]');
    for (const t of ['Compy', '20 punten', 'Triceratops', '40 punten', 'Stegosaurus', 'Brachiosaurus', '80 punten', 'Nog 35 punten nodig']) {
      await expect(shop).toContainText(t);
    }
    expect(await readState<boolean>(page, 'timerCounting')).toBe(false); // AC23
    await expect(page.locator('[data-screen-id="shop"] a')).toHaveCount(0);
    if (shotsDir) await page.screenshot({ path: `${shotsDir}/shop.png` });
    await tapOn(page, '[data-shop="buy-triceratops"]');
    await expect(page.locator('[data-shop="confirm"]')).toContainText('Triceratops kopen voor 40 punten?');
    await tapOn(page, '[data-shop="yes"]');
    await expect(page.locator('[data-shop="points"]')).toHaveText('Je hebt 5 punten');
    expect(await owned(page)).toBe(1);
    expect(await points(page)).toBe(5);
    expect(await ledger(page)).toEqual([-40]);
    await expect(page.locator('.shop-grey')).toHaveCount(4);
  });

  test('Nee buys nothing', async ({ page }) => {
    await startWith(page, 45);
    await tapOn(page, '[data-shop="buy-compy"]');
    await tapOn(page, '[data-shop="no"]');
    expect(await owned(page)).toBe(0);
    expect(await points(page)).toBe(45);
  });

  test('10 taps in 1 second buy exactly one egg (AC110)', async ({ page }) => {
    await startWith(page, 45);
    await tapOn(page, '[data-shop="buy-triceratops"]');
    const box = (await page.locator('[data-shop="yes"]').boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    for (let i = 0; i < 10; i++) await page.touchscreen.tap(x, y);
    await expect(page.locator('[data-shop="points"]')).toHaveText('Je hebt 5 punten');
    expect(await owned(page)).toBe(1);
    expect(await points(page)).toBe(5);
    expect(await ledger(page)).toEqual([-40]);
  });

  test('the pause menu shows the new points when the shop closes', async ({ page }) => {
    await startWith(page, 25);
    await tapOn(page, '[data-shop="buy-compy"]');
    await tapOn(page, '[data-shop="yes"]');
    await expect(page.locator('[data-shop="points"]')).toHaveText('Je hebt 5 punten');
    await tapOn(page, '[data-shop="back"]');
    await expect(page.locator('[data-pause="points"]')).toHaveText('Je hebt 5 punten');
  });

  test('the 12 dino cap shows the friendly line and every card is grey', async ({ page }) => {
    await openApp(page);
    await givePoints(page, 500);
    for (let i = 0; i < 12; i++) await readState(page, 'addTestEgg', 'compy', false);
    await openShop(page);
    await expect(page.locator('.shop-grey')).toHaveCount(4);
    await expect(page.locator('[data-screen-id="shop"]')).toContainText("Je hebt al 12 dino's! Wat een kudde.");
    await tapOn(page, '[data-shop="buy-compy"]');
    await expect(page.locator('[data-shop="confirm"]')).toHaveCount(0);
    expect(await points(page)).toBe(500);
  });

  test('killing the app right after Ja never loses the egg or takes the points twice (AC150)', async ({ page }) => {
    await startWith(page, 45);
    await tapOn(page, '[data-shop="buy-triceratops"]');
    await tapOn(page, '[data-shop="yes"]');
    const fresh = await killApp(page); // no wait: the kill comes right after the tap
    const have = await owned(fresh);
    const p = await points(fresh);
    // All or nothing: either the egg and the 40 points taken once, or neither.
    expect([[1, 5, 1], [0, 45, 0]]).toContainEqual([have, p, (await ledger(fresh)).length]);
  });

  test('after the purchase is saved a kill keeps the egg and the points taken once (AC150)', async ({ page }) => {
    await startWith(page, 45);
    await tapOn(page, '[data-shop="buy-triceratops"]');
    await tapOn(page, '[data-shop="yes"]');
    await expect(page.locator('[data-shop="points"]')).toHaveText('Je hebt 5 punten');
    const fresh = await killApp(page);
    expect(await owned(fresh)).toBe(1);
    expect(await points(fresh)).toBe(5);
    expect(await ledger(fresh)).toEqual([-40]);
  });
});
