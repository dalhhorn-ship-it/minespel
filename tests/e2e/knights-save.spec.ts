// Knights in the save (V17a, AC209, AC226): the `monsters` record, restart, backup restore and Wereld opnieuw beginnen.
// The knights do not move yet in this task, so the test looks at where they are saved and placed.
import { expect, test, type Page } from '@playwright/test';
import v060 from '../fixtures/backups/v060-no-monsters.json' with { type: 'json' };
import v070 from '../fixtures/backups/v070-monsters.json' with { type: 'json' };
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

interface Knight { id: string; mode: string; x: number; y: number; z: number; spot: { x: number; y: number; z: number } | null }
interface Saved { knights: { id: string; mode: string; spot: { x: number; y: number; z: number } | null }[]; bubbleClockMs: number; hintShown: boolean }

const knights = (page: Page) => readState<Knight[]>(page, 'knights');
const near = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** Reads or writes one kv record straight from IndexedDB. */
function kvGet<T>(page: Page, name: string): Promise<T | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').get(key);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        };
      }),
    name,
  ) as Promise<T | undefined>;
}
function kvPut(page: Page, name: string, value: unknown): Promise<void> {
  return page.evaluate(
    ({ key, v }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          if (v === undefined) tx.objectStore('kv').delete(key);
          else tx.objectStore('kv').put(v, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, v: value },
  );
}

async function reopen(page: Page) {
  await page.reload();
  await openApp(page);
}

const nodeBuffer = (globalThis as unknown as { Buffer: { from: (s: string) => unknown } }).Buffer;

test.describe('Knights in the save (V17a)', () => {
  test('AC209: 2 knights added by hook, restart, same modes and the same spots', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'follow');
    await readState(page, 'addKnight', 'guard');
    const before = await knights(page);
    expect(before.map((k) => k.mode)).toEqual(['follow', 'guard']);
    await expect.poll(async () => (await kvGet<Saved>(page, 'monsters'))?.knights.length).toBe(2);
    await reopen(page);
    const after = await knights(page);
    expect(after.map((k) => [k.id, k.mode])).toEqual(before.map((k) => [k.id, k.mode]));
    // Only mode and spot are saved: the follower stands next to the kid, the guard at his spot.
    const kid = await readState<{ x: number; z: number }>(page, 'player');
    expect(near(after[0]!, kid)).toBeLessThanOrEqual(3);
    expect(after[1]!.spot).toEqual(before[1]!.spot);
    expect([after[1]!.x, after[1]!.z]).toEqual([before[1]!.spot!.x, before[1]!.spot!.z]);
  });

  test('AC209: Wereld opnieuw beginnen puts both knights within 3 blocks of the kid with their modes', async ({ page }) => {
    await openApp(page);
    await readState(page, 'addKnight', 'stay');
    await readState(page, 'addKnight', 'guard');
    const kid = await readState<{ x: number; y: number; z: number }>(page, 'player');
    // Send both far away in the save, then restart so they stand at their spots.
    const saved = (await kvGet<Saved>(page, 'monsters'))!;
    await kvPut(page, 'monsters', {
      ...saved,
      knights: saved.knights.map((k, i) => ({ ...k, spot: { x: kid.x + 14 + i, y: kid.y, z: kid.z + 10 } })),
    });
    await reopen(page);
    const far = await knights(page);
    for (const k of far) expect(near(k, kid)).toBeGreaterThan(8);
    await readState(page, 'resetWorld');
    const now = await knights(page);
    expect(now.map((k) => k.mode)).toEqual(['stay', 'guard']);
    const kidNow = await readState<{ x: number; z: number }>(page, 'player');
    for (const k of now) {
      expect(near(k, kidNow)).toBeLessThanOrEqual(3);
      expect(near(k.spot!, kidNow)).toBeLessThanOrEqual(3);
    }
    await expect.poll(async () => (await kvGet<Saved>(page, 'monsters'))?.knights.map((k) => near(k.spot!, kidNow) <= 3)).toEqual([true, true]);
  });

  test('AC209: a backup made with 2 knights restores them with their modes on an empty iPad', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await loginAsParent(page, '1234');
    await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
    await page.locator('.parent-import-export').waitFor();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('[data-testid="backup-restore"]').tap();
    await (await chooser).setFiles({ name: 'v070.json', mimeType: 'application/json', buffer: nodeBuffer.from(JSON.stringify(v070)) as never });
    await page.locator('[data-testid="restore-yes"]').tap();
    await expect.poll(() => knights(page).then((k) => k.map((x) => [x.id, x.mode])).catch(() => []), { timeout: 20_000 }).toEqual([['ridder-1', 'follow'], ['ridder-2', 'guard']]);
    const m = (await kvGet<Saved>(page, 'monsters'))!;
    expect([m.bubbleClockMs, m.hintShown]).toEqual([120_000, true]);
  });

  test('AC209 AC226: a backup from 0.6.0 restores with no knights and the bubble Uit', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await loginAsParent(page, '1234');
    await page.locator('.parent-nav-btn[data-section="import-export"]').tap();
    await page.locator('.parent-import-export').waitFor();
    const chooser = page.waitForEvent('filechooser');
    await page.locator('[data-testid="backup-restore"]').tap();
    await (await chooser).setFiles({ name: 'v060.json', mimeType: 'application/json', buffer: nodeBuffer.from(JSON.stringify(v060)) as never });
    await page.locator('[data-testid="restore-yes"]').tap();
    await expect.poll(() => readState<number>(page, 'points').catch(() => -1), { timeout: 20_000 }).toBe(12);
    await reopen(page); // the restore reloads the page by itself; this makes sure it is done
    expect(await readState<number>(page, 'points')).toBe(12);
    expect(await knights(page)).toEqual([]);
    const settings = (await kvGet<{ bubbleEnabled?: boolean; monstersEnabled?: boolean; knightsEnabled?: boolean }>(page, 'settings'))!;
    expect(settings.bubbleEnabled).toBe(false);
    expect(await kvGet<Saved>(page, 'monsters')).toEqual({ knights: [], bubbleClockMs: 0, hintShown: false });
  });

  test('AC226: a new install has the bubble Aan, a 0.6.0 save has it Uit and nothing else changed', async ({ page }) => {
    await openApp(page);
    expect(await knights(page)).toEqual([]);
    expect((await kvGet<{ bubbleEnabled?: boolean }>(page, 'settings'))?.bubbleEnabled).toBe(true);
    // Make this save look like 0.6.0: no monsters record, no bubble setting, a played world.
    await readState(page, 'setPoints', 42);
    await readState(page, 'flushSave');
    const settings = (await kvGet<Record<string, unknown>>(page, 'settings'))!;
    delete settings.bubbleEnabled;
    await kvPut(page, 'settings', settings);
    await kvPut(page, 'monsters', undefined);
    await reopen(page);
    expect(await knights(page)).toEqual([]);
    expect(await readState<number>(page, 'points')).toBe(42);
    expect((await kvGet<{ bubbleEnabled?: boolean }>(page, 'settings'))?.bubbleEnabled).toBe(false);
  });

  test('the game runs as before with no knight: the world keeps drawing and fastForward works', async ({ page }) => {
    await openApp(page);
    expect(await knights(page)).toEqual([]);
    expect(await readState<number>(page, 'fastForward', 2000)).toBe(2000);
    await readState(page, 'setCreatureSeed', 7);
    expect(await readState<boolean>(page, 'gameRunning')).toBe(true);
  });
});
