// Parent gate helpers shared by the e2e specs (T51d).
import { expect, type Page } from '@playwright/test';
import { answerGateQuestion, readState } from './app';

/** Taps the digits of a PIN on the open pin pad. */
export async function typePin(page: Page, pin: string): Promise<void> {
  for (const d of pin) await page.locator(`.parent-gate-key[data-key="${d}"]`).tap();
}

/** First start: answer the grown up sum and choose the PIN twice. Leaves the parent shell open. */
export async function openShellFirstTime(page: Page, pin = '1234'): Promise<void> {
  await readState(page, 'openParentControls');
  await page.locator('.parent-gate').waitFor();
  await answerGateQuestion(page);
  await page.locator('.parent-gate-key[data-key="1"]').waitFor();
  await typePin(page, pin);
  await typePin(page, pin);
  await page.locator('[data-testid="parent-shell"]').waitFor();
}

/** First start: choose the PIN, then close the parent area again. */
export async function setupPin(page: Page, pin = '1234'): Promise<void> {
  await openShellFirstTime(page, pin);
  await page.locator('.parent-close-btn').tap();
  await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
}

/** Taps the world lock and types the PIN. Leaves the parent shell open. */
export async function loginAsParent(page: Page, pin = '1234'): Promise<void> {
  await page.locator('[data-testid="parent-controls-btn"]').first().tap();
  await page.locator('.parent-gate-key[data-key="1"]').waitFor();
  await typePin(page, pin);
  await page.locator('[data-testid="parent-shell"]').waitFor();
}
