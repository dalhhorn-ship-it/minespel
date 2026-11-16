// Backup in the parent area (T53a): AC87 end to end, AC194, AC195, AC197, AC198, AC152 (restore part).
import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { fromLegacy, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

declare global {
  interface Window {
    __shared?: { name: string; text: string }[];
  }
}

/** The share sheet does not exist headless: a stub keeps the file that would be shared. */
async function stubShare(page: Page) {
  await page.addInitScript(() => {
    window.__shared = [];
    (navigator as unknown as { canShare: () => boolean }).canShare = () => true;
    (navigator as unknown as { share: (d: { files: File[] }) => Promise<void> }).share = async (d) => {
      for (const f of d.files) window.__shared!.push({ name: f.name, text: await f.text() });
    };
  });
}

async function openExport(page: Page, pin = '1234') {
  await loginAsParent(page, pin);
  await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
  await page.locator('.parent-import-export').waitFor();
}

async function makeBackup(page: Page): Promise<{ name: string; text: string }> {
  const before = await page.evaluate(() => window.__shared!.length);
  await page.locator('[data-testid="backup-make"]').tap();
  await page.waitForFunction((n) => window.__shared!.length > n, before);
  const files = await page.evaluate(() => window.__shared!);
  return files[files.length - 1]!;
}

// Playwright runs in Node; the project types do not include Node, so reach Buffer through globalThis.
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

async function pickRestore(page: Page, name: string, text: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
}

const ready = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);

test.describe('Backup (T53a)', () => {
  test('AC194 AC198: one file with today\'s name, no pincode, a date saved, no outside request, version 0.15.0', async ({ page }) => {
    expect(pkg.version).toBe('0.15.0');
    const outside: string[] = [];
    await stubShare(page);
    await openApp(page);
    const appOrigin = new URL(page.url()).origin;
    page.on('request', (r) => {
      if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== appOrigin) outside.push(r.url());
    });
    await setupPin(page);
    await openExport(page);
    await expect(page.locator('[data-testid="last-backup"]')).toHaveText('Nog geen backup gemaakt');
    const file = await makeBackup(page);
    const d = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    expect(file.name).toBe(`dino-blokwereld-backup-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}.json`);
    const json = JSON.parse(file.text) as { kv: Record<string, unknown>; appVersion: string };
    expect(json.kv.gate).toBeUndefined();
    expect(json.kv.worldV1).toBeUndefined();
    expect(json.appVersion).toBe(pkg.version);
    expect(await page.evaluate(() => window.__shared!.length)).toBe(1);
    await expect(page.locator('[data-testid="last-backup"]')).toContainText('Laatste backup:');
    expect(outside).toEqual([]);
  });

  test('AC87 AC197 AC152: backup, Alles wissen, new pincode, restore: world is back and the new pincode works', async ({ page }) => {
    await stubShare(page);
    await openApp(page);
    await setupPin(page, '1234');
    await readState(page, 'setPoints', 42);
    const cell = fromLegacy(7, 25, 7);
    await readState(page, 'setBlock', cell.x, cell.y, cell.z, 3);
    await readState(page, 'markWorldDirty');
    await readState(page, 'flushSave');
    await openExport(page);
    const file = await makeBackup(page);
    // Alles wissen.
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    const tapSettings = async (name: string) => {
      const b = page.locator('.parent-settings button', { hasText: name }).first();
      await b.scrollIntoViewIfNeeded();
      await b.tap();
    };
    await tapSettings('Alles wissen');
    await tapSettings('Ja, ga verder');
    // A mark on this page: it is gone once the page has really reloaded (WebKit can answer from the old page for a moment).
    await page.evaluate(() => ((window as unknown as { __oldPage?: boolean }).__oldPage = true));
    await tapSettings('Ja, wis alles echt');
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __oldPage?: boolean }).__oldPage === true).catch(() => true), { timeout: 20_000 })
      .toBe(false);
    await ready(page);
    expect(await readState<number>(page, 'points')).toBe(0);
    // A new pincode, then restore.
    await setupPin(page, '4321');
    await openExport(page, '4321');
    await pickRestore(page, file.name, file.text);
    await expect(page.locator('[data-testid="restore-confirm"]')).toContainText('Alles op deze iPad wordt vervangen door de backup van');
    // Annuleren changes nothing.
    await page.locator('[data-testid="restore-cancel"]').tap();
    expect(await readState<number>(page, 'points')).toBe(0);
    await pickRestore(page, file.name, file.text);
    await page.locator('[data-testid="restore-yes"]').tap();
    await expect.poll(() => readState<number>(page, 'points').catch(() => -1)).toBe(42);
    await expect.poll(() => readState<number>(page, 'blockAt', cell.x, cell.y, cell.z).catch(() => -1)).toBe(3);
    // This iPad's own (new) pincode is kept, the old one is not.
    await loginAsParent(page, '4321');
  });

  test('AC195: files that are not valid show a plain message and change nothing', async ({ page }) => {
    await stubShare(page);
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setPoints', 42);
    await openExport(page);
    await pickRestore(page, 'x.json', 'dit is geen json');
    await expect(page.locator('[data-testid="backup-message"]')).toContainText('Er is niets veranderd');
    const file = await makeBackup(page);
    const bad = JSON.parse(file.text) as { kv: { dinos: { dinos: { name: string }[] } } };
    bad.kv.dinos = { dinos: [{ kind: 'compy', name: '<b>Pip</b>' }], eggs: [] } as never;
    await pickRestore(page, 'bad.json', JSON.stringify(bad));
    await expect(page.locator('[data-testid="backup-message"]')).toContainText('niets veranderd');
    await expect(page.locator('[data-testid="restore-confirm"]')).toHaveCount(0);
    await expect(page.locator('.parent-import-export b')).toHaveCount(0);
    expect(await readState<number>(page, 'points')).toBe(42);
  });

  test('AC197: a restore killed halfway leaves all the old data', async ({ page }) => {
    await stubShare(page);
    await openApp(page);
    await setupPin(page);
    await readState(page, 'setPoints', 42);
    await readState(page, 'flushSave');
    await openExport(page);
    const file = await makeBackup(page);
    const other = JSON.parse(file.text) as { kv: { economy: { points: number } } };
    other.kv.economy.points = 7;
    await readState(page, 'killNextRestore');
    await pickRestore(page, file.name, JSON.stringify(other));
    await page.locator('[data-testid="restore-yes"]').tap();
    await expect(page.locator('[data-testid="backup-message"]')).toContainText('niets veranderd');
    await page.reload();
    await ready(page);
    expect(await readState<number>(page, 'points')).toBe(42);
  });
});
