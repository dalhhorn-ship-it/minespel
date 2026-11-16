// V23a Lavakip-bar in the save: AC318. A restart, backup format 7, a 0.13.0 file, the bad files, Wereld opnieuw beginnen
// and Alles wissen.
import { expect, test, type Page } from '@playwright/test';
import { START_SPOT } from '../../src/world/terrain';
import file0140 from '../fixtures/backups/v0140-lavakip.json' with { type: 'json' };
import file0130 from '../fixtures/backups/v0130-moles.json' with { type: 'json' };
import { openApp, readState } from './helpers/app';
import { getKv, putKv } from './helpers/dorp';
import { loginAsParent, setupPin } from './helpers/gate';

interface Lavakip { bought: boolean; spot: { x: number; y: number; z: number } | null; carried: number }
const lavakip = (page: Page) => readState<Lavakip>(page, 'lavakipState');
// Playwright runs in Node; the project types do not include Node, so reach Buffer through globalThis.
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

declare global {
  interface Window {
    __shared?: { name: string; text: string }[];
  }
}

async function seedLavakip(page: Page, value: Lavakip): Promise<void> {
  await putKv(page, 'lavakip', value);
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
async function openImport(page: Page) {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
  await page.locator('.parent-import-export').waitFor();
}
async function pickRestore(page: Page, name: string, text: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
}
async function restoreOnEmpty(page: Page, text: string): Promise<void> {
  await openApp(page);
  await setupPin(page);
  await openImport(page);
  await pickRestore(page, 'backup.json', text);
  await page.evaluate(() => { (window as unknown as { __beforeRestore?: boolean }).__beforeRestore = true; });
  await page.locator('[data-testid="restore-yes"]').tap();
  await page.waitForFunction(() => {
    const w = window as unknown as { __beforeRestore?: boolean; __dino?: { ready?: () => boolean } };
    return w.__beforeRestore === undefined && w.__dino?.ready?.() === true;
  }, undefined, { timeout: 20_000 });
}

const SPOT = { x: 76, y: 12, z: 104 };

test.describe('Lavakip in the save (V23a, AC318)', () => {
  test('AC318: the bar and 4 lavakip are kept after the app is closed and reopened', async ({ page }) => {
    await openApp(page);
    await seedLavakip(page, { bought: true, spot: SPOT, carried: 4 });
    expect(await lavakip(page)).toEqual({ bought: true, spot: SPOT, carried: 4 });
    await page.reload();
    await openApp(page);
    expect(await lavakip(page)).toEqual({ bought: true, spot: SPOT, carried: 4 });
  });

  test('AC318: a backup is format 7 and holds the bar, its spot and the 4 lavakip, and restores on an empty iPad', async ({ browser }) => {
    const first = await browser.newContext();
    const a = await first.newPage();
    await a.addInitScript(() => {
      window.__shared = [];
      (navigator as unknown as { canShare: () => boolean }).canShare = () => true;
      (navigator as unknown as { share: (d: { files: File[] }) => Promise<void> }).share = async (d) => {
        for (const f of d.files) window.__shared!.push({ name: f.name, text: await f.text() });
      };
    });
    await openApp(a);
    await setupPin(a);
    await seedLavakip(a, { bought: true, spot: SPOT, carried: 4 });
    await openImport(a);
    await a.locator('[data-testid="backup-make"]').tap();
    await a.waitForFunction(() => window.__shared!.length > 0);
    const text = (await a.evaluate(() => window.__shared!))[0]!.text;
    await first.close();
    const made = JSON.parse(text) as { format: number; kv: { lavakip: Lavakip } };
    expect(made.format).toBe(7);
    expect(made.kv.lavakip).toEqual({ bought: true, spot: SPOT, carried: 4 });

    const second = await browser.newContext();
    const b = await second.newPage();
    await restoreOnEmpty(b, text);
    expect(await lavakip(b)).toEqual({ bought: true, spot: SPOT, carried: 4 });
    await second.close();
  });

  test('AC318: the 0.14.0 fixture restores with the bar, and a 0.13.0 file loads with no bar', async ({ browser }) => {
    expect((file0140 as { format: number }).format).toBe(7);
    const c1 = await browser.newContext();
    const p1 = await c1.newPage();
    await restoreOnEmpty(p1, JSON.stringify(file0140));
    expect(await lavakip(p1)).toEqual({ bought: true, spot: SPOT, carried: 4 });
    await c1.close();

    expect((file0130 as { format: number }).format).toBe(6);
    const c2 = await browser.newContext();
    const p2 = await c2.newPage();
    await restoreOnEmpty(p2, JSON.stringify(file0130));
    expect(await lavakip(p2)).toEqual({ bought: false, spot: null, carried: 0 });
    await c2.close();
  });

  for (const name of ['bad-v0140-carried-eleven', 'bad-v0140-carried-minus', 'bad-v0140-carried-half', 'bad-v0140-spot-outside', 'bad-v0140-spot-not-bought', 'bad-v0130-lavakip']) {
    test(`AC318: ${name}.json is refused with the friendly message and nothing changes`, async ({ page }) => {
      const bad = (await import(`../fixtures/backups/${name}.json`, { with: { type: 'json' } })).default as unknown;
      await openApp(page);
      await setupPin(page);
      await seedLavakip(page, { bought: true, spot: SPOT, carried: 2 });
      await openImport(page);
      await pickRestore(page, `${name}.json`, JSON.stringify(bad));
      await expect(page.locator('[data-testid="backup-message"]')).toContainText(/niets veranderd|niet klopt/);
      await expect(page.locator('[data-testid="restore-yes"]')).toHaveCount(0);
      expect(await lavakip(page)).toEqual({ bought: true, spot: SPOT, carried: 2 });
    });
  }

  test('AC318: Wereld opnieuw beginnen keeps the 4 lavakip and puts the bar on a free spot 5 to 12 from the start', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await seedLavakip(page, { bought: true, spot: { x: 10, y: 12, z: 10 }, carried: 4 });
    await openSettings(page);
    await tapButton(page, 'Wereld opnieuw beginnen');
    await tapButton(page, /Ja, maak een nieuwe wereld/);
    await expect.poll(async () => (await lavakip(page)).spot?.x).not.toBe(10);
    const s = await lavakip(page);
    expect(s.bought).toBe(true);
    expect(s.carried).toBe(4);
    const spot = s.spot!;
    const d = Math.hypot(spot.x - START_SPOT.x, spot.z - START_SPOT.z);
    expect(d).toBeGreaterThanOrEqual(5);
    expect(d).toBeLessThanOrEqual(12);
    await readState(page, 'flushSave');
    expect(await getKv<Lavakip>(page, 'lavakip')).toEqual(s);
  });

  test('AC318: Alles wissen leaves no bar and no lavakip', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await seedLavakip(page, { bought: true, spot: SPOT, carried: 4 });
    await openSettings(page);
    await tapButton(page, 'Alles wissen');
    await tapButton(page, 'Ja, ga verder');
    await tapButton(page, 'Ja, wis alles echt');
    // The record is gone from the database; the page then reloads and boots with the default.
    await expect
      .poll(async () => getKv<Lavakip>(page, 'lavakip').then((v) => v === undefined, () => false), { timeout: 20_000 })
      .toBe(true);
    await expect
      .poll(async () => lavakip(page).then((v) => v.bought, () => true), { timeout: 20_000 })
      .toBe(false);
    expect(await lavakip(page)).toEqual({ bought: false, spot: null, carried: 0 });
  });
});
