// The seams of v22, v23 and v24 (V22a, decision 144): every new hook exists and gives its empty shape, the bubble slot is
// empty, the shop shows the Lavakip-bar card (V23a), and the fourth knight mode is saved. No visible change from 0.12.0.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Knight { id: string; mode: string; spot: { x: number; y: number; z: number } | null }

function kvPut(page: Page, name: string, value: unknown): Promise<void> {
  return page.evaluate(
    ({ key, v }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, v: value },
  );
}

test.describe('Seams of v22 to v24 (V22a)', () => {
  test('every new hook exists and returns its empty shape', async ({ page }) => {
    await openApp(page);
    const hooks = await page.evaluate(() => Object.keys((window as unknown as { __dino: object }).__dino));
    for (const name of [
      'bubbleHud', 'toastLog', 'sendMoleAway', 'tapMole', 'guardState', 'lavakipState', 'placeLavakipBarHere',
      'lavakipBarScreenPoint', 'orderLavakip', 'buyLavakipBarInShop', 'feedLavakip', 'feedState', 'nearSounds',
    ]) expect(hooks, name).toContain(name);

    expect(await readState(page, 'bubbleHud')).toEqual({ shown: false, kind: 'clock', text: '', angle: 0, distance: 0, vertical: null });
    expect(await readState(page, 'toastLog')).toEqual([]);
    expect(await readState(page, 'sendMoleAway', 5000)).toBe(false);
    expect(await readState(page, 'tapMole', 0)).toBe(false);
    expect(await readState(page, 'guardState')).toEqual([]);
    expect(await readState(page, 'lavakipState')).toEqual({ bought: false, spot: null, carried: 0 });
    expect(await readState(page, 'placeLavakipBarHere')).toBe(false);
    expect(await readState(page, 'lavakipBarScreenPoint')).toBeNull();
    expect(await readState(page, 'orderLavakip')).toBe(false);
    expect(await readState(page, 'buyLavakipBarInShop')).toBe(false);
    expect(await readState(page, 'feedLavakip', 'dino', 'nobody')).toBe(false);
    expect(await readState(page, 'feedState')).toEqual({ snacking: [], fed: 0 });
    expect(await readState(page, 'nearSounds')).toEqual({ running: true, sources: [] });
    expect(await readState(page, 'moleState')).toMatchObject({ phase: 'none', moles: [] });
  });

  test('the bubble slot is there under the top bar and empty, and takes no look', async ({ page }) => {
    await openApp(page);
    const slot = page.locator('[data-testid="hud-bubble-slot"]');
    await expect(slot).toHaveCount(1);
    expect(await slot.evaluate((n) => n.childElementCount)).toBe(0);
    // A pill never shows without V22e: no node with the pill text anywhere.
    await expect(page.getByText(/Bubbel over|Bubbel komt zo/)).toHaveCount(0);
  });

  test('AC310: the shop shows the Lavakip-bar card, and with 0 points the buy does nothing', async ({ page }) => {
    await openApp(page);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-points"]')).not.toHaveText(/…/);
    await expect(page.locator('[data-testid="shop-lavakip"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="shop-lavakip"]').getByText('Lavakip')).not.toHaveCount(0);
    expect(await readState(page, 'buyLavakipBarInShop')).toBe(false);
    expect(await readState(page, 'lavakipState')).toEqual({ bought: false, spot: null, carried: 0 });
  });

  test('AC337: a chase knight is added, saved and kept after a restart', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    const id = await readState<string | null>(page, 'addKnight', 'chase');
    expect(id).not.toBeNull();
    expect((await readState<Knight[]>(page, 'knights')).map((k) => k.mode)).toEqual(['chase']);
    await page.reload();
    await openApp(page);
    expect((await readState<Knight[]>(page, 'knights')).map((k) => k.mode)).toEqual(['chase']);
  });

  test('a 0.12.0 save keeps every knight mode and has no moles or lavakip record', async ({ page }) => {
    await openApp(page);
    const spot = { x: 70.5, y: 12, z: 100.5 };
    await kvPut(page, 'monsters', {
      knights: [
        { id: 'a', mode: 'follow', spot: null, boughtFor: 30 },
        { id: 'b', mode: 'stay', spot, boughtFor: 30 },
        { id: 'c', mode: 'guard', spot, boughtFor: 30 },
      ],
      bubbleClockMs: 1000,
      hintShown: true,
    });
    await page.reload();
    await openApp(page);
    expect((await readState<Knight[]>(page, 'knights')).map((k) => k.mode)).toEqual(['follow', 'stay', 'guard']);
    expect(await readState(page, 'lavakipState')).toEqual({ bought: false, spot: null, carried: 0 });
    expect(await readState(page, 'moleState')).toMatchObject({ phase: 'none', moles: [] });
  });
});
