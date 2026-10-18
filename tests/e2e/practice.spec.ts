import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// Set SHOTS_DIR to also save screenshots of the Lesboek and of a practice round.
const shotsDir = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png` });
};

/** A real finger tap in the middle of an element. */
async function tapOn(page: Page, selector: string, text?: RegExp) {
  const target = text ? page.locator(selector).filter({ hasText: text }).first() : page.locator(selector).first();
  await target.waitFor({ state: 'visible' });
  const box = await target.boundingBox();
  if (!box) throw new Error(`No box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}
const tapText = async (page: Page, name: string) => {
  const box = await page.getByRole('button', { name, exact: true }).boundingBox();
  if (!box) throw new Error(`No button ${name}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
};

interface Round {
  index: number;
  phase: string;
  entries: Array<{ item: { answer: string[] } }>;
  economy: { points: number };
}
const round = (page: Page) => readState<Round>(page, 'practiceState');

async function typeNumber(page: Page, text: string) {
  for (const ch of text.replace('.', ',')) await tapOn(page, '.kb-char', new RegExp(`^${ch}$`));
  await tapOn(page, '.kb-done');
}
async function skipLesson(page: Page) {
  await page.locator('.lesson-view, .number-view').first().waitFor();
  for (let i = 0; i < 12 && (await page.locator('.lesson-view').count()) > 0; i++) {
    await tapOn(page, '.lesson-next');
    await page.waitForTimeout(400); // the double tap guard
  }
  await page.locator('.number-view').waitFor();
}
async function openPractice(page: Page) {
  await tapText(page, 'Pauze');
  await tapText(page, 'Extra oefenen');
  await tapOn(page, '[data-practice-module="rekenen-basis"]');
}
async function answerRight(page: Page) {
  await expect(page.locator('.number-view')).toBeVisible();
  const r = await round(page);
  await typeNumber(page, r.entries[r.index]?.item.answer[0] ?? '');
  await expect(page.locator('.break-feedback')).toBeVisible();
}

test.describe('Lesboek and Extra oefenen', () => {
  test('Lesboek lists the lessons, opens one page by page and writes nothing (AC51)', async ({ page }) => {
    await openApp(page);
    await tapText(page, 'Pauze');
    await tapText(page, 'Lesboek');
    expect(await readState<string>(page, 'currentScreen')).toBe('kid-overlay');
    expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
    await expect(page.locator('.lesboek-module')).toHaveCount(2);
    await expect(page.locator('[data-lesboek-topic="rekenen-basis/optellen"]')).toBeVisible();
    await shot(page, 'lesboek');
    const before = await page.locator('[data-pause="points"]').textContent();
    await tapOn(page, '[data-lesboek-topic="rekenen-basis/optellen"]');
    await expect(page.locator('.lesson-view')).toBeVisible();
    for (let i = 0; i < 12 && (await page.locator('.lesson-next').textContent()) !== 'Ik snap het!'; i++) {
      await tapOn(page, '.lesson-next');
      await page.waitForTimeout(400);
    }
    await tapOn(page, '.lesson-next');
    await expect(page.locator('.lesboek-list')).toBeVisible();
    await tapOn(page, '[data-lesboek="back"]');
    await expect(page.locator('[data-screen-id="pause"]')).toBeVisible();
    expect(await page.locator('[data-pause="points"]').textContent()).toBe(before);
  });

  test('Extra oefenen: 5 questions, points shown after, the cap message, the timer stays stopped (AC52, AC120)', async ({ page }) => {
    await openApp(page);
    // The play timer loads its saved time after the boot; read it once it has one.
    await expect.poll(() => readState<number | null>(page, 'playMsLeft')).toBeGreaterThan(0);
    const timerBefore = await readState<number>(page, 'playMsLeft');
    await openPractice(page);
    expect(await readState<string>(page, 'currentScreen')).toBe('learn');
    expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
    await skipLesson(page);
    await expect(page.locator('.break-dot')).toHaveCount(5);
    await shot(page, 'practice');
    for (let i = 0; i < 5; i++) {
      await answerRight(page);
      if (i === 0) await expect(page.locator('.break-feedback')).toContainText('+2');
      await tapOn(page, '.break-button');
    }
    await expect(page.locator('.break-summary')).toContainText('5 van de 5 goed!');
    await expect(page.locator('.break-summary')).not.toContainText('Bonus');
    await tapOn(page, '.break-button');
    // Back on the pause menu with the new total: 10 points, the day cap (AC120).
    await expect(page.locator('[data-screen-id="pause"]')).toBeVisible();
    // The pause menu shows before the practice screen's async close has popped it off the stack.
    await expect.poll(() => readState<string>(page, 'currentScreen')).toBe('kid-overlay');
    await expect(page.locator('[data-pause="points"]')).toHaveText('Je hebt 10 punten');
    // A second round earns nothing more and says so.
    await tapText(page, 'Extra oefenen');
    await tapOn(page, '[data-practice-module="rekenen-basis"]');
    await page.locator('.lesson-view, .number-view').first().waitFor();
    if ((await page.locator('.lesson-view').count()) > 0) await skipLesson(page);
    await answerRight(page);
    await expect(page.locator('.break-feedback')).toContainText('Genoeg geoefend voor vandaag, ga lekker bouwen!');
    await expect(page.locator('.feedback-text')).not.toContainText('+');
    await tapOn(page, '[data-practice="stop"]');
    await expect(page.locator('[data-pause="points"]')).toHaveText('Je hebt 10 punten');
    // The play timer did not move and the world is still paused behind the menu.
    expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
    expect(Math.abs((await readState<number>(page, 'playMsLeft')) - timerBefore)).toBeLessThan(3000);
    await tapText(page, 'Terug naar de wereld');
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
  });
});
