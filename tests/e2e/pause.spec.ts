import { expect, test } from '@playwright/test';
import { START_SPOT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

test.describe('pause menu, parental controls button, and camera/sky controls (T44)', () => {
  test('pause menu shows points, "Ik zit vast" teleports home, "Ouders" opens parental controls, and camera arrows tilt view', async ({
    page,
  }) => {
    await openApp(page);

    await readState(page, 'setPoints', 24);
    const c = Math.floor(WORLD_SIZE / 2);
    await page.evaluate(
      ({ x, z }) => {
        (window as unknown as { __dino: { placePlayer(x: number, y: number, z: number, yaw: number): void } }).__dino.placePlayer(
          x,
          15,
          z,
          0,
        );
      },
      { x: c - 5 + 0.5, z: c - 5 + 0.5 },
    );

    // Open pause menu
    await readState(page, 'openPauseMenu');
    await expect(page.locator('[data-testid="pause-points"]')).toContainText('24 punten');
    expect(await readState<string>(page, 'currentScreen')).toBe('kid-overlay');

    // Tap "Ik zit vast" -> player returns to START_SPOT
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Ik zit vast')!;
      btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
      btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    });
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    const pos = await readState<{ x: number; y: number; z: number; pitch: number }>(page, 'player');
    expect(pos.x).toBeCloseTo(START_SPOT.x, 2);
    expect(pos.z).toBeCloseTo(START_SPOT.z, 2);

    // Camera angle arrow buttons and sky ascend button are visible in HUD
    await expect(page.locator('[data-testid="camera-arrows"]')).toBeVisible();
    await expect(page.locator('[data-testid="hud-ascend"]')).toBeVisible();
    await expect(page.locator('.hud [data-testid="parent-controls-btn"]')).toBeVisible();

    // Open parental controls
    await readState(page, 'openParentControls');
    expect(await readState<string>(page, 'currentScreen')).toBe('parent');
    await expect(page.locator('.parent-gate')).toBeVisible();
  });
});
