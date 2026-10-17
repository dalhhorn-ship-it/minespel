import { expect, test } from '@playwright/test';
import { openApp, readState } from './helpers/app';

test.describe('lesboek, extra oefenen, and countdown override (T46, AC51, AC52, AC120)', () => {
  test('opens Lesboek lessons, opens Extra oefenen, and overrides countdown via HUD Nu oefenen button', async ({
    page,
  }) => {
    await openApp(page);

    // HUD countdown pill has "Nu oefenen 🪙" button to override countdown
    const nowBtn = page.locator('[data-testid="countdown-start-now"]');
    await expect(nowBtn).toBeVisible();

    // Open Pause Menu -> Lesboek (AC51)
    await readState(page, 'openPauseMenu');
    await page.getByRole('button', { name: 'Lesboek' }).click();
    await expect(page.getByRole('dialog', { name: 'Lesboek' })).toBeVisible();
    const firstTopic = page.locator('[data-topic-id]').first();
    await expect(firstTopic).toBeVisible();
    await firstTopic.click();
    await expect(page.getByRole('button', { name: 'Terug naar Lesboek' })).toBeVisible();
    await page.getByRole('button', { name: 'Terug naar Lesboek' }).click();
    await page.getByRole('button', { name: 'Sluiten' }).click();

    // Open Extra oefenen (AC52)
    await readState(page, 'openPractice');
    await expect(page.getByRole('dialog', { name: 'Extra oefenen' })).toBeVisible();
    await page.getByRole('button', { name: 'Terug naar de wereld' }).click();

    // Click "Nu oefenen 🪙" on HUD countdown to immediately start exercises
    await nowBtn.click();
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(true);
  });
});
