// V20d Diepe edelstenen, AC277 AC278 AC279: stones through Wereld opnieuw beginnen, Alles wissen and a backup restore,
// the restored hotbar rule, and a full session with mining and buying that stays inside the app.
import { expect, test, type Page } from '@playwright/test';
import stonesFile from '../fixtures/backups/v0110-stones.json' with { type: 'json' };
import { openApp, readState } from './helpers/app';
import { getKv, putKv } from './helpers/dorp';
import { loginAsParent, setupPin } from './helpers/gate';

type Cell = [number, number, number];
interface Stones { found: number[]; bought: number[] }

const MAANSTEEN = 43;
const stones = (page: Page) => readState<Stones>(page, 'stonesState');
const cells = (page: Page, id: number) => readState<Cell[]>(page, 'veinCells', id);
// Playwright runs in Node; the project types do not include Node, so reach Buffer through globalThis.
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

async function seedStones(page: Page, value: Stones): Promise<void> {
  const current = (await getKv<Record<string, unknown>>(page, 'monsters')) ?? { knights: [], bubbleClockMs: 0, hintShown: false };
  await putKv(page, 'monsters', { ...current, stones: value });
  await page.reload();
  await openApp(page);
}

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

test.describe('Stones in the save (V20d)', () => {
  test('AC277: Wereld opnieuw beginnen keeps found and bought, and the mined vein is stone again', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await seedStones(page, { found: [43, 44, 45], bought: [43, 44] });
    const [x, y, z] = (await cells(page, MAANSTEEN))[0]!;
    expect(await readState<boolean>(page, 'mineAt', x, y, z)).toBe(true);
    expect(await readState<number>(page, 'blockAt', x, y, z)).toBe(0);

    await openSettings(page);
    await tapButton(page, 'Wereld opnieuw beginnen');
    await tapButton(page, /Ja, maak een nieuwe wereld/);
    await expect.poll(() => readState<number>(page, 'blockAt', x, y, z)).toBe(MAANSTEEN);
    expect(await stones(page)).toEqual({ found: [43, 44, 45], bought: [43, 44] });
    await readState(page, 'flushSave');
    expect((await getKv<{ stones?: Stones }>(page, 'monsters'))?.stones).toEqual({ found: [43, 44, 45], bought: [43, 44] });

    await page.reload();
    await openApp(page);
    expect(await stones(page)).toEqual({ found: [43, 44, 45], bought: [43, 44] });
    expect(await readState<number>(page, 'blockAt', x, y, z)).toBe(MAANSTEEN);
  });

  test('AC277: Alles wissen leaves no stone found or bought', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await seedStones(page, { found: [43, 44], bought: [43] });
    await openSettings(page);
    await tapButton(page, 'Alles wissen');
    await tapButton(page, 'Ja, ga verder');
    await tapButton(page, 'Ja, wis alles echt');
    await expect
      .poll(async () => (await stones(page).catch(() => ({ found: [-1], bought: [] }))).found.length, { timeout: 20_000 })
      .toBe(0);
    expect(await stones(page)).toEqual({ found: [], bought: [] });
  });
});

/** Restores a file on an empty iPad and waits for the reloaded game. */
async function restoreOnEmpty(page: Page, text: string): Promise<void> {
  await openApp(page);
  await setupPin(page);
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
  await page.locator('.parent-import-export').waitFor();
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
  await page.evaluate(() => { (window as unknown as { __beforeRestore?: boolean }).__beforeRestore = true; });
  await page.locator('[data-testid="restore-yes"]').tap();
  await page.waitForFunction(() => {
    const w = window as unknown as { __beforeRestore?: boolean; __dino?: { ready?: () => boolean } };
    return w.__beforeRestore === undefined && w.__dino?.ready?.() === true;
  }, undefined, { timeout: 20_000 });
}

test.describe('Stones in a restored backup (V20d)', () => {
  test('AC278: the 0.11.0 file restores with 3 found and 2 bought, and a stone not bought leaves its slot empty', async ({ page }) => {
    const file = JSON.parse(JSON.stringify(stonesFile)) as { format: number; kv: { player: { hotbar: number[] } } };
    expect(file.format).toBe(4);
    file.kv.player.hotbar = [43, 44, 1, 3, 7, 9, 12, 18];
    await restoreOnEmpty(page, JSON.stringify(file));
    expect(await stones(page)).toEqual({ found: [43, 45, 48], bought: [43, 48] });

    await readState(page, 'setBuildState', { mode: 'bouwen' });
    const slots = page.locator('.hotbar-slot');
    await expect(slots.nth(0)).not.toHaveClass(/hotbar-slot-empty/);
    await expect(slots.nth(1)).toHaveClass(/hotbar-slot-empty/);
  });

  test('AC278: a file with a stone bought but not found is refused with the friendly message and nothing changes', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await seedStones(page, { found: [44], bought: [] });
    const bad = JSON.parse(JSON.stringify(stonesFile)) as { kv: { monsters: { stones: Stones } } };
    bad.kv.monsters.stones = { found: [43], bought: [43, 45] };
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
    await page.locator('.parent-import-export').waitFor();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('[data-testid="backup-restore"]').tap();
    await (await chooser).setFiles({ name: 'bad.json', mimeType: 'application/json', buffer: nodeBuffer.from(JSON.stringify(bad)) as never });
    await expect(page.locator('[data-testid="backup-message"]')).toContainText(/niets veranderd|niet klopt/);
    await expect(page.locator('[data-testid="restore-yes"]')).toHaveCount(0);
    expect(await stones(page)).toEqual({ found: [44], bought: [] });
  });
});

test.describe('Stones safety (V20d, AC279)', () => {
  test('AC279: a full session with mining, buying and building makes no request beyond the app files', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== origin) outside.push(u);
    });
    await openApp(page);
    await readState(page, 'setPoints', 300);
    for (const id of [43, 44]) {
      const [x, y, z] = (await cells(page, id))[0]!;
      expect(await readState<boolean>(page, 'mineAt', x, y, z)).toBe(true);
    }
    expect(await readState<boolean>(page, 'buyStoneInShop', 43)).toBe(true);
    expect(await readState<number>(page, 'points')).toBe(220);
    await readState(page, 'setBuildState', { mode: 'bouwen', hotbar: [43, 1, 3, 7, 9, 12, 18, 19], selected: 0 });
    const { height, depth } = await readState<{ height: number; depth: number }>(page, 'worldSize');
    expect(await readState<boolean>(page, 'placeAt', 8, height - 3, depth - 6)).toBe(true);
    await readState(page, 'flushSave');
    expect(await stones(page)).toEqual({ found: [43, 44], bought: [43] });
    expect(outside).toEqual([]);
  });
});
