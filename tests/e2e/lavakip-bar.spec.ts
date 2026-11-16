// The Lavakip-bar in the world: the truck, the tap, the order card and the Klodder rule (V23b, AC312 to AC314).
// The bar comes from a seeded `lavakip` record. The cases that buy or place (Bestel, Zet hier neer) need the economy
// of V23a; they wait for it.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);
/** The truck stands ahead of the kid and a little to his right (right is -x at yaw 0). */
const SPOT = { x: C - 3, y: 10, z: C + 6 };
type Spot = { x: number; y: number; z: number };

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

async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 12; x <= c + 12; x++)
        for (let z = c - 12; z <= c + 12; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

/** Opens the app with a bought bar at `spot`, a flat arena and the kid in the middle. */
async function prepare(page: Page, spot: Spot = SPOT, carried = 0, inView = true) {
  await openApp(page);
  await kvPut(page, 'lavakip', { bought: true, spot, carried });
  await page.reload();
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await flatten(page);
  if (inView) await expect.poll(() => readState(page, 'lavakipBarScreenPoint')).not.toBeNull();
}

async function worldTap(page: Page, at: { x: number; y: number }) {
  await page.evaluate(
    ({ x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    at,
  );
}

async function hudTap(page: Page, text: string) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll<HTMLElement>('.hud-mode')].find((n) => n.textContent === t)!;
    const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: 9, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
    fire('pointerdown');
    fire('pointerup');
  }, text);
}

async function ring(page: Page, spot: Spot, pad: number): Promise<number[]> {
  return page.evaluate(
    ({ s, pad }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      const out: number[] = [];
      for (let x = s.x - pad; x < s.x + 2 + pad; x++)
        for (let z = s.z - pad; z < s.z + 3 + pad; z++) for (let y = s.y - 3; y <= s.y + 3; y++) out.push(h.blockAt!(x, y, z)!);
      return out;
    },
    { s: spot, pad },
  );
}

/** Sets the points and lets the app read them again (the shop closing does that), as after a break. */
async function setPoints(page: Page, n: number) {
  await readState(page, 'setPoints', n);
  await readState(page, 'openShop');
  await page.locator('.shop-close-btn').tap();
  await expect(page.locator('.shop-close-btn')).toBeHidden();
}

const screenPoint = (page: Page) => readState<{ x: number; y: number } | null>(page, 'lavakipBarScreenPoint');
const card = (page: Page) => page.locator('[data-testid="lavakip-card"]');

test.describe('Lavakip-bar in the world (V23b)', () => {
  test('AC313: a tap on the truck 6 blocks away opens the card in Hakken and in Bouwen and changes no block', async ({ page }) => {
    await prepare(page);
    const vp = page.viewportSize()!;
    const before = await ring(page, SPOT, 3);
    for (const mode of ['Hakken', 'Bouwen']) {
      await hudTap(page, mode);
      const at = (await screenPoint(page))!;
      expect(at.x).toBeGreaterThan(vp.width / 2);
      await worldTap(page, at);
      await expect(card(page)).toBeVisible();
      expect(await readState(page, 'isPlayRunning')).toBe(false);
      await page.locator('[data-testid="lavakip-done"]').tap();
      await expect(card(page)).toBeHidden();
      expect(await ring(page, SPOT, 3)).toEqual(before);
    }
  });

  test('AC313: a tap anywhere on the truck opens the card, in the left part, the middle and the right part of the screen', async ({ page }) => {
    const vp = page.viewportSize()!;
    // Right is -x at yaw 0, so a bigger x puts the truck to the left of the middle.
    const cases: { name: string; spot: Spot; side: (x: number) => boolean }[] = [
      { name: 'left', spot: { x: C + 3, y: 10, z: C + 6 }, side: (x) => x < vp.width / 2 - 20 },
      { name: 'middle', spot: { x: C - 1, y: 10, z: C + 6 }, side: (x) => Math.abs(x - vp.width / 2) < 60 },
      { name: 'right', spot: { x: C - 4, y: 10, z: C + 6 }, side: (x) => x > vp.width / 2 + 20 },
    ];
    for (const c of cases) {
      await prepare(page, c.spot);
      const at = (await screenPoint(page))!;
      expect(c.side(at.x), `${c.name} truck at x ${at.x}`).toBe(true);
      await worldTap(page, at);
      await expect(card(page), c.name).toBeVisible();
      await page.locator('[data-testid="lavakip-done"]').tap();
      await expect(card(page)).toBeHidden();
    }
  });

  test('AC313: a truck 20 blocks away does not open on a tap', async ({ page }) => {
    await prepare(page, { x: C - 3, y: 10, z: C + 20 });
    await worldTap(page, (await screenPoint(page))!);
    await expect(card(page)).toHaveCount(0);
    expect(await readState(page, 'isPlayRunning')).toBe(true);
  });

  test('AC313: the kid walks through the truck, and mining the ground under it leaves it standing', async ({ page }) => {
    await prepare(page);
    await readState(page, 'placePlayer', SPOT.x + 1, SPOT.y, SPOT.z + 1.5, 0);
    await readState(page, 'fastForward', 1000);
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(Math.abs(p.x - (SPOT.x + 1))).toBeLessThan(0.2);
    expect(Math.abs(p.z - (SPOT.z + 1.5))).toBeLessThan(0.2);
    await readState(page, 'placePlayer', C + 0.5, 10, C + 0.5, 0);
    expect(await readState(page, 'mineAt', SPOT.x, 9, SPOT.z + 1)).toBe(true);
    expect(await readState(page, 'blockAt', SPOT.x, 9, SPOT.z + 1)).toBe(0);
    await expect.poll(() => readState(page, 'lavakipBarScreenPoint')).not.toBeNull();
    expect((await readState<{ spot: Spot }>(page, 'lavakipState')).spot).toEqual(SPOT);
  });

  test('AC313: Klodder out for 3 minutes nibbles no cell under the truck or within 1 block of it', async ({ page }) => {
    await prepare(page);
    const before = await ring(page, SPOT, 1);
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    let ms = 0;
    while (ms < 180_000) {
      const done = await readState<number>(page, 'fastForward', 30_000);
      if (done === 0) break;
      ms += done;
    }
    expect(ms).toBe(180_000);
    expect(await ring(page, SPOT, 1)).toEqual(before);
  });

  test('AC314: the card shows its texts with the right sizes at 7 points', async ({ page }) => {
    await prepare(page);
    await setPoints(page, 7);
    await worldTap(page, (await screenPoint(page))!);
    await expect(card(page)).toBeVisible();
    await expect(page.locator('.lavakip-title')).toHaveText('Lavakip-bar');
    await expect(page.locator('[data-testid="lavakip-price"]')).toHaveText('Een lavakip kost 3 punten.');
    await expect(page.locator('[data-testid="lavakip-count"]')).toHaveText('Je hebt 0 lavakippen');
    await expect(page.locator('[data-testid="lavakip-hint"]')).toHaveText('Tik op een dino, kip of ridder om hem te geven.');
    const order = (await page.locator('[data-testid="lavakip-order"]').boundingBox())!;
    expect(order.width).toBeGreaterThanOrEqual(56);
    expect(order.height).toBeGreaterThanOrEqual(56);
    const done = (await page.locator('[data-testid="lavakip-done"]').boundingBox())!;
    expect(done.width).toBeGreaterThanOrEqual(44);
    expect(done.height).toBeGreaterThanOrEqual(44);
    await page.locator('[data-testid="lavakip-done"]').tap();
    await expect(card(page)).toBeHidden();
  });

  // The cases below need the economy of V23a (order, placeHere).
  test('AC314: Bestel buys one at a time: 7 points, 4, then 1 and greyed', async ({ page }) => {
    await prepare(page);
    await setPoints(page, 7);
    await worldTap(page, (await screenPoint(page))!);
    await expect(card(page)).toBeVisible();
    const order = page.locator('[data-testid="lavakip-order"]');
    await order.tap();
    await expect(page.locator('[data-testid="lavakip-count"]')).toHaveText('Je hebt 1 lavakip');
    await expect(page.locator('[data-testid="lavakip-note"]')).toHaveText('Alsjeblieft, een warme lavakip!');
    expect(await readState(page, 'points')).toBe(4);
    const log = await readState<{ reason: string; delta?: number; amount?: number }[]>(page, 'ledgerLog');
    expect(log.filter((r) => r.reason === 'lavakip')).toHaveLength(1);
    await order.tap();
    await expect(page.locator('[data-testid="lavakip-note"]')).toHaveText('Nog 2 punten nodig');
    expect(await readState(page, 'points')).toBe(1);
  });

  test('AC314: 20 fast taps at 30 points buy at most 10 and never take more points than they cost', async ({ page }) => {
    await prepare(page);
    await setPoints(page, 30);
    await worldTap(page, (await screenPoint(page))!);
    const order = page.locator('[data-testid="lavakip-order"]');
    await expect(order).toBeVisible();
    for (let i = 0; i < 20; i++) await order.dispatchEvent('pointerdown', { pointerId: i + 1 }).then(() => order.dispatchEvent('pointerup', { pointerId: i + 1 }));
    await expect(page.locator('[data-testid="lavakip-note"]')).not.toHaveText('');
    const s = await readState<{ carried: number }>(page, 'lavakipState');
    expect(s.carried).toBeGreaterThan(0);
    expect(s.carried).toBeLessThanOrEqual(10);
    expect(await readState(page, 'points')).toBe(30 - 3 * s.carried);
  });

  test('AC312: Zet hier neer moves the bar 2 to 5 blocks in front of the kid and costs nothing', async ({ page }) => {
    await prepare(page, { x: C - 3, y: 10, z: C - 10 }, 0, false);
    await readState(page, 'setPoints', 5);
    expect(await readState(page, 'placeLavakipBarHere')).toBe(true);
    const s = (await readState<{ spot: Spot }>(page, 'lavakipState')).spot;
    const p = await readState<{ x: number; z: number }>(page, 'player');
    const d = Math.hypot(s.x + 1 - p.x, s.z + 1.5 - p.z);
    expect(d).toBeGreaterThanOrEqual(1.5);
    expect(d).toBeLessThanOrEqual(6.5);
    expect(await readState(page, 'points')).toBe(5);
  });
});
