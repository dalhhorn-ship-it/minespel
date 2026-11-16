// V20b Diepe edelstenen, AC272 AC275 AC276: finding a stone by mining, the Diep tab, placing a bought stone, the empty slot.
// The pure rules have unit tests; these specs prove them in a real browser with the real world.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState, waitFrames } from './helpers/app';
import { fingerTap, fingerTapText, getKv, putKv } from './helpers/dorp';

type Cell = [number, number, number];
interface Stones { found: number[]; bought: number[] }
interface Build { mode: string; hotbar: number[]; selected: number }

const MAANSTEEN = 43;
const ZONNESTEEN = 44;
const speech = (page: Page) => page.locator('.speech-line');
const stones = (page: Page) => readState<Stones>(page, 'stonesState');
const cells = (page: Page, id: number) => readState<Cell[]>(page, 'veinCells', id);

async function seedStones(page: Page, value: Stones): Promise<void> {
  const current = (await getKv<Record<string, unknown>>(page, 'monsters')) ?? { knights: [], bubbleClockMs: 0, hintShown: false };
  await putKv(page, 'monsters', { ...current, stones: value });
  await page.reload();
  await openApp(page);
}

test.describe('Diepe edelstenen: found and building', () => {
  test('AC272: mining a Maansteen cell finds it once, with the toast, and the first stone is saved', async ({ page }) => {
    await openApp(page);
    const found = await cells(page, MAANSTEEN);
    expect(found.length).toBeGreaterThanOrEqual(2);
    expect(await stones(page)).toEqual({ found: [], bought: [] });

    const [x, y, z] = found[0]!;
    expect(await readState<boolean>(page, 'mineAt', x, y, z)).toBe(true);
    expect(await readState<number>(page, 'blockAt', x, y, z)).toBe(0);
    await expect(speech(page)).toHaveText('Je hebt Maansteen ontdekt!');
    expect(await stones(page)).toEqual({ found: [MAANSTEEN], bought: [] });

    // A second Maansteen: wait for the toast to go, then mine, and no new toast shows.
    await expect(speech(page)).toBeHidden({ timeout: 8000 });
    const [x2, y2, z2] = found[1]!;
    expect(await readState<boolean>(page, 'mineAt', x2, y2, z2)).toBe(true);
    expect(await readState<number>(page, 'blockAt', x2, y2, z2)).toBe(0);
    await waitFrames(page, 10);
    await expect(speech(page)).toBeHidden();
    expect(await stones(page)).toEqual({ found: [MAANSTEEN], bought: [] });

    await expect.poll(async () => (await getKv<{ stones?: Stones }>(page, 'monsters'))?.stones?.found).toEqual([MAANSTEEN]);
  });

  test('AC272: every monster switch off, a vein cell is found in the same way', async ({ page }) => {
    await openApp(page);
    const current = (await getKv<Record<string, unknown>>(page, 'monsters')) ?? {};
    await putKv(page, 'monsters', { ...current, knights: [], monstersEnabled: false });
    const [x, y, z] = (await cells(page, ZONNESTEEN))[0]!;
    expect(await readState<boolean>(page, 'mineAt', x, y, z)).toBe(true);
    await expect(speech(page)).toHaveText('Je hebt Zonnesteen ontdekt!');
    expect((await stones(page)).found).toEqual([ZONNESTEEN]);
  });

  test('AC275: a bought Maansteen is placed 100 times, points do not change, mining one keeps it bought', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 500);
    await seedStones(page, { found: [MAANSTEEN], bought: [MAANSTEEN] });
    expect(await stones(page)).toEqual({ found: [MAANSTEEN], bought: [MAANSTEEN] });
    const points = await readState<number>(page, 'points');

    await readState(page, 'setBuildState', { mode: 'bouwen', hotbar: [MAANSTEEN, 1, 3, 7, 9, 12, 18, 19], selected: 0 });
    // A strip of air high above the start world, so no dino, player or terrain is in the way.
    const { width, depth, height } = await readState<{ width: number; depth: number; height: number }>(page, 'worldSize');
    const y = height - 3;
    const placed: Cell[] = [];
    for (let i = 0; i < 100; i++) placed.push([(5 + (i % 10)) % width, y - Math.floor(i / 10), (depth - 6) % depth]);
    let ok = 0;
    for (const [x, py, z] of placed) if (await readState<boolean>(page, 'placeAt', x, py, z)) ok++;
    expect(ok).toBe(100);
    for (const [x, py, z] of placed) expect(await readState<number>(page, 'blockAt', x, py, z)).toBe(MAANSTEEN);
    expect(await readState<number>(page, 'points')).toBe(points);

    const [mx, my, mz] = placed[0]!;
    expect(await readState<boolean>(page, 'mineAt', mx, my, mz)).toBe(true);
    expect(await readState<number>(page, 'blockAt', mx, my, mz)).toBe(0);
    expect((await stones(page)).bought).toEqual([MAANSTEEN]);
  });

  test('AC275: Zonnesteen found but not bought shows an empty slot and places nothing', async ({ page }) => {
    await openApp(page);
    await seedStones(page, { found: [MAANSTEEN, ZONNESTEEN], bought: [MAANSTEEN] });
    await readState(page, 'setBuildState', { mode: 'bouwen', hotbar: [MAANSTEEN, ZONNESTEEN, 1, 3, 7, 9, 12, 18], selected: 1 });
    const slots = page.locator('.hotbar-slot');
    await expect(slots.nth(1)).toHaveClass(/hotbar-slot-empty/);
    await expect(slots.nth(1)).toHaveAttribute('aria-label', 'Leeg vakje');
    await expect(slots.nth(0)).not.toHaveClass(/hotbar-slot-empty/);

    const { height, depth } = await readState<{ height: number; depth: number }>(page, 'worldSize');
    const cell: Cell = [8, height - 3, depth - 6];
    expect(await readState<boolean>(page, 'placeAt', ...cell)).toBe(false);
    expect(await readState<number>(page, 'blockAt', ...cell)).toBe(0);
    expect((await readState<Build>(page, 'buildState')).hotbar[1]).toBe(ZONNESTEEN);
  });

  test('AC276: the Diep tab after Dorp, 8 tiles in price order, the three states, tap areas of 44 x 44', async ({ page }) => {
    await openApp(page);
    await seedStones(page, { found: [MAANSTEEN, ZONNESTEEN], bought: [MAANSTEEN] });
    await fingerTapText(page, 'Alle blokken');
    const tabs = await page.locator('[data-testid^="grid-cat-"]').allInnerTexts();
    expect(tabs.indexOf('Diep')).toBe(tabs.indexOf('Dorp') + 1);
    await fingerTap(page, '[data-testid="grid-cat-diep"]');

    const tiles = page.locator('button.grid-stone');
    await expect(tiles).toHaveCount(8);
    const ids = await tiles.evaluateAll((all) => all.map((t) => (t as HTMLElement).dataset.blockId));
    expect(ids).toEqual(['43', '44', '45', '46', '47', '48', '49', '50']);
    await expect(page.locator('[data-testid="grid-stone-count"]')).toHaveText('1 van de 8 gekocht');
    await expect(tiles.nth(0)).toHaveText('Maansteen');
    await expect(tiles.nth(1)).toContainText('Koop in de Dinowinkel');
    await expect(tiles.nth(2)).toContainText('?');
    await expect(tiles.nth(2)).toContainText('Ergens diep onder de grond');
    for (let i = 0; i < 8; i++) {
      const box = (await tiles.nth(i).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    // A lock tile and a "?" tile do nothing: the panel stays open and the hotbar is the same.
    const before = (await readState<Build>(page, 'buildState')).hotbar;
    await tiles.nth(1).scrollIntoViewIfNeeded();
    const lockBox = (await tiles.nth(1).boundingBox())!;
    await page.touchscreen.tap(lockBox.x + lockBox.width / 2, lockBox.y + lockBox.height / 2);
    const qBox = (await tiles.nth(2).boundingBox())!;
    await page.touchscreen.tap(qBox.x + qBox.width / 2, qBox.y + qBox.height / 2);
    await expect(page.locator('.block-grid')).toBeVisible();
    expect((await readState<Build>(page, 'buildState')).hotbar).toEqual(before);

    // The bought one goes in the selected slot with one tap.
    const selected = (await readState<Build>(page, 'buildState')).selected;
    await tiles.nth(0).scrollIntoViewIfNeeded();
    const okBox = (await tiles.nth(0).boundingBox())!;
    await page.touchscreen.tap(okBox.x + okBox.width / 2, okBox.y + okBox.height / 2);
    await expect(page.locator('.block-grid')).toBeHidden();
    expect((await readState<Build>(page, 'buildState')).hotbar[selected]).toBe(MAANSTEEN);
    const slot = (await page.locator('.hotbar-slot').nth(selected).boundingBox())!;
    expect(slot.width).toBeGreaterThanOrEqual(44);
    expect(slot.height).toBeGreaterThanOrEqual(44);
  });
});
