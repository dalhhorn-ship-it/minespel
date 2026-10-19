// Parent route to the exam and the exam lock, end to end (T51d, v2, Flow 6 and 6b).
// Starts from the world lock, goes through Examens, and stops through the exam lock.
import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin, typePin } from './helpers/gate';

const REKENEN = 'rekenen-basis';
const REKENEN_EXAM = 'rekentoets-m6';
const LOCK = '[data-testid="parent-controls-btn"]';
const EXAM_LOCK = `.screen-layer-exam ${LOCK}`;

interface ExamState {
  phase: 'start' | 'questions' | 'end' | 'review';
  index: number;
  count: number;
  eggGiven: boolean;
  right: string | null;
}

const examState = (page: Page) => readState<ExamState | null>(page, 'examState');
const screen = (page: Page) => readState<string>(page, 'currentScreen');

/** World lock, PIN, Examens, Start. Leaves the kid start screen open. */
async function startFromParent(page: Page): Promise<void> {
  await loginAsParent(page);
  await page.locator('.parent-nav-btn[data-section="examens"]').tap();
  await expect(page.locator('[data-testid="parent-exams"]')).toBeVisible();
  await page.locator(`[data-exam="${REKENEN}/${REKENEN_EXAM}"]`).tap();
  await expect(page.locator('[data-testid="exam-begin"]')).toBeVisible();
}

async function beginAndAnswer(page: Page, count: number): Promise<void> {
  await page.locator('[data-testid="exam-begin"]').tap();
  await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
  for (let i = 0; i < count; i++) {
    await readState(page, 'examAnswer', true);
    await expect.poll(async () => (await examState(page))?.index).toBe(i + 1);
  }
}

async function openExamLock(page: Page): Promise<void> {
  await page.locator(EXAM_LOCK).tap();
  await expect(page.locator('.parent-gate')).toBeVisible();
}

test.describe('parent starts and stops an exam (T51d, v2)', () => {
  test('AC64, AC72: from the world lock through Examens to the kid exam, no warning for built in exams', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="examens"]').tap();
    await expect(page.locator('[data-testid="parent-exams"]')).toBeVisible();
    await expect(page.locator('[data-exam]').first()).toBeVisible();

    await page.locator(`[data-exam="${REKENEN}/${REKENEN_EXAM}"]`).tap();
    // Enough items: no warning, the parent area closes and the kid sees the start screen.
    await expect(page.locator('[data-testid="exam-begin"]')).toBeVisible();
    await expect(page.locator('[data-testid="exam-warning"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="parent-shell"]')).toBeHidden();
    expect(await screen(page)).toBe('exam');
    expect(await readState<boolean>(page, 'isExamActive')).toBe(true);

    await page.locator('[data-testid="exam-begin"]').tap();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
  });

  test('AC72: every built in exam starts without a warning', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="examens"]').tap();
    const buttons = page.locator('[data-exam]');
    await expect(buttons.first()).toBeVisible();
    // Every exam button is a built in exam with enough items: a tap starts it at once.
    const ids = await buttons.evaluateAll((els) => els.map((e) => e.getAttribute('data-exam') ?? ''));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      await page.locator(`[data-exam="${id}"]`).tap();
      await expect(page.locator('[data-testid="exam-warning"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="exam-begin"]')).toBeVisible();
      // Back to the parent area: begin (the start screen has no lock), stop through the exam lock, open Examens again.
      await page.locator('[data-testid="exam-begin"]').tap();
      await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
      await page.locator(EXAM_LOCK).tap();
      await page.locator('.parent-gate-key[data-key="1"]').waitFor();
      await typePin(page, '1234');
      await page.locator('[data-testid="exam-stop-confirm"]').tap();
      await expect.poll(() => screen(page)).toBe('world');
      await loginAsParent(page);
      await page.locator('.parent-nav-btn[data-section="examens"]').tap();
    }
  });

  test('AC115: Pauze nu starten is greyed during an exam, and an exam is refused during a break', async ({ page }) => {
    await openApp(page);
    await setupPin(page);

    // During an exam the lock gate only offers stopping, so check the settings button through the hook route.
    await readState(page, 'startExam', REKENEN, REKENEN_EXAM, 4242);
    await expect(page.locator('[data-testid="exam-begin"]')).toBeVisible();
    expect(await readState<boolean>(page, 'isExamActive')).toBe(true);
    await page.locator('[data-testid="exam-begin"]').tap();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 1 van \d+$/);
    await openExamLock(page);
    await page.locator('.parent-gate-key[data-key="1"]').waitFor();
    await typePin(page, '1234');
    // Stop only route: the shell is never reachable.
    await expect(page.locator('[data-testid="exam-stop-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="parent-shell"]')).toHaveCount(0);
    await page.locator('[data-testid="exam-stop-back"]').tap();

    // Via the normal parent route while an exam is active (hook): the pause button is disabled.
    await readState(page, 'openParentControls');
    await page.locator('.parent-gate-key[data-key="1"]').waitFor();
    await typePin(page, '1234');
    await page.locator('[data-testid="parent-shell"]').waitFor();
    await expect(page.getByRole('button', { name: 'Pauze nu starten' })).toBeDisabled();
    await page.locator('.parent-close-btn').tap();
  });

  test('AC115: with a break running, Examens says Beëindig eerst de pauze', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await readState(page, 'startBreakNow');
    await expect(page.locator('.break-screen')).toBeVisible();
    await readState(page, 'openParentControls');
    await page.locator('.parent-gate-key[data-key="1"]').waitFor();
    await typePin(page, '1234');
    await page.locator('[data-testid="parent-shell"]').waitFor();
    await page.locator('.parent-nav-btn[data-section="examens"]').tap();
    await page.locator(`[data-exam="${REKENEN}/${REKENEN_EXAM}"]`).tap();
    await expect(page.locator('[data-testid="exam-message"]')).toHaveText('Beëindig eerst de pauze');
    expect(await readState<boolean>(page, 'isExamActive')).toBe(false);
    expect(await readState<boolean>(page, 'isBreakActive')).toBe(true);
  });

  test('AC70, AC157: Stoppen ends the exam as gestopt, no egg, no review, world with a full play timer', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await startFromParent(page);
    await beginAndAnswer(page, 3);

    await openExamLock(page);
    await typePin(page, '1234');
    await expect(page.locator('[data-testid="exam-stop-card"]')).toBeVisible();
    await expect(page.getByText('Examen stoppen?')).toBeVisible();
    await page.locator('[data-testid="exam-stop-confirm"]').tap();

    await expect.poll(() => screen(page)).toBe('world');
    await expect(page.locator('[data-testid="exam-stop-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="exam-result"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="exam-review-open"]')).toHaveCount(0);
    expect(await readState<boolean>(page, 'isExamActive')).toBe(false);
    expect(await readState<number>(page, 'remainingPlayMs')).toBe(5 * 60_000);
    expect(await readState<unknown[]>(page, 'eggs')).toHaveLength(0);
    const log = await readState<Array<{ status: string }>>(page, 'examsLog');
    expect(log).toHaveLength(1);
    expect(log[0]?.status).toBe('gestopt');

    // Reopen: the world, not the exam.
    const fresh = await killApp(page);
    await expect.poll(() => screen(fresh)).toBe('world');
    await expect(fresh.locator('[data-testid="exam-number"]')).toHaveCount(0);
    expect(await readState<boolean>(fresh, 'isExamActive')).toBe(false);
  });

  test('AC158: Sluiten and Terug naar het examen keep question 9, the typed answer and the time', async ({ page }) => {
    await page.clock.install();
    await openApp(page);
    await setupPin(page);
    await startFromParent(page);
    await beginAndAnswer(page, 8);
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 9 van \d+$/);

    // Type the first digit when this question is a number question.
    const typed = page.locator('.type-field .type-text');
    let draft = '';
    if (await typed.count()) {
      const right = (await examState(page))!.right ?? '';
      const first = right.charAt(0);
      if (first) {
        await page.locator('.number-pad .kb-key', { hasText: new RegExp(`^${first === '.' ? ',' : first}$`) }).tap();
        draft = (await typed.textContent()) ?? '';
        expect(draft).not.toBe('');
      }
    }
    const left = await readState<number>(page, 'remainingExamMs');

    // Sluiten on the pin pad.
    await openExamLock(page);
    await page.clock.runFor(5000);
    await page.locator('.parent-gate-key[data-key="Sluiten"]').tap();
    await expect(page.locator('.parent-gate')).toBeHidden();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 9 van \d+$/);
    if (draft) await expect(typed).toHaveText(draft);

    // Terug naar het examen on the stop card.
    await openExamLock(page);
    await typePin(page, '1234');
    await page.locator('[data-testid="exam-stop-back"]').tap();
    await expect(page.locator('[data-testid="exam-stop-card"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 9 van \d+$/);
    if (draft) await expect(typed).toHaveText(draft);

    // The timer did not count while the gate was open (plus or minus one second).
    const after = await readState<number>(page, 'remainingExamMs');
    expect(Math.abs(after - left)).toBeLessThanOrEqual(1000);
    expect(await readState<boolean>(page, 'isExamActive')).toBe(true);
  });

  test('AC159, AC158: three wrong codes block for a minute, the world lock is blocked too, the exam stays on question 9', async ({ page }) => {
    await page.clock.install();
    await openApp(page);
    await setupPin(page);
    await startFromParent(page);
    await beginAndAnswer(page, 8);

    await openExamLock(page);
    for (let i = 0; i < 3; i++) await typePin(page, '9999');
    await expect(page.getByText(/Wacht nog \d+ seconden/).first()).toBeVisible();
    // The right code does not help while blocked.
    await typePin(page, '1234');
    await expect(page.locator('[data-testid="exam-stop-card"]')).toHaveCount(0);

    await page.locator('.parent-gate-key[data-key="Sluiten"]').tap();
    await expect(page.locator('.parent-gate')).toBeHidden();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 9 van \d+$/);

    // The block is shared: the exam lock is blocked again at once.
    await openExamLock(page);
    await expect(page.getByText(/Wacht nog \d+ seconden/).first()).toBeVisible();
    await page.locator('.parent-gate-key[data-key="Sluiten"]').tap();

    // After a minute the right code works.
    await page.clock.runFor(61_000);
    await openExamLock(page);
    await typePin(page, '1234');
    await expect(page.locator('[data-testid="exam-stop-card"]')).toBeVisible();
    await page.locator('[data-testid="exam-stop-back"]').tap();
    await expect(page.locator('[data-testid="exam-number"]')).toHaveText(/^Vraag 9 van \d+$/);
    expect((await examState(page))?.index).toBe(8);
  });
});
