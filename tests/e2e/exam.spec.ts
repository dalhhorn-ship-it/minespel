// Kid exam end to end (T51b, v2). Every test starts the exam with the `startExam` hook (no parent gate).
// The parent route through Examens is tests/e2e/exam-parent.spec.ts (T51d).
import { expect, test, type Page } from '@playwright/test';
import { DB_NAME } from '../../src/storage/schema';
import { killApp, openApp, readState } from './helpers/app';
import { setupPin } from './helpers/gate';

const TAAL = 'cito-taalverzorging';
const TAAL_EXAM = 'examen-m6';
const REKENEN = 'rekenen-basis';
const REKENEN_EXAM = 'rekentoets-m6';
const SEED = 4242;
const LOCK = '[data-testid="parent-controls-btn"]';
/** Any lock inside the screen layers (the world lock lives in the HUD, not in a layer). */
const LAYER_LOCK = `.screen-layers ${LOCK}`;

interface ExamState {
  phase: 'start' | 'questions' | 'end' | 'review';
  index: number;
  count: number;
  endReason: string | null;
  eggGiven: boolean;
  right: string | null;
  given: Array<string | null>;
}

const examState = (page: Page) => readState<ExamState | null>(page, 'examState');
const screen = (page: Page) => readState<string>(page, 'currentScreen');

async function startAndBegin(page: Page, moduleId = TAAL, examId = TAAL_EXAM): Promise<void> {
  await readState(page, 'startExam', moduleId, examId, SEED);
  await expect(page.locator('[data-testid="exam-begin"]')).toBeVisible();
  await page.locator('[data-testid="exam-begin"]').tap();
  await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
}

/** Answers the question on screen through the hook and waits until the screen moved on. */
async function hookAnswer(page: Page, right: boolean): Promise<void> {
  const before = (await examState(page))!;
  await readState(page, 'examAnswer', right);
  await expect
    .poll(async () => {
      const s = await examState(page);
      return s ? `${s.phase}:${s.index}` : 'gone';
    })
    .not.toBe(`${before.phase}:${before.index}`);
}

async function answerAll(page: Page, rights: boolean[]): Promise<void> {
  for (const r of rights) await hookAnswer(page, r);
}

async function savedExamMs(page: Page): Promise<number | null> {
  return page.evaluate(
    (name) =>
      new Promise<number | null>((resolve, reject) => {
        const open = indexedDB.open(name);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('kv', 'readonly').objectStore('kv').get('timers');
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { examMsLeft: number | null } | undefined)?.examMsLeft ?? null);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    DB_NAME,
  );
}

test.describe('kid exam (T51b, v2)', () => {
  test('AC64, AC65, AC66: 30 questions, no feedback, play timer stopped, no break', async ({ page }) => {
    await openApp(page);
    await readState(page, 'startExam', TAAL, TAAL_EXAM, SEED);
    await expect(page.getByText('Examen: 30 vragen, 30 minuten')).toBeVisible();
    // No lock on the start screen (AC156).
    await expect(page.locator(LAYER_LOCK)).toHaveCount(0);
    await page.locator('[data-testid="exam-begin"]').tap();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText('Vraag 1 van 30');
    expect((await examState(page))?.count).toBe(30);
    expect(await screen(page)).toBe('exam');

    const points = await readState<number>(page, 'points');
    const playBefore = await readState<number>(page, 'remainingPlayMs');
    await readState(page, 'advancePlayMs', 120_000);
    expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);
    expect(await readState<number>(page, 'remainingPlayMs')).toBe(playBefore);
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(false);

    // Answer one question through the real screen when it is a choice question, else through the hook.
    const option = page.locator('.q-option').first();
    if (await option.isVisible()) await option.tap();
    else await readState(page, 'examAnswer', true);
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText('Vraag 2 van 30');
    await expect(page.getByText(/Goed gedaan|Helaas|Fout!/)).toHaveCount(0);
    expect(await readState<number>(page, 'points')).toBe(points);
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(false);
  });

  test('AC68, AC69, AC111: a pass hatches a golden dino, also with 12 shop dinos, and is saved', async ({ page }) => {
    await openApp(page);
    // 12 shop dinos: the golden egg must still come (AC111).
    for (let i = 0; i < 12; i++) await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'stepDinos', 60);
    expect(await readState<unknown[]>(page, 'dinos')).toHaveLength(12);

    const points = await readState<number>(page, 'points');
    await startAndBegin(page);
    await answerAll(page, Array.from({ length: 30 }, (_, i) => i < 22));
    await expect(page.locator('[data-testid="exam-result"]')).toHaveText('Geslaagd!');
    await expect(page.locator('[data-testid="exam-score"]')).toHaveText('Je score: 22 van 30');
    // No lock on the end screen (AC156).
    await expect(page.locator(LAYER_LOCK)).toHaveCount(0);

    const log = await readState<Array<{ score: number; passed: boolean; status: string; questions: unknown[] }>>(
      page,
      'examsLog',
    );
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ score: 22, passed: true, status: 'done' });
    expect(log[0]?.questions).toHaveLength(30);

    await page.locator('[data-testid="exam-leave"]').tap();
    await expect.poll(() => screen(page)).toBe('world');
    expect(await readState<number>(page, 'remainingPlayMs')).toBe(5 * 60_000);
    expect(await readState<number>(page, 'points')).toBe(points);

    const eggs = await readState<Array<{ golden: boolean }>>(page, 'eggs');
    expect(eggs).toHaveLength(1);
    expect(eggs[0]?.golden).toBe(true);
    await readState(page, 'stepDinos', 60);
    const dinos = await readState<Array<{ golden: boolean }>>(page, 'dinos');
    expect(dinos).toHaveLength(13);
    expect(dinos.filter((d) => d.golden)).toHaveLength(1);

    // The Dinowinkel still blocks a 13th shop dino (12 shop dinos, golden does not count).
    await readState(page, 'setPoints', 200);
    const bought = await readState<boolean>(page, 'buyEggInShop', 'compy');
    expect(bought).toBe(false);
  });

  test('AC68: a fail shows Goed geoefend! and gives no egg', async ({ page }) => {
    await openApp(page);
    await startAndBegin(page);
    await answerAll(page, Array.from({ length: 30 }, (_, i) => i < 5));
    await expect(page.locator('[data-testid="exam-result"]')).toHaveText('Goed geoefend!');
    await expect(page.locator('[data-testid="exam-review-open"]')).toBeVisible();
    await page.locator('[data-testid="exam-leave"]').tap();
    await expect.poll(() => screen(page)).toBe('world');
    expect(await readState<unknown[]>(page, 'eggs')).toHaveLength(0);
    const log = await readState<Array<{ passed: boolean; score: number }>>(page, 'examsLog');
    expect(log[0]).toMatchObject({ passed: false, score: 5 });
  });

  test('AC67: time runs out, a typed answer is checked as given, the rest is wrong', async ({ page }) => {
    await openApp(page);
    await startAndBegin(page, REKENEN, REKENEN_EXAM);
    // Question 1 right through the hook, question 2 typed but Klaar not tapped.
    await hookAnswer(page, true);
    const state = (await examState(page))!;
    expect(state.right).not.toBeNull();
    for (const ch of state.right!) {
      await page.locator('.number-pad .kb-key', { hasText: new RegExp(`^${ch === '.' ? ',' : ch}$`) }).tap();
    }
    await readState(page, 'advanceExamMs', 20 * 60_000, true);
    await expect(page.locator('[data-testid="exam-result"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-score"]')).toHaveText('Je score: 2 van 20');
    const log = await readState<Array<{ questions: Array<{ correct: boolean; given: string }> }>>(page, 'examsLog');
    const qs = log[0]!.questions;
    expect(qs.slice(0, 2).every((x) => x.correct)).toBe(true);
    expect(qs.slice(2).every((x) => !x.correct && x.given === 'niet beantwoord')).toBe(true);
    expect(await readState<number | null>(page, 'remainingExamMs')).toBeNull();
  });

  test('AC71: closing the app on question 12 with 18:00 left continues there', async ({ page }) => {
    await openApp(page);
    await startAndBegin(page);
    await answerAll(page, Array.from({ length: 11 }, () => true));
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText('Vraag 12 van 30');
    await readState(page, 'advanceExamMs', 12 * 60_000, true);
    expect(await readState<number>(page, 'remainingExamMs')).toBe(18 * 60_000);
    await expect.poll(() => savedExamMs(page)).toBe(18 * 60_000);

    const fresh = await killApp(page);
    await expect(fresh.locator('[data-testid="exam-number"]')).toHaveText('Vraag 12 van 30');
    await expect
      .poll(async () => readState<number>(fresh, 'remainingExamMs'))
      .toBeGreaterThanOrEqual(18 * 60_000 - 5000);
    expect(await readState<number>(fresh, 'remainingExamMs')).toBeLessThanOrEqual(18 * 60_000);
    expect(await screen(fresh)).toBe('exam');
    expect(await readState<boolean>(fresh, 'isBreakActive')).toBe(false);
  });

  test('AC153: Bekijk je fouten, and a kill during the review reopens the end screen', async ({ page }) => {
    await openApp(page);
    await startAndBegin(page);
    // 26 right and 4 wrong: the review has 4 pages.
    await answerAll(page, Array.from({ length: 30 }, (_, i) => i < 26));
    await expect(page.locator('[data-testid="exam-result"]')).toHaveText('Geslaagd!');
    await page.locator('[data-testid="exam-review-open"]').tap();
    await expect(page.locator('.teach-heading', { hasText: 'Fout 1 van 4' })).toBeVisible();
    await expect(page.locator(LAYER_LOCK)).toHaveCount(0);
    await expect.poll(async () => (await examState(page))?.phase).toBe('review');

    const fresh = await killApp(page);
    await expect(fresh.locator('[data-testid="exam-result"]')).toHaveText('Geslaagd!');
    await expect(fresh.locator('[data-testid="exam-review-open"]')).toBeVisible();
    // The egg was given once, not again after the resume.
    expect(await readState<unknown[]>(fresh, 'eggs')).toHaveLength(1);
    expect(await readState<unknown[]>(fresh, 'examsLog')).toHaveLength(1);
  });

  test('AC155, AC127, AC158: the lock is 44 x 44 inside the screen, opens the pin pad, Sluiten keeps the exam', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await startAndBegin(page);
    const lock = page.locator(`.screen-layer-exam ${LOCK}`);
    await expect(lock).toBeVisible();
    const box = (await lock.boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(view.width);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    // Top right corner.
    expect(box.x).toBeGreaterThan(view.width / 2);

    const before = (await examState(page))!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.parent-gate')).toBeVisible();
    await expect(page.locator('.parent-gate-key[data-key="Sluiten"]')).toBeVisible();

    // AC112: the gate is open, so the exam timer does not count.
    const left = await readState<number>(page, 'remainingExamMs');
    await readState(page, 'advanceExamMs', 5000);
    expect(await readState<number>(page, 'remainingExamMs')).toBe(left);

    await page.locator('.parent-gate-key[data-key="Sluiten"]').tap();
    await expect(page.locator('.parent-gate')).toBeHidden();
    const after = (await examState(page))!;
    expect(after.index).toBe(before.index);
    expect(after.phase).toBe('questions');
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(`Vraag ${before.index + 1} van 30`);
    expect(await screen(page)).toBe('exam');
  });

  test('AC112: the exam timer does not count in portrait', async ({ page }) => {
    await openApp(page);
    await startAndBegin(page);
    const left = await readState<number>(page, 'remainingExamMs');
    const view = page.viewportSize()!;
    await page.setViewportSize({ width: Math.min(view.width, view.height), height: Math.max(view.width, view.height) });
    await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(false);
    await readState(page, 'advanceExamMs', 5000);
    expect(await readState<number>(page, 'remainingExamMs')).toBe(left);
    await page.setViewportSize(view);
  });

  test('AC156: no lock on a break, a lesson or Extra oefenen, the world keeps its lock', async ({ page }) => {
    await openApp(page);
    await expect(page.locator(LOCK).first()).toBeVisible();
    await readState(page, 'startBreakNow');
    await expect(page.locator('.break-screen')).toBeVisible();
    await expect(page.locator(LAYER_LOCK)).toHaveCount(0);
    await readState(page, 'endBreakByParent');
    await expect.poll(() => screen(page)).toBe('world');
    await readState(page, 'openPractice');
    await expect(page.getByRole('dialog', { name: 'Extra oefenen' })).toBeVisible();
    await expect(page.locator(LAYER_LOCK)).toHaveCount(0);
  });
});
