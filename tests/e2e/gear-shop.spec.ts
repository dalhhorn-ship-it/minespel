// The Uitrusting row of the Dinowinkel (V19b, AC258, AC259, AC260, AC266).
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

interface GearState {
  owned: string[];
  worn: Record<string, Record<string, string>>;
  knights: { id: string; worn: Record<string, string> }[];
}
interface Ledger { delta: number; reason: string }

const gear = (page: Page) => readState<GearState>(page, 'gearState');
const ledger = (page: Page) => readState<Ledger[]>(page, 'ledgerLog');
const toggle = (page: Page, id: string) => page.locator(`[data-testid="${id}-toggle"]`);
const ORDER = ['leren-kap', 'houten-schild', 'riddercape', 'kietelveer', 'ijzeren-helm', 'ijzeren-schild', 'glimzwaard', 'pony'];
const NAMES = ['Leren kap', 'Houten schild', 'Riddercape', 'Kietelveer', 'IJzeren helm', 'IJzeren schild', 'Glimzwaard', 'Pony'];
const PRICES = [10, 10, 15, 20, 25, 30, 50, 50];

async function openShop(page: Page, points: number) {
  await readState(page, 'setPoints', points);
  await readState(page, 'openShop');
  await expect(page.locator('[data-testid="shop-points"]')).toContainText(`${points} punt`);
}
async function setSwitch(page: Page, id: string) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
  await page.locator('.parent-settings').waitFor();
  await toggle(page, id).scrollIntoViewIfNeeded();
  await toggle(page, id).tap();
  await page.locator('.parent-close-btn').tap();
  await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
}

test.describe('Uitrusting shop (V19b)', () => {
  test('AC258: 8 cards in order with name, picture, slot and price, sizes of at least 56 and 44', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await openShop(page, 100);
    await expect(page.locator('[data-testid="shop-gear"]')).toContainText('Uitrusting');
    const cards = page.locator('.shop-gear-card');
    await expect(cards).toHaveCount(8);
    for (let i = 0; i < 8; i++) {
      const card = page.locator(`[data-testid="shop-gear-${ORDER[i]}"]`);
      await expect(card.locator('.shop-card-name')).toHaveText(NAMES[i]!);
      await expect(card.locator('.shop-card-price')).toHaveText(`${PRICES[i]} punten`);
      await expect(card.locator('.gear-icon')).toBeVisible();
      await expect(card.locator('.shop-chip')).not.toBeEmpty();
      await card.scrollIntoViewIfNeeded();
      const box = (await card.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(56);
      expect(box.height).toBeGreaterThanOrEqual(56);
      const buy = (await page.locator(`[data-testid="shop-buy-gear-${ORDER[i]}"]`).boundingBox())!;
      expect(buy.width).toBeGreaterThanOrEqual(44);
      expect(buy.height).toBeGreaterThanOrEqual(44);
    }
    const ids = await cards.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-testid')));
    expect(ids).toEqual(ORDER.map((id) => `shop-gear-${id}`));
  });

  test('AC258: the master off or Ridders off hides the row', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'addKnight', 'follow');
    await setSwitch(page, 'monsters-knights');
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-gear"]')).toHaveCount(0);
    await page.locator('.shop-close-btn').tap();
    await setSwitch(page, 'monsters-knights');
    await setSwitch(page, 'monsters-master');
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-gear"]')).toHaveCount(0);
  });

  test('AC259: Nee changes nothing, Ja buys the Pony with one ledger row', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await openShop(page, 50);
    await page.locator('[data-testid="shop-buy-gear-pony"]').tap();
    await page.locator('[data-testid="shop-confirm-no-gear-pony"]').tap();
    expect(await readState<number>(page, 'points')).toBe(50);
    expect((await gear(page)).owned).toEqual([]);
    expect(await ledger(page)).toHaveLength(0);
    await page.locator('[data-testid="shop-buy-gear-pony"]').tap();
    await page.locator('[data-testid="shop-confirm-yes-gear-pony"]').tap();
    await expect(page.locator('[data-testid="shop-note-gear-pony"]')).toHaveText('In je wapenkast');
    expect(await readState<number>(page, 'points')).toBe(0);
    expect((await gear(page)).owned).toEqual(['pony']);
    const rows = await ledger(page);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reason: 'gear', delta: -50 });
  });

  test('AC259: 100 points and 10 fast Ja taps buy exactly one Pony', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await openShop(page, 100);
    await page.locator('[data-testid="shop-buy-gear-pony"]').tap();
    await page.locator('[data-testid="shop-confirm-yes-gear-pony"]').evaluate(async (node) => {
      for (let i = 0; i < 10; i++) {
        const init = { pointerId: 1, bubbles: true, clientX: 5, clientY: 5 };
        node.dispatchEvent(new PointerEvent('pointerdown', init));
        node.dispatchEvent(new PointerEvent('pointerup', init));
        await new Promise((r) => setTimeout(r, 50));
      }
    });
    await expect.poll(async () => (await gear(page)).owned.length).toBe(1);
    expect(await readState<number>(page, 'points')).toBe(50);
    expect((await ledger(page)).filter((l) => l.reason === 'gear')).toHaveLength(1);
  });

  test('AC259: 49 points greys the Pony with "Nog 1 punt nodig"', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await openShop(page, 49);
    await expect(page.locator('[data-testid="shop-note-gear-pony"]')).toHaveText('Nog 1 punt nodig');
    await expect(page.locator('[data-testid="shop-buy-gear-pony"]')).toBeDisabled();
    await expect(page.locator('[data-testid="shop-buy-gear-leren-kap"]')).toBeEnabled();
    expect(await readState<boolean>(page, 'buyGearInShop', 'pony')).toBe(false);
    expect(await readState<number>(page, 'points')).toBe(49);
  });

  test('AC260: an owned Pony cannot be bought again', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await readState(page, 'setPoints', 100);
    expect(await readState<boolean>(page, 'buyGearInShop', 'pony')).toBe(true);
    await openShop(page, 50);
    await expect(page.locator('[data-testid="shop-note-gear-pony"]')).toHaveText('In je wapenkast');
    await expect(page.locator('[data-testid="shop-buy-gear-pony"]')).toHaveCount(0);
    expect(await readState<boolean>(page, 'buyGearInShop', 'pony')).toBe(false);
  });

  test('AC260: no knight greys every card with "Koop eerst een ridder", trading in keeps the wapenkast', async ({ page }) => {
    await openApp(page);
    await openShop(page, 100);
    for (const id of ORDER) {
      await expect(page.locator(`[data-testid="shop-note-gear-${id}"]`)).toHaveText('Koop eerst een ridder');
      await expect(page.locator(`[data-testid="shop-buy-gear-${id}"]`)).toBeDisabled();
    }
    expect(await readState<boolean>(page, 'buyGearInShop', 'leren-kap')).toBe(false);
    expect((await gear(page)).owned).toEqual([]);
    await page.locator('.shop-close-btn').tap();

    await readState(page, 'addKnight', 'follow');
    await readState(page, 'setPoints', 100);
    expect(await readState<boolean>(page, 'buyGearInShop', 'leren-kap')).toBe(true);
    await readState(page, 'openShop');
    const [k] = (await gear(page)).knights;
    await page.locator(`[data-testid="shop-knight-trade-${k!.id}"]`).tap();
    await page.locator(`[data-testid="shop-knight-trade-yes-${k!.id}"]`).tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('0 van de 3');
    expect((await gear(page)).owned).toEqual(['leren-kap']);
    await expect(page.locator('[data-testid="shop-note-gear-leren-kap"]')).toHaveText('In je wapenkast');
  });

  test('AC266: trade in of a knight with 3 items shows the line, pays 15 and frees the items', async ({ page }) => {
    await openApp(page);
    const id = await readState<string>(page, 'addKnight', 'follow');
    await readState(page, 'setPoints', 100);
    for (const item of ['leren-kap', 'houten-schild', 'riddercape']) expect(await readState<boolean>(page, 'buyGearInShop', item)).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', id, 'leren-kap', 'hoofd')).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', id, 'houten-schild')).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', id, 'riddercape')).toBe(true);
    expect(Object.keys((await gear(page)).knights[0]!.worn)).toHaveLength(3);
    await readState(page, 'openShop');
    const before = await readState<number>(page, 'points');
    await page.locator(`[data-testid="shop-knight-trade-${id}"]`).tap();
    await expect(page.locator(`[data-testid="shop-knight-trade-box-${id}"]`)).toContainText('Zijn uitrusting gaat terug in de wapenkast.');
    await page.locator(`[data-testid="shop-knight-trade-yes-${id}"]`).tap();
    await expect(page.locator('[data-testid="shop-knight-count"]')).toContainText('0 van de 3');
    expect(await readState<number>(page, 'points')).toBe(before + 15);
    const g = await gear(page);
    expect([...g.owned].sort()).toEqual(['houten-schild', 'leren-kap', 'riddercape']);
    expect(Object.values(g.worn).flatMap((w) => Object.values(w))).toEqual([]);
  });

  test('AC266: a knight with nothing on gets no wapenkast line', async ({ page }) => {
    await openApp(page);
    const id = await readState<string>(page, 'addKnight', 'follow');
    await readState(page, 'openShop');
    await page.locator(`[data-testid="shop-knight-trade-${id}"]`).tap();
    await expect(page.locator(`[data-testid="shop-knight-trade-box-${id}"]`)).not.toContainText('wapenkast');
  });

  test('AC266: Ridders off hides the row, on again brings both knights back in the same gear', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    const a = await readState<string>(page, 'addKnight', 'follow');
    const b = await readState<string>(page, 'addKnight', 'stay');
    await readState(page, 'setPoints', 100);
    for (const item of ['leren-kap', 'houten-schild', 'kietelveer', 'pony']) expect(await readState<boolean>(page, 'buyGearInShop', item)).toBe(true);
    await readState(page, 'wearGear', a, 'leren-kap');
    await readState(page, 'wearGear', a, 'houten-schild');
    await readState(page, 'wearGear', b, 'kietelveer');
    await readState(page, 'wearGear', b, 'pony');
    const before = await gear(page);
    await setSwitch(page, 'monsters-knights');
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-gear"]')).toHaveCount(0);
    await page.locator('.shop-close-btn').tap();
    await setSwitch(page, 'monsters-knights');
    expect(await gear(page)).toEqual(before);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-gear"]')).toBeVisible();
  });

  test('AC266: Wereld opnieuw beginnen keeps the knights in the same gear and the same wapenkast', async ({ page }) => {
    await openApp(page);
    const a = await readState<string>(page, 'addKnight', 'follow');
    await readState(page, 'setPoints', 100);
    for (const item of ['leren-kap', 'pony']) expect(await readState<boolean>(page, 'buyGearInShop', item)).toBe(true);
    await readState(page, 'wearGear', a, 'leren-kap');
    await readState(page, 'wearGear', a, 'pony');
    const before = await gear(page);
    await readState(page, 'resetWorld');
    expect(await gear(page)).toEqual(before);
  });
});
