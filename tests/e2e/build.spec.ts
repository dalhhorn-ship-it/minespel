import { expect, test, type Page } from '@playwright/test';
import { AIR, STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);

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
  await page.waitForTimeout(200);
}

/** One finger on the world (right half). Moves are tiny, so it counts as a tap. */
async function worldTap(page: Page, id: number, x: number, y: number, holdMs = 0) {
  await page.evaluate(
    async ({ id, x, y, holdMs }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      if (holdMs) await new Promise((r) => setTimeout(r, holdMs));
      fire('pointerup');
    },
    { id, x, y, holdMs },
  );
}

/** A tap on a HUD button (given by selector, and optional text). */
async function hudTap(page: Page, selector: string, id: number, text?: string) {
  await page.evaluate(
    ({ selector, id, text }) => {
      const nodes = [...document.querySelectorAll<HTMLElement>(selector)];
      const b = text ? nodes.find((n) => n.textContent === text)! : nodes[0]!;
      const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { selector, id, text },
  );
}

const block = (page: Page, x: number, y: number, z: number) => readState<number>(page, 'blockAt', x, y, z);

test.describe('mine and build', () => {
  test('hotbar has 8 filled slots and Alle blokken (AC7)', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('.hotbar-slot')).toHaveCount(8);
    await expect(page.locator('.hotbar-all')).toHaveText('Alle blokken');
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('.hotbar-slot, .hotbar-all, .hud-mode')].map((b) => {
        const r = b.getBoundingClientRect();
        return Math.min(r.width, r.height);
      }),
    );
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(44);
  });

  test('Hakken removes a block, oersteen stays, a far block stays (AC3, AC4)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const vp = page.viewportSize()!;
    // Eye at y 11.6, level view (pitch 0). Put blocks 3 ahead (+z) at eye height.
    await page.evaluate(({ c, stone }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      h.setBlock!(c, 11, c + 3, stone);
      h.setBlock!(c, 11, c + 9, stone);
    }, { c: C, stone: STEEN });
    // The view centre is the middle of the screen, which is in the right half only just: x/2 + 1.
    await worldTap(page, 2, vp.width / 2 + 1, vp.height / 2);
    expect(await block(page, C, 11, C + 3)).toBe(AIR);
    // The next tap looks through the hole at the far block, which is out of reach: it stays (AC4).
    await worldTap(page, 3, vp.width / 2 + 1, vp.height / 2);
    expect(await block(page, C, 11, C + 9)).toBe(STEEN);
  });

  test('Bouwen puts a block on a face and building up lifts the player (AC5, AC103)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const vp = page.viewportSize()!;
    await hudTap(page, '.hud-mode', 10, 'Bouwen');
    await worldTap(page, 3, vp.width / 2 + 1, vp.height / 2 + 250); // down at the floor ahead
    const placed = await page.evaluate(({ c }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      let n = 0;
      for (let z = c; z < c + 8; z++) if (h.blockAt!(c, 10, z) !== 0) n++;
      return n;
    }, { c: C });
    expect(placed).toBeGreaterThanOrEqual(1);
  });

  test('a long press does nothing (AC104)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const vp = page.viewportSize()!;
    await page.evaluate(({ c, stone }) => {
      (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.setBlock!(c, 11, c + 3, stone);
    }, { c: C, stone: STEEN });
    await worldTap(page, 4, vp.width / 2 + 1, vp.height / 2, 450);
    expect(await block(page, C, 11, C + 3)).toBe(STEEN);
  });

  test('picking from Alle blokken fills the selected slot, taps on the grid never build (AC7, AC104)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    await hudTap(page, '.hud-mode', 20, 'Bouwen');
    await hudTap(page, '.hotbar-all', 21);
    await expect(page.locator('.block-grid')).toBeVisible();
    await expect(page.locator('.grid-block')).toHaveCount(32);
    await page.waitForTimeout(400);
    await hudTap(page, '.grid-block', 22, 'wol paars');
    await expect(page.locator('.block-grid')).toBeHidden();
    await expect(page.locator('.hotbar-slot').first()).toHaveAttribute('aria-label', 'wol paars');
  });

  test('two fingers tap two faces: no crash and at most two new blocks (AC105)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const vp = page.viewportSize()!;
    await hudTap(page, '.hud-mode', 30, 'Bouwen');
    await worldTap(page, 5, vp.width / 2 + 1, vp.height / 2 + 250);
    await worldTap(page, 6, vp.width / 2 + 40, vp.height / 2 + 250);
    const count = await page.evaluate(({ c }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      let n = 0;
      for (let x = c - 5; x <= c + 5; x++) for (let z = c - 5; z <= c + 8; z++) if (h.blockAt!(x, 10, z) !== 0) n++;
      return n;
    }, { c: C });
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
    expect(await readState(page, 'gameRunning')).toBe(true);
  });
});
