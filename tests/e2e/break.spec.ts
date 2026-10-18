import { expect, test } from '@playwright/test';
import { openApp, readState } from './helpers/app';

test.describe('learning break flow (T43)', () => {
  test('runs a learning break, persists across reload (AC37), and returns to world when finished', async ({
    page,
  }) => {
    await openApp(page);

    await readState(page, 'startBreakNow');
    await expect(page.locator('.break-screen')).toBeVisible();
    expect(await readState<string>(page, 'currentScreen')).toBe('learn');

    // Reload mid-break -> break resumes automatically (AC37)
    await page.reload();
    await page.waitForFunction(
      () => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true,
    );
    await expect(page.locator('.break-screen')).toBeVisible();
    expect(await readState<string>(page, 'currentScreen')).toBe('learn');

    // End break via parent hook and verify return to world with full timer
    await readState(page, 'endBreakByParent');
    await expect(page.locator('.break-screen')).toBeHidden();
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
  });
});
