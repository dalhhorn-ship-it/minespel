// The warnings and the wake of the Monstermol (V16a, AC244, AC245).
import { expect, test, type Page } from '@playwright/test';
import { WAARSCHUWSTEEN } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';

interface Mole {
  phase: 'none' | 'rumble' | 'out' | 'leaving';
  loopMs: number;
  began: { rumble: number | null; out: number | null; leaving: number | null };
}
const mole = (page: Page) => readState<Mole>(page, 'moleState');

async function column(page: Page) {
  const pose = await readState<{ x: number; z: number }>(page, 'player');
  return { x: Math.floor(pose.x) + 4, z: Math.floor(pose.z) };
}

async function prepare(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'resetPlayTimer', 600);
}

type Box = { x: number; y: number; width: number; height: number };
const apart = (a: Box, b: Box) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

async function modeButtons(page: Page): Promise<Box[]> {
  const boxes: Box[] = [];
  for (const b of await page.locator('.hud-mode').all()) boxes.push((await b.boundingBox()) as Box);
  return boxes;
}

test.describe('Monstermol warnings and wake (V16a)', () => {
  test('AC244: a dig at y 6 shows the toast, clear of Hakken and Bouwen, and a second dig shows none', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 6, c.z)).toBe(true);
    const line = page.locator('.speech-line');
    await expect(line).toHaveText('Pas op! Diep onder de grond woont de Monstermol.');
    const at = (await line.boundingBox()) as Box;
    for (const b of await modeButtons(page)) expect(apart(at, b)).toBe(true);
    await expect(line).toBeHidden({ timeout: 10_000 });
    expect(await readState(page, 'mineAt', c.x, 7, c.z)).toBe(true);
    await page.waitForTimeout(400);
    await expect(line).toBeHidden();
    expect((await mole(page)).phase).toBe('none');
  });

  test('AC244: a Waarschuwsteen shows the card every time, OK is 56 points, the play timer waits for OK', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    for (let round = 0; round < 2; round++) {
      expect(await readState(page, 'blockAt', c.x, 5, c.z)).toBe(round === 0 ? WAARSCHUWSTEEN : 0);
      if (round === 1) await readState(page, 'setBlock', c.x, 5, c.z, WAARSCHUWSTEEN, 1);
      expect(await readState(page, 'mineAt', c.x, 5, c.z)).toBe(true);
      const card = page.locator('[data-testid="mole-card"]');
      await expect(card).toBeVisible();
      await expect(page.locator('[data-testid="mole-text"]')).toHaveText('Niet verder graven! Onder de streep slaapt de Monstermol.');
      expect(await readState(page, 'isPlayRunning')).toBe(false);
      const ok = (await page.locator('[data-testid="mole-ok"]').boundingBox()) as Box;
      expect(ok.width).toBeGreaterThanOrEqual(56);
      expect(ok.height).toBeGreaterThanOrEqual(56);
      const box = (await card.boundingBox()) as Box;
      for (const b of await modeButtons(page)) expect(apart(box, b)).toBe(true);
      await page.locator('[data-testid="mole-ok"]').tap();
      await expect(card).toBeHidden();
      expect(await readState(page, 'isPlayRunning')).toBe(true);
    }
    expect((await mole(page)).phase).toBe('none');
  });

  test('AC245: a dig at y 3 rumbles and the mole comes no sooner than 3 seconds later, then no second one', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 3, c.z)).toBe(true);
    await expect(page.locator('.speech-line')).toHaveText('Oei... de grond rommelt!');
    expect((await mole(page)).phase).toBe('rumble');
    await readState(page, 'fastForward', 1500);
    expect((await mole(page)).phase).toBe('rumble');
    await readState(page, 'fastForward', 2000);
    const m = await mole(page);
    expect(m.phase).toBe('out');
    expect((m.began.out ?? 0) - (m.began.rumble ?? 0)).toBeGreaterThanOrEqual(3000);
    expect(await readState(page, 'mineAt', c.x, 2, c.z)).toBe(true);
    expect((await mole(page)).began.rumble).toBe(m.began.rumble);
  });

  test('AC245: a dig at y 5 (the stripes) gives no rumble', async ({ page }) => {
    await prepare(page);
    const c = await column(page);
    expect(await readState(page, 'mineAt', c.x, 5, c.z)).toBe(true);
    await page.locator('[data-testid="mole-ok"]').tap();
    expect((await mole(page)).phase).toBe('none');
  });
});
