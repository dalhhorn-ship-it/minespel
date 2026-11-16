// The knight menu (V17d, AC203, AC206, AC337): a tap on a knight opens it in Hakken and in Bouwen, changes no block,
// keeps the mode after a reload, and is a kid overlay (the play timer stops).
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);

/** Flat stone ground with open air above, so no hill hides the knight from the tap. */
async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 10; x <= c + 10; x++)
        for (let z = c - 10; z <= c + 10; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

interface Knight { id: string; mode: string; x: number; y: number; z: number }

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

async function tapAt(page: Page, id: number, x: number, y: number) {
  await page.evaluate(
    ({ id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { id, x, y },
  );
}

async function tapSel(page: Page, selector: string, id: number) {
  await page.evaluate(
    ({ selector, id }) => {
      const b = document.querySelector(selector) as HTMLElement;
      const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { selector, id },
  );
}

async function blocksAround(page: Page, k: Knight): Promise<number[]> {
  const cells: [number, number, number][] = [];
  for (let dx = -3; dx <= 3; dx++)
    for (let dy = -2; dy <= 3; dy++)
      for (let dz = -3; dz <= 3; dz++) cells.push([Math.floor(k.x) + dx, Math.floor(k.y) + dy, Math.floor(k.z) + dz]);
  return page.evaluate(
    (list) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      return list.map(([x, y, z]) => h.blockAt!(x, y, z));
    },
    cells,
  );
}

/** Turns the player until the knight is on the right half of the screen, then returns where he is. */
async function aimAtKnight(page: Page, id: string): Promise<{ x: number; y: number }> {
  const vp = page.viewportSize()!;
  const kid = await readState<{ x: number; y: number; z: number }>(page, 'player');
  for (let i = 0; i < 48; i++) {
    await readState(page, 'placePlayer', kid.x, kid.y, kid.z, (i * Math.PI) / 24);
    const p = await readState<{ x: number; y: number } | null>(page, 'knightScreenPoint', id);
    if (p && p.x > vp.width * 0.55 && p.x < vp.width * 0.9 && p.y > vp.height * 0.15 && p.y < vp.height * 0.85) return p;
  }
  throw new Error('knight not on screen');
}

async function openMenuOn(page: Page, id: string) {
  await expect(async () => {
    const p = await aimAtKnight(page, id);
    await tapAt(page, 7, p.x, p.y);
    await expect(page.locator('.knight-menu-card')).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
}

test.describe('Knight menu (V17d)', () => {
  for (const mode of ['Hakken', 'Bouwen']) {
    test(`AC203: a tap in ${mode} opens the menu, no block changes, play timer stops`, async ({ page }) => {
      await openApp(page);
      await flatten(page);
      if (mode === 'Bouwen') await tapSel(page, '.hud-mode:nth-of-type(2)', 3);
      await expect(page.locator('.hud-mode[aria-pressed="true"]')).toHaveText(mode);
      const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
      const k = (await readState<Knight[]>(page, 'knights'))[0]!;
      const before = await blocksAround(page, k);
      await openMenuOn(page, id);
      expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll('.knight-menu-btn')].map((b) => {
          const r = b.getBoundingClientRect();
          return [b.textContent, Math.min(r.width, r.height)] as const;
        }),
      );
      expect(sizes.map((s) => s[0])).toEqual(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Jaag monsters weg', 'Uitrusten', 'Sluiten']);
      for (const [, size] of sizes) expect(size).toBeGreaterThanOrEqual(56);
      expect(await blocksAround(page, k)).toEqual(before);
      await tapSel(page, '.knight-menu-btn-close', 8);
      await expect(page.locator('.knight-menu-card')).toHaveCount(0);
      await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(true);
    });
  }

  test('AC203: the picked mode is kept after a reload', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const id = (await readState<string | null>(page, 'addKnight', 'follow'))!;
    await openMenuOn(page, id);
    await tapSel(page, '.knight-menu-btn[data-mode="guard"]', 9);
    await expect.poll(async () => (await readState<Knight[]>(page, 'knights'))[0]!.mode).toBe('guard');
    await expect(page.locator('.knight-menu-status')).toContainText('Hier zijn nog geen dieren.');
    await page.waitForTimeout(500);
    await page.reload();
    await openApp(page);
    expect((await readState<Knight[]>(page, 'knights'))[0]!.mode).toBe('guard');
  });

  for (const [big, lavakip] of [[false, false], [true, false], [false, true], [true, true]] as const) {
    test(`AC337: four mode buttons fit on screen with no overlap${big ? ' with Groter lettertype' : ''}${lavakip ? ' and Lavakip geven (AC316)' : ''}`, async ({ page }) => {
      await openApp(page);
      if (lavakip) {
        await kvPut(page, 'lavakip', { bought: true, spot: null, carried: 1 });
        await page.reload();
        await openApp(page);
      }
      await flatten(page);
      if (big) {
        await page.evaluate(() => {
          document.documentElement.style.setProperty('--font-scale', '1.25');
          document.documentElement.setAttribute('data-large-font', 'true');
        });
      }
      const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
      await openMenuOn(page, id);
      const vp = page.viewportSize()!;
      const rects = await page.evaluate(() =>
        [...document.querySelectorAll('.knight-menu-btn')].map((b) => {
          const r = b.getBoundingClientRect();
          return { text: b.textContent, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
      );
      expect(rects.slice(0, 4).map((r) => r.text)).toEqual(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Jaag monsters weg']);
      // The whole menu shows with no scrolling: all four modes, Uitrusten, Lavakip geven (while one is carried) and the way back.
      const labels = rects.map((r) => r.text);
      expect(labels).toEqual(
        expect.arrayContaining(['Volg mij', 'Blijf hier', 'Pas op de dieren', 'Jaag monsters weg', 'Uitrusten', 'Sluiten']),
      );
      expect(labels.includes('Lavakip geven'), 'Lavakip geven shows only with one carried').toBe(lavakip);
      const card = await page.evaluate(() => {
        const c = document.querySelector('.knight-menu-card') as HTMLElement;
        const r = c.getBoundingClientRect();
        return { scrollable: c.scrollHeight > c.clientHeight + 1, top: r.top, bottom: r.bottom };
      });
      expect(card.scrollable, 'the card needs no scrolling').toBe(false);
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.bottom).toBeLessThanOrEqual(vp.height);
      for (const r of rects) {
        // Each button lies inside the card, so it shows without a scroll.
        expect(r.y).toBeGreaterThanOrEqual(card.top);
        expect(r.y + r.h).toBeLessThanOrEqual(card.bottom);
        expect(Math.min(r.w, r.h), `${r.text} is at least 44 x 44`).toBeGreaterThanOrEqual(44);
      }
      for (const r of rects.slice(0, 4)) expect(Math.min(r.w, r.h), `${r.text} is at least 56 x 56 (AC203)`).toBeGreaterThanOrEqual(56);
      for (const r of rects) {
        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(56);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(vp.width);
        expect(r.y + r.h).toBeLessThanOrEqual(vp.height);
      }
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]!, b = rects[j]!;
          const apart = a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5;
          expect(apart, `${a.text} and ${b.text} overlap`).toBe(true);
        }
      }
    });
  }

  test('AC337: Jaag monsters weg is picked, says its status and is kept after a reload', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const id = (await readState<string | null>(page, 'addKnight', 'follow'))!;
    await openMenuOn(page, id);
    await tapSel(page, '.knight-menu-btn[data-mode="chase"]', 10);
    await expect.poll(async () => (await readState<Knight[]>(page, 'knights'))[0]!.mode).toBe('chase');
    await expect(page.locator('.knight-menu-status')).toHaveText('Ik jaag monsters weg!');
    await expect(page.locator('.knight-menu-btn[data-mode="chase"]')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(500);
    await page.reload();
    await openApp(page);
    expect((await readState<Knight[]>(page, 'knights'))[0]!.mode).toBe('chase');
  });

  test('AC316: Lavakip geven in the knight menu closes it and gives the snack, mode unchanged', async ({ page }) => {
    await openApp(page);
    await kvPut(page, 'lavakip', { bought: true, spot: null, carried: 1 });
    await page.reload();
    await openApp(page);
    await flatten(page);
    const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
    await openMenuOn(page, id);
    const box = (await page.locator('.knight-menu-btn-lavakip').boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(56);
    await tapSel(page, '.knight-menu-btn-lavakip', 12);
    await expect(page.locator('.knight-menu-card')).toHaveCount(0);
    await expect
      .poll(async () => (await readState<{ snacking: { kind: string; id: string }[] }>(page, 'feedState')).snacking)
      .toEqual([expect.objectContaining({ kind: 'knight', id })]);
    expect((await readState<Knight[]>(page, 'knights'))[0]!.mode).toBe('stay');
  });
});
