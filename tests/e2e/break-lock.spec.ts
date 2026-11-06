// Break lock, only to end the break (T55b, v3, decision 119, AC199).
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { loginAsParent, setupPin, typePin } from './helpers/gate';

const LOCK = '.screen-layer-learn [data-testid="parent-controls-btn"]';
const screen = (page: Page) => readState<string>(page, 'currentScreen');

/** Pauze nu starten through the parent area, like a parent would. */
async function startBreakFromParent(page: Page): Promise<void> {
  await loginAsParent(page);
  await page.getByRole('button', { name: 'Pauze nu starten' }).tap();
  await expect(page.locator('.break-screen')).toBeVisible();
  expect(await screen(page)).toBe('learn');
}

async function openLockGate(page: Page): Promise<void> {
  await page.locator(LOCK).tap();
  await page.locator('.parent-gate-key[data-key="1"]').waitFor();
}

test.describe('break lock (T55b, v3)', () => {
  test('AC199: the lock is 44 x 44, top right, inside the screen, on a Pauze nu starten break', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await startBreakFromParent(page);
    const lock = page.locator(LOCK);
    await expect(lock).toBeVisible();
    const box = (await lock.boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(view.width);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    expect(box.x).toBeGreaterThan(view.width / 2);
  });

  test('AC199: Terug naar de pauze shows the same break, and the pin pad Sluiten does too', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'startEarlyBreak');
    await expect(page.locator('.break-screen')).toBeVisible();
    const before = await readState<{ phase: string; index: number }>(page, 'breakState');

    await openLockGate(page);
    await page.locator('.parent-gate-key[data-key="Sluiten"]').tap();
    await expect(page.locator('.parent-gate')).toBeHidden();
    await expect(page.locator('.break-screen')).toBeVisible();

    // A second tap on the same lock within 350 ms is ignored (onTap repeat guard), so wait it out.
    await page.waitForTimeout(400);
    await openLockGate(page);
    await typePin(page, '1234');
    await expect(page.locator('[data-testid="break-end-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-shell"]')).toHaveCount(0);
    await page.locator('[data-testid="break-end-back"]').tap();
    await expect(page.locator('[data-testid="break-end-card"]')).toBeHidden();
    await expect(page.locator('.break-screen')).toBeVisible();
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(true);
    const after = await readState<{ phase: string; index: number }>(page, 'breakState');
    expect({ phase: after.phase, index: after.index }).toEqual({ phase: before.phase, index: before.index });
  });

  test('AC95, AC199: Pauze nu beëindigen through the lock ends the break, logs it and resumes play', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await startBreakFromParent(page);

    await openLockGate(page);
    await typePin(page, '1234');
    await page.locator('[data-testid="break-end-confirm"]').tap();
    await expect(page.locator('.break-screen')).toBeHidden();
    await expect.poll(() => screen(page)).toBe('world');
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(false);
    const breaks = await readState<Array<{ endedBy: string }>>(page, 'breaksLog');
    expect(breaks).toHaveLength(1);
    expect(breaks[0]!.endedBy).toBe('stopped');
    await expect(page.locator('[data-testid="parent-controls-btn"]')).toBeVisible();
  });

  test('AC199: three wrong codes block the pin pad and the break waits', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'startEarlyBreak');
    await expect(page.locator('.break-screen')).toBeVisible();
    await openLockGate(page);
    for (let i = 0; i < 3; i++) await typePin(page, '9999');
    await expect(page.locator('[data-testid="break-end-card"]')).toHaveCount(0);
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(true);
  });
});
