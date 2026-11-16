// V23a Lavakip-bar in the Dinowinkel: AC310 (the card, greyed under 60), AC311 (Kopen, Ja or Nee, one bar, no block
// changed, the home spot), AC312 (Zet hier neer in the shop). The truck itself is drawn by V23b.
import { expect, test, type Page } from '@playwright/test';
import { START_SPOT } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';
import { getKv, putKv } from './helpers/dorp';

interface Lavakip { bought: boolean; spot: { x: number; y: number; z: number } | null; carried: number }
interface Ledger { delta: number; reason: string }
const AIR = 0;
const STEEN = 3;

const lavakip = (page: Page) => readState<Lavakip>(page, 'lavakipState');
const points = (page: Page) => readState<number>(page, 'points');
const ledger = (page: Page) => readState<Ledger[]>(page, 'ledgerLog');
const card = (page: Page) => page.locator('[data-testid="shop-lavakip-card"]');

async function seed(page: Page, pts: number, off = false) {
  await openApp(page);
  if (off) {
    const s = ((await getKv<Record<string, unknown>>(page, 'settings')) ?? {}) as Record<string, unknown>;
    await putKv(page, 'settings', { ...s, monstersEnabled: false, knightsEnabled: false, moleEnabled: false });
    await page.reload();
    await openApp(page);
  }
  await readState(page, 'setPoints', pts);
  await readState(page, 'openShop');
  await expect(page.locator('[data-testid="shop-points"]')).toContainText(`${pts} punt`);
}

/** Every block in a box around the start spot, as one string (to compare before and after). */
const snapshot = (page: Page, cx: number, cz: number) =>
  page.evaluate(
    ({ cx, cz }) => {
      const at = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino.blockAt!;
      const out: number[] = [];
      for (let y = 0; y < 40; y++) for (let z = cz - 16; z <= cz + 16; z++) for (let x = cx - 16; x <= cx + 16; x++) out.push(at(x, y, z));
      return out.join(',');
    },
    { cx, cz },
  );

for (const off of [false, true]) {
  const where = off ? 'with the master, Ridders and Monstermol off' : 'with the switches on';
  test.describe(`Lavakip-bar shop ${where} (V23a)`, () => {
    test('AC310: one card with name, picture and price 60, 56 x 56 or bigger', async ({ page }) => {
      await seed(page, 100, off);
      await expect(page.locator('[data-testid="shop-lavakip"]')).toBeVisible();
      await expect(page.locator('[data-testid="shop-lavakip"] .shop-section-title')).toHaveText('Lavakip-bar');
      await expect(page.locator('.shop-lavakip-card')).toHaveCount(1);
      await expect(card(page)).toContainText('60');
      await expect(card(page).locator('.shop-lavakip-truck')).toBeVisible();
      const box = (await card(page).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(56);
      expect(box.height).toBeGreaterThanOrEqual(56);
      const buy = (await page.locator('[data-testid="shop-lavakip-buy"]').boundingBox())!;
      expect(buy.width).toBeGreaterThanOrEqual(44);
      expect(buy.height).toBeGreaterThanOrEqual(44);
    });

    test('AC310: 59 points is greyed with "Nog 1 punt nodig" and cannot be bought', async ({ page }) => {
      await seed(page, 59, off);
      await expect(page.locator('[data-testid="shop-lavakip-note"]')).toHaveText('Nog 1 punt nodig');
      await expect(page.locator('[data-testid="shop-lavakip-buy"]')).toBeDisabled();
      expect(await readState<boolean>(page, 'buyLavakipBarInShop')).toBe(false);
      expect(await points(page)).toBe(59);
      expect((await lavakip(page)).bought).toBe(false);
      expect(await ledger(page)).toHaveLength(0);
    });
  });
}

test.describe('Lavakip-bar buying (V23a)', () => {
  test('AC311: Nee changes nothing, Ja buys: points 0, one ledger row, a free home spot 5 to 12 away, no block changed', async ({ page }) => {
    await seed(page, 60);
    const before = await snapshot(page, Math.round(START_SPOT.x), Math.round(START_SPOT.z));
    await page.locator('[data-testid="shop-lavakip-buy"]').tap();
    await expect(page.locator('[data-testid="shop-lavakip-confirm"]')).toContainText('60 punten');
    await page.locator('[data-testid="shop-lavakip-no"]').tap();
    await expect(page.locator('[data-testid="shop-lavakip-buy"]')).toBeVisible();
    expect(await points(page)).toBe(60);
    expect((await lavakip(page)).bought).toBe(false);

    await page.locator('[data-testid="shop-lavakip-buy"]').tap();
    await page.locator('[data-testid="shop-lavakip-yes"]').tap();
    await expect(page.locator('[data-testid="shop-lavakip-placed"]')).toHaveText('Staat in je wereld');
    await expect(page.locator('[data-testid="shop-lavakip-buy"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="shop-toast"]')).toHaveText('De Lavakip-bar staat bij je huis!');
    expect(await points(page)).toBe(0);
    const rows = (await ledger(page)).filter((r) => r.reason === 'lavakip');
    expect(rows).toEqual([expect.objectContaining({ delta: -60, reason: 'lavakip' })]);
    const state = await lavakip(page);
    expect(state.bought).toBe(true);
    const spot = state.spot!;
    const d = Math.hypot(spot.x - START_SPOT.x, spot.z - START_SPOT.z);
    expect(d).toBeGreaterThanOrEqual(5);
    expect(d).toBeLessThanOrEqual(12);
    // Free: 3 air above every column of 2 x 3, solid under it.
    for (let dx = 0; dx < 2; dx++) {
      for (let dz = 0; dz < 3; dz++) {
        expect(await readState<number>(page, 'blockAt', spot.x + dx, spot.y - 1, spot.z + dz)).not.toBe(AIR);
        for (let a = 0; a < 3; a++) expect(await readState<number>(page, 'blockAt', spot.x + dx, spot.y + a, spot.z + dz)).toBe(AIR);
      }
    }
    expect(await snapshot(page, Math.round(START_SPOT.x), Math.round(START_SPOT.z))).toBe(before);
  });

  test('AC311: 120 points and 10 buys in a second buy exactly one bar', async ({ page }) => {
    await seed(page, 120);
    const results = await page.evaluate(() => {
      const buy = (window as unknown as { __dino: Record<string, () => Promise<boolean>> }).__dino.buyLavakipBarInShop!;
      return Promise.all(Array.from({ length: 10 }, () => buy()));
    });
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await points(page)).toBe(60);
    expect((await ledger(page)).filter((r) => r.reason === 'lavakip')).toHaveLength(1);
  });

  test('AC312: Zet hier neer puts the bar 2 to 5 blocks in front of the kid, with no points and no ledger row', async ({ page }) => {
    await seed(page, 60);
    expect(await readState<boolean>(page, 'buyLavakipBarInShop')).toBe(true);
    // A flat patch 40 blocks from the start, so the test does not depend on the hills.
    const cx = Math.round(START_SPOT.x) + 40;
    const cz = Math.round(START_SPOT.z);
    const y0 = 20;
    await page.evaluate(
      ({ cx, cz, y0 }) => {
        const d = (window as unknown as { __dino: Record<string, (...a: number[]) => unknown> }).__dino;
        for (let x = cx - 10; x <= cx + 10; x++) for (let z = cz - 10; z <= cz + 10; z++) for (let y = 1; y < 40; y++) d.setBlock!(x, y, z, y < y0 ? 3 : 0, 1);
        d.rebuildWorld!();
        d.placePlayer!(cx + 0.5, y0, cz + 0.5, 0.7);
      },
      { cx, cz, y0 },
    );
    await readState(page, 'openShop');
    await page.locator('[data-testid="shop-lavakip-place"]').tap();
    await expect.poll(async () => (await lavakip(page)).spot?.x ?? 0).toBeGreaterThan(cx - 8);
    const spot = (await lavakip(page)).spot!;
    const d = Math.hypot(spot.x - (cx + 0.5), spot.z - (cz + 0.5));
    expect(d).toBeGreaterThanOrEqual(2);
    expect(d).toBeLessThanOrEqual(5);
    expect(spot.y).toBe(y0);
    expect(await points(page)).toBe(0);
    expect((await ledger(page)).filter((r) => r.reason === 'lavakip')).toHaveLength(1);
  });

  test('AC312: in a tunnel 1 block wide the bar stays and "Hier past de bar niet" shows', async ({ page }) => {
    await seed(page, 60);
    expect(await readState<boolean>(page, 'buyLavakipBarInShop')).toBe(true);
    const home = (await lavakip(page)).spot!;
    const cx = Math.round(START_SPOT.x) + 40;
    const cz = Math.round(START_SPOT.z) + 20;
    await page.evaluate(
      ({ cx, cz, stone }) => {
        const d = (window as unknown as { __dino: Record<string, (...a: number[]) => unknown> }).__dino;
        for (let x = cx - 8; x <= cx + 8; x++) for (let z = cz - 8; z <= cz + 8; z++) for (let y = 1; y < 40; y++) d.setBlock!(x, y, z, y <= 24 ? stone : 0, 1);
        for (let z = cz - 8; z <= cz + 8; z++) for (let y = 21; y <= 22; y++) d.setBlock!(cx, y, z, 0, 1);
        d.rebuildWorld!();
        d.placePlayer!(cx + 0.5, 21, cz + 0.5, 0);
      },
      { cx, cz, stone: STEEN },
    );
    await readState(page, 'openShop');
    await page.locator('[data-testid="shop-lavakip-place"]').tap();
    await expect(page.locator('[data-testid="shop-lavakip-noroom"]')).toHaveText('Hier past de bar niet. Zoek een vlak plekje.');
    expect((await lavakip(page)).spot).toEqual(home);
  });
});
