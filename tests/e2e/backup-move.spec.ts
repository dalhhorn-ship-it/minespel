// Backups for the big world (V15c, AC238): old format 1 files restore and the boot move does the rest,
// a file made by 0.8.0 (format 3, terrain version 3) restores byte for byte.
import { expect, test, type Page } from '@playwright/test';
import v050 from '../fixtures/backups/v050-old-shapes.json' with { type: 'json' };
import { backupV060, backupV070, save070 } from '../fixtures/move/old-saves';
import { fromLegacy, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

declare global {
  interface Window {
    __shared?: { name: string; text: string }[];
  }
}

const MOVE = { x: 32, y: 10, z: 32 };
const step = (p: { x: number; y: number; z: number }) => ({ x: p.x + MOVE.x, y: p.y + MOVE.y, z: p.z + MOVE.z });
// Playwright runs in Node; the project types do not include Node, so reach Buffer through globalThis.
const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

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

async function pickRestore(page: Page, name: string, text: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-testid="backup-restore"]').tap();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: nodeBuffer.from(text) as never });
}

/** Restores a file on an empty iPad and waits for the reloaded game (the move runs in that boot). */
async function restoreOnEmpty(page: Page, text: string): Promise<void> {
  await openApp(page);
  await setupPin(page);
  await openExport(page);
  await pickRestore(page, 'backup.json', text);
  await page.evaluate(() => { (window as unknown as { __beforeRestore?: boolean }).__beforeRestore = true; });
  await page.locator('[data-testid="restore-yes"]').tap();
  await page.waitForFunction(() => {
    const w = window as unknown as { __beforeRestore?: boolean; __dino?: { ready?: () => boolean } };
    return w.__beforeRestore === undefined && w.__dino?.ready?.() === true;
  }, undefined, { timeout: 20_000 });
}

/** The world record straight from IndexedDB, the diff as a plain array. */
function worldRecord(page: Page): Promise<{ diff: number[]; terrainVersion?: number }> {
  return page.evaluate(
    () =>
      new Promise<{ diff: number[]; terrainVersion?: number }>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').get('world');
          req.onsuccess = () => {
            const v = req.result as { diff: Uint32Array; terrainVersion?: number };
            resolve({ ...v, diff: Array.from(v.diff) });
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

async function expectMovedHut(page: Page): Promise<void> {
  const save = save070();
  const wrong = await page.evaluate(
    ({ changes, move }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      let bad = 0;
      for (const [x, y, z, id] of changes) if (hooks.blockAt!(x! + move.x, y! + move.y, z! + move.z) !== id) bad++;
      return bad;
    },
    { changes: save.changes, move: MOVE },
  );
  expect(wrong).toBe(0);
  expect(await readState<number>(page, 'terrainVersion')).toBe(3);
}

test.describe('Old backups restore into the big world (AC238)', () => {
  test('AC238: a backup made by 0.7.0 restores: world, player, animals and both knights are at the move', async ({ page }) => {
    const save = save070();
    await restoreOnEmpty(page, backupV070());
    await expectMovedHut(page);
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(p.x).toBeCloseTo(save.player.x + MOVE.x, 0);
    expect(p.z).toBeCloseTo(save.player.z + MOVE.z, 0);
    const dinos = await readState<{ id: string; stayX: number; stayZ: number }[]>(page, 'dinos');
    for (const old of save.dinos.dinos as Record<string, number | string>[]) {
      const now = dinos.find((d) => d.id === old.id)!;
      expect(now.stayX).toBeCloseTo((old.stayX as number) + MOVE.x, 5);
      expect(now.stayZ).toBeCloseTo((old.stayZ as number) + MOVE.z, 5);
    }
    const knights = await readState<{ id: string; mode: string; spot: { x: number; y: number; z: number } | null }[]>(page, 'knights');
    expect(knights).toHaveLength(2);
    for (const old of save.monsters.knights) {
      const now = knights.find((k) => k.id === old.id)!;
      expect(now.mode).toBe(old.mode);
      expect(now.spot).toEqual(step(old.spot!));
      // Inside the big world, not at the old small spot.
      expect(now.spot!.x).toBeGreaterThan(32);
      expect(now.spot!.x).toBeLessThan(96);
    }
    expect(await readState<number>(page, 'points')).toBe(save.economy.points);
  });

  test('AC238: a backup made by 0.6.0 restores moved, with no knights', async ({ page }) => {
    const save = save070();
    await restoreOnEmpty(page, backupV060());
    await expectMovedHut(page);
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(p.x).toBeCloseTo(save.player.x + MOVE.x, 0);
    expect(p.z).toBeCloseTo(save.player.z + MOVE.z, 0);
    expect(await readState<unknown[]>(page, 'knights')).toEqual([]);
    expect(await readState<number>(page, 'points')).toBe(save.economy.points);
  });

  test('AC238: a backup with terrain version 1 (no version) restores as in AC236: the villages are stamped', async ({ page }) => {
    await restoreOnEmpty(page, JSON.stringify(v050));
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
    const sites = await readState<Array<{ id: string; hasHouses: boolean }>>(page, 'villageSites');
    expect(sites.map((s) => [s.id, s.hasHouses])).toEqual([['noord', true], ['oost', true], ['west', true]]);
    expect((await worldRecord(page)).terrainVersion).toBe(3);
  });
});

test.describe('A backup made by 0.8.0 (AC238)', () => {
  test('AC238: format 3 with terrain version 3, Alles wissen, restore: the world record is byte for byte the same', async ({ page }) => {
    await stubShare(page);
    await openApp(page);
    await setupPin(page, '1234');
    const cell = fromLegacy(7, 25, 7);
    await readState(page, 'setBlock', cell.x, cell.y, cell.z, 3);
    await readState(page, 'setBlock', 5, 30, 120, 3);
    await readState(page, 'markWorldDirty');
    await readState(page, 'flushSave');
    const before = await worldRecord(page);
    expect(before.terrainVersion).toBe(3);
    expect(before.diff.length).toBeGreaterThanOrEqual(2);
    await openExport(page);
    await page.locator('[data-testid="backup-make"]').tap();
    await page.waitForFunction(() => window.__shared!.length > 0);
    const file = (await page.evaluate(() => window.__shared!))[0]!;
    const json = JSON.parse(file.text) as { format: number; kv: { world: { terrainVersion: number } } };
    expect(json.format).toBe(4);
    expect(json.kv.world.terrainVersion).toBe(3);

    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    for (const name of ['Alles wissen', 'Ja, ga verder', 'Ja, wis alles echt']) {
      const b = page.locator('.parent-settings button', { hasText: name }).first();
      await b.scrollIntoViewIfNeeded();
      // A mark on this page: gone once the page has really reloaded (WebKit can answer from the old page for a moment).
      if (name === 'Ja, wis alles echt') await page.evaluate(() => ((window as unknown as { __oldPage?: boolean }).__oldPage = true));
      await b.tap();
    }
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __oldPage?: boolean }).__oldPage === true).catch(() => true), { timeout: 20_000 })
      .toBe(false);
    await page.waitForFunction(() => (window as unknown as { __dino?: { ready?: () => boolean } }).__dino?.ready?.() === true);
    await setupPin(page, '4321');
    await openExport(page, '4321');
    await pickRestore(page, file.name, file.text);
    await page.locator('[data-testid="restore-yes"]').tap();
    await expect.poll(() => readState<number>(page, 'blockAt', cell.x, cell.y, cell.z).catch(() => -1)).toBe(3);
    await readState(page, 'simulateKill');
    expect(await worldRecord(page)).toEqual(before);
  });
});
