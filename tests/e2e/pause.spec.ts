import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// Needs main.ts to call setupPauseMenu (see the T44 report).
const tapText = async (page: Page, text: string) => {
  const box = await page.getByRole('button', { name: text, exact: true }).boundingBox();
  if (!box) throw new Error(`No button ${text}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};
const screen = (page: Page) => readState<string>(page, 'currentScreen');
const player = (page: Page) => readState<{ x: number; y: number; z: number }>(page, 'player');

test.describe('pause menu', () => {
  test('Pauze opens the menu, the timer stops, Terug naar de wereld goes back (AC23)', async ({ page }) => {
    await openApp(page);
    await tapText(page, 'Pauze');
    await expect(page.locator('[data-screen-id="pause"]')).toBeVisible();
    expect(await screen(page)).toBe('kid-overlay');
    await expect(page.locator('[data-pause="points"]')).toHaveText(/^Je hebt \d+ punt/);
    expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
    expect(await readState<boolean>(page, 'gameRunning')).toBe(false);
    await tapText(page, 'Terug naar de wereld');
    expect(await screen(page)).toBe('world');
    await expect(page.locator('[data-screen-id="pause"]')).toHaveCount(0);
    await page.waitForFunction(() => (window as unknown as { __dino: Record<string, () => unknown> }).__dino.timerCounting?.() === true);
  });

  test('Ik zit vast puts the player at the start and leaves the world alone (AC106)', async ({ page }) => {
    await openApp(page);
    const start = await player(page);
    await readState(page, 'setBlock', Math.floor(start.x) + 3, 25, Math.floor(start.z), 3);
    await readState(page, 'placePlayer', start.x + 5, start.y, start.z + 5, 1);
    const before = await readState<number>(page, 'teleportedCount');
    await tapText(page, 'Pauze');
    await tapText(page, 'Ik zit vast');
    expect(await readState<number>(page, 'teleportedCount')).toBe(before + 1);
    expect(await screen(page)).toBe('world');
    const now = await player(page);
    expect(Math.abs(now.x - start.x)).toBeLessThan(0.5);
    expect(Math.abs(now.z - start.z)).toBeLessThan(0.5);
    expect(await readState<number>(page, 'blockAt', Math.floor(start.x) + 3, 25, Math.floor(start.z))).toBe(3);
  });

  for (const [name, kind, id, back] of [
    ['Dinowinkel', 'kid-overlay', 'shop', '[data-shop="back"]'],
    ['Lesboek', 'kid-overlay', 'lesboek', '[data-lesboek="back"]'],
    ['Extra oefenen', 'learn', 'practice', '[data-practice="stop"]'],
  ] as const) {
    test(`${name} opens on top of the menu, the timer stays stopped, and back returns to the menu`, async ({ page }) => {
      await openApp(page);
      await tapText(page, 'Pauze');
      await tapText(page, name);
      expect(await screen(page)).toBe(kind);
      await expect(page.locator(`[data-screen-id="${id}"]`)).toBeVisible();
      expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
      await page.locator(back).first().tap();
      await expect(page.locator('[data-screen-id="pause"]')).toBeVisible();
    });
  }
});
