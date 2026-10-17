import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

// Set SHOTS_DIR to also save screenshots of the question, the teach moment and the summary.
const shotsDir = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png` });
};

const leftMs = (page: Page) => readState<number>(page, 'playMsLeft');
const timerReady = (page: Page) =>
  page.waitForFunction(() => (window as unknown as { __dino: Record<string, () => unknown> }).__dino.playMsLeft?.() != null);

/** A real finger tap in the middle of an element. */
async function tapOn(page: Page, selector: string, text?: RegExp) {
  const target = text ? page.locator(selector).filter({ hasText: text }).first() : page.locator(selector).first();
  await target.waitFor({ state: 'visible' });
  const box = await target.boundingBox();
  if (!box) throw new Error(`No box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function typeNumber(page: Page, text: string) {
  for (const ch of text.replace('.', ',')) await tapOn(page, '.kb-char', new RegExp(`^${ch}$`));
  await tapOn(page, '.kb-done');
}

interface Saved {
  state: { index: number; try: number; phase: string; entries: Array<{ item: { answer: string[]; prompt: string } }> };
}
const saved = async (page: Page): Promise<Saved> => {
  await readState(page, 'breakSaved');
  return (await readState<Saved | null>(page, 'savedSession')) as Saved;
};
const rightAnswer = async (page: Page): Promise<string> => {
  const s = await saved(page);
  return s.state.entries[s.state.index]?.item.answer[0] ?? '';
};

/** Opens the app with a controlled clock, runs the play timer down to 0 and hands real time back. */
async function breakOpens(page: Page): Promise<void> {
  await page.clock.install();
  await openApp(page);
  await timerReady(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await readState(page, 'pauseGame');
  const left = await leftMs(page);
  await page.clock.runFor(left + 1500);
  await page.clock.resume();
  await expect(page.locator('.break-screen')).toBeVisible();
}

async function skipLesson(page: Page) {
  await page.locator('.lesson-view').waitFor();
  for (let i = 0; i < 12 && (await page.locator('.lesson-view').count()) > 0; i++) {
    await tapOn(page, '.lesson-next');
    await page.waitForTimeout(400); // the double tap guard
  }
  await page.locator('.number-view').waitFor();
}

test.describe('learning break', () => {
  test('at 0 a break opens: lesson, 5 questions, a teach moment, summary, back with a full timer (AC26, AC28, AC29, AC30, AC34, AC36)', async ({ page }) => {
    await breakOpens(page);
    expect(await readState<string>(page, 'currentScreen')).toBe('learn');
    expect(await readState<boolean>(page, 'gameRunning')).toBe(false);
    await skipLesson(page);
    await expect(page.locator('.break-dot')).toHaveCount(5);
    await expect(page.locator('.break-screen')).not.toContainText(/\d:\d\d/); // no countdown (AC28)
    await shot(page, 'break-1');

    // Q1 right on the first try.
    await typeNumber(page, await rightAnswer(page));
    await expect(page.locator('.break-feedback')).toContainText('+2');
    await tapOn(page, '.break-button');
    // Q2 wrong twice: the teach moment shows the answer and costs a point.
    await typeNumber(page, '7777');
    await expect(page.locator('.break-retry')).toBeVisible();
    await typeNumber(page, '7777');
    await expect(page.locator('.teach-done')).toBeVisible();
    await expect(page.locator('.teach-answer')).toHaveText(/\d/);
    await shot(page, 'break-2');
    await tapOn(page, '.teach-done');
    // Q3 to Q5 right.
    for (let i = 0; i < 3; i++) {
      await expect(page.locator('.number-view')).toBeVisible();
      await typeNumber(page, await rightAnswer(page));
      await tapOn(page, '.break-button');
    }
    await expect(page.locator('.break-summary')).toContainText('4 van de 5 goed!');
    await shot(page, 'break-3');
    await expect(page.locator('.break-summary')).toContainText('Je hebt nu 7 punten');
    await tapOn(page, '.break-button');

    await expect(page.locator('.break-screen')).toHaveCount(0);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    expect(await readState<boolean>(page, 'breakActive')).toBe(false);
    expect(await readState<number>(page, 'playMsLeft')).toBeGreaterThan(295_000);
    await readState(page, 'resumeGame'); // the test paused the world itself to make time jumps quick
    await page.waitForFunction(() => (window as unknown as { __dino: Record<string, () => unknown> }).__dino.gameRunning?.() === true);
    expect(await readState<number>(page, 'points')).toBe(7);
    await readState(page, 'breakSaved');
    expect(await readState(page, 'logCounts')).toEqual({ answers: 6, breaks: 1, ledger: [2, -1, 2, 2, 2] });
    expect(await readState(page, 'savedSession')).toBeNull();
  });

  test('closing the app in the middle of a break brings back the same question and try (AC37)', async ({ page }) => {
    await breakOpens(page);
    await skipLesson(page);
    await typeNumber(page, await rightAnswer(page));
    await tapOn(page, '.break-button');
    await typeNumber(page, '7777'); // wrong once: question 2, try 2
    await expect(page.locator('.break-retry')).toBeVisible();
    const before = await saved(page);
    const prompt = before.state.entries[1]?.item.prompt ?? '';
    expect(before.state).toMatchObject({ index: 1, try: 2 });
    const pointsBefore = await readState<number>(page, 'points');
    const countsBefore = await readState(page, 'logCounts');
    expect(pointsBefore).toBe(2);

    const fresh = await killApp(page);
    await timerReady(fresh);
    await expect(fresh.locator('.break-retry')).toBeVisible();
    await expect(fresh.locator('.break-dot.done')).toHaveCount(1);
    await expect(fresh.locator('.lesson-view')).toHaveCount(0);
    expect(await readState<boolean>(fresh, 'breakActive')).toBe(true);
    expect((await saved(fresh)).state).toMatchObject({ index: 1, try: 2 });
    // The points and the logs survive the kill and the resume changes none of them.
    expect(await readState<number>(fresh, 'points')).toBe(pointsBefore);
    expect(await readState(fresh, 'logCounts')).toEqual(countsBefore);
    expect(prompt).not.toBe('');
    await expect(fresh.locator('.break-screen')).toContainText(prompt.replace(' = ?', '').replace(/\s*\?$/, ''));
    // And it plays on to the end.
    await typeNumber(fresh, (await saved(fresh)).state.entries[1]?.item.answer[0] ?? '');
    await expect(fresh.locator('.break-feedback')).toBeVisible();
  });
});
