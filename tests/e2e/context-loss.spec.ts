import { expect, test, type Page } from '@playwright/test';
import { AARDE } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';

// AC109: after the WebGL context is lost the world shows again within 3 seconds, with the same state.
// Needs real WebGL. Without it the unit tests in src/render/renderer.test.ts cover the lifecycle,
// and AC109 is checked by hand on the iPad (T64).

interface Pose { x: number; y: number; z: number }

/**
 * True when the canvas shows more than one flat colour (not a black or empty screen).
 * Reads a screenshot, because a WebGL canvas without preserveDrawingBuffer cannot be read back reliably.
 */
async function canvasHasPicture(page: Page): Promise<boolean> {
  const png = await page.locator('canvas.world-canvas').screenshot();
  return page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const probe = document.createElement('canvas');
    probe.width = 32;
    probe.height = 32;
    const ctx = probe.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(bmp, 0, 0, 32, 32);
    const d = ctx.getImageData(0, 0, 32, 32).data;
    const seen = new Set<string>();
    for (let i = 0; i < d.length; i += 4) seen.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return seen.size > 1;
  }, png.toString('base64'));
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  test.skip(!(await readState<boolean>(page, 'usesRealRenderer')), 'No WebGL here: see the unit tests and T64.');
});

test('the world comes back after the context is restored by the browser', async ({ page }) => {
  await readState(page, 'placePlayer', 40, 30, 40, 1);
  await readState(page, 'setBlock', 40, 20, 42, AARDE);
  const before = await readState<Pose>(page, 'player');
  expect(await readState(page, 'loseWebGl')).toBe(true);
  await page.waitForTimeout(200); // the browser must see the loss event first
  await readState(page, 'restoreWebGl');
  await expect.poll(() => readState<boolean>(page, 'webGlLost'), { timeout: 3000 }).toBe(false);
  await expect.poll(() => canvasHasPicture(page), { timeout: 3000 }).toBe(true);
  expect(await readState<number>(page, 'canvasGeneration')).toBe(0);
  expect(await readState<number>(page, 'blockAt', 40, 20, 42)).toBe(AARDE);
  const after = await readState<Pose>(page, 'player');
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
  expect(Math.abs(after.z - before.z)).toBeLessThan(0.5);
});

test('with no restore a new canvas takes over within 3 seconds', async ({ page }) => {
  await readState(page, 'setBlock', 41, 20, 41, AARDE);
  const before = await readState<Pose>(page, 'player');
  expect(await readState(page, 'loseWebGl')).toBe(true);
  await expect.poll(() => readState<number>(page, 'canvasGeneration'), { timeout: 3000 }).toBe(1);
  await expect.poll(() => readState<boolean>(page, 'webGlLost')).toBe(false);
  await expect.poll(() => canvasHasPicture(page), { timeout: 3000 }).toBe(true);
  expect(await page.locator('canvas.world-canvas').count()).toBe(1);
  expect(await readState<number>(page, 'blockAt', 41, 20, 41)).toBe(AARDE);
  const after = await readState<Pose>(page, 'player');
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
  expect(Math.abs(after.z - before.z)).toBeLessThan(0.5);
});
