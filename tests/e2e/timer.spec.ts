import { expect, test } from '@playwright/test';
import { openApp, readState } from './helpers/app';

test.describe('play countdown & timer matrix (T41)', () => {
  test('displays "Leerpauze over M:SS" in the HUD, pulses at <= 30s, pauses on menus, and triggers break at 0:00 (AC22..AC26)', async ({
    page,
  }) => {
    await openApp(page);

    const countdown = page.locator('[data-testid="hud-countdown"]');
    await expect(countdown).toBeVisible();
    await expect(countdown).toContainText('Leerpauze over 5:00');

    // Set remaining play time to 25s -> warning class becomes active
    await readState(page, 'setPlayRemainingMs', 25_000);
    // The clock keeps running while we look, so allow a few seconds of drift below 0:25.
    await expect(countdown).toContainText(/Leerpauze over 0:(2[0-5]|1\d)/);
    await expect(countdown).toHaveClass(/countdown-warning/);

    // Open pause menu -> play timer stops running
    await page.evaluate(() => {
      const b = document.querySelector('.hud-pause') as HTMLElement;
      b.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
      b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    });
    // The pause menu opens async (it reads the points first), so poll.
    await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(false);

    // Return to world and advance countdown to 0 -> break starts
    await page.evaluate(() => {
      const resumeBtn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent === 'Terug naar de wereld',
      )!;
      resumeBtn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, clientX: 5, clientY: 5, bubbles: true }));
      resumeBtn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2, clientX: 5, clientY: 5, bubbles: true }));
    });

    await readState(page, 'advancePlayMs', 25_000, true);
    await expect(page.locator('.break-screen')).toBeVisible();
  });
});
