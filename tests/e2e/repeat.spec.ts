import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

// Release v25 Nog een keer (0.16.0): a question that ended in a teach moment comes back after the last normal
// question of a break or of Extra oefenen. AC338 to AC348 played with real finger taps on Rekenen sums
// (the number pad), so the right and wrong answers are known from the screen.
// The villager card is in village-repeat.spec.ts.

interface Fs {
  existsSync(p: string): boolean;
  readFileSync(p: string, enc: string): string;
  readdirSync(p: string, o: { withFileTypes: true }): Array<{ name: string; isDirectory(): boolean }>;
}
const fs = (globalThis as unknown as { process: { getBuiltinModule(n: string): unknown } }).process.getBuiltinModule('node:fs') as Fs;

interface RepeatShape {
  phase: string;
  index: number;
  try: number;
  repeatPart: boolean;
  repeatLine: string[];
  repeatCounts: Record<string, number>;
  entries: Array<{ item: { id: string } }>;
  economy: { points: number };
}
interface AnswerRow {
  itemId: string;
  try: number;
  repeat?: number;
  context: string;
  given: string;
  correct: boolean;
}

const breakState = (page: Page) => readState<RepeatShape | null>(page, 'breakState');
const practiceState = (page: Page) => readState<RepeatShape | null>(page, 'practiceState');

async function solveShownSum(page: Page): Promise<number> {
  const prompt = await page.locator('.q-prompt').innerText();
  const m = prompt.match(/^(.+?)\s([+\-−×:])\s(.+?)\s=\s\?$/);
  if (!m) throw new Error(`cannot read the sum "${prompt}"`);
  const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
  const a = num(m[1] as string);
  const b = num(m[3] as string);
  switch (m[2]) {
    case '+':
      return a + b;
    case '×':
      return a * b;
    case ':':
      return a / b;
    default:
      return a - b;
  }
}

/** Types a number on the pad without sending it. */
async function typeDigits(page: Page, n: number): Promise<void> {
  for (const ch of String(n).replace('.', ',')) {
    await page.locator('.number-pad .kb-char', { hasText: new RegExp(`^${ch}$`) }).tap();
  }
}

async function answerOnce(page: Page, wantRight: boolean): Promise<void> {
  await page.locator('.number-pad').waitFor();
  const right = await solveShownSum(page);
  await typeDigits(page, wantRight ? right : right + 1);
  await page.locator('.number-pad .kb-done').tap();
}

async function skipLessonIfShown(page: Page): Promise<void> {
  await page.locator('.q-view, .lesson-view').first().waitFor();
  for (let i = 0; i < 12 && (await page.locator('.q-view').count()) === 0; i++) {
    const before = await page.locator('.lesson-body').innerText();
    await expect
      .poll(
        async () => {
          if ((await page.locator('.q-view').count()) > 0) return true;
          if ((await page.locator('.lesson-body').innerText().catch(() => before)) !== before) return true;
          await page.locator('.lesson-next').tap({ timeout: 1000, force: true }).catch(() => undefined);
          return false;
        },
        { intervals: [500], timeout: 10_000 },
      )
      .toBe(true);
  }
  await page.locator('.q-view').waitFor();
}

async function onlyRekenen(page: Page): Promise<void> {
  const others = [
    ...new Set(
      fs
        .readdirSync('docs/modules', { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(`docs/modules/${d.name}/module.json`))
        .map((d) => String((JSON.parse(fs.readFileSync(`docs/modules/${d.name}/module.json`, 'utf8')) as { subject?: string }).subject ?? '').toLowerCase())
        .filter((id) => id && id !== 'rekenen'),
    ),
  ];
  await page.evaluate(
    (others) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          const get = store.get('switches');
          get.onsuccess = () => {
            const cur = (get.result ?? { modules: {} }) as { modules?: unknown; subjects?: Record<string, boolean> };
            const subjects: Record<string, boolean> = { ...(cur.subjects ?? {}) };
            for (const id of others) subjects[id] = false;
            subjects.rekenen = true;
            store.put({ ...cur, modules: cur.modules ?? {}, subjects }, 'switches');
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    others,
  );
}

async function setSettings(page: Page, patch: Record<string, unknown>): Promise<void> {
  await page.evaluate(
    (p) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          const get = store.get('settings');
          get.onsuccess = () => store.put({ ...((get.result ?? {}) as object), ...p }, 'settings');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    patch,
  );
}

async function startTimedBreak(page: Page, early = false): Promise<void> {
  await onlyRekenen(page);
  await readState(page, early ? 'startEarlyBreak' : 'startBreakNow');
  await page.locator('.break-screen').waitFor();
  await skipLessonIfShown(page);
}

async function startPractice(page: Page): Promise<void> {
  await readState(page, 'openPractice');
  await page.locator('[data-practice-topic$=":optellen"]').tap();
  await page.locator('.break-screen').waitFor();
  await page.locator('.q-view').waitFor();
}

type How = 'right' | 'retry' | 'teach';

/** One normal question, ending as asked. Leaves the screen on the next question or the first repeat. */
async function playNormal(page: Page, how: How): Promise<void> {
  await answerOnce(page, how === 'right');
  if (how === 'right') {
    await page.locator('.break-banner-right').waitFor();
    await page.locator('.break-next-btn').tap();
    return;
  }
  await page.locator('.break-banner-wrong').waitFor();
  await answerOnce(page, how === 'retry');
  if (how === 'retry') {
    await page.locator('.break-banner-right').waitFor();
    await page.locator('.break-next-btn').tap();
    return;
  }
  await page.locator('.teach-moment').waitFor();
  await page.locator('.teach-done').tap();
}

/** A repeat on screen: wait until the repeat line shows, then answer it once. */
async function waitRepeat(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="repeat-line"]')).toHaveText('Deze proberen we nog een keer!');
  await page.locator('.number-pad').waitFor();
}

async function repeatWrong(page: Page): Promise<string> {
  await answerOnce(page, false);
  await page.locator('.teach-moment').waitFor();
  const text = await page.locator('.teach-moment').innerText();
  await page.locator('.teach-done').tap();
  return text;
}

async function repeatRight(page: Page): Promise<void> {
  await answerOnce(page, true);
  await page.locator('.break-banner-right').waitFor();
  await expect(page.locator('.break-banner-right')).toContainText('Goed zo! Nu weet je het.');
  await page.locator('.break-next-btn').tap();
}

const answersLog = (page: Page) => readState<AnswerRow[]>(page, 'answersLog');
const ledgerCount = async (page: Page) => (await readState<unknown[]>(page, 'ledgerLog')).length;

test.describe('v25 Nog een keer in the learning break (AC338 to AC348)', () => {
  test('AC338 AC339 AC340 AC341 AC343 AC347: the repeats come back in order, cost nothing and show on the summary', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startTimedBreak(page);
    const ids = ((await breakState(page))?.entries ?? []).map((e) => e.item.id);
    expect(ids).toHaveLength(5);

    // Question 2 and 4 end in a teach moment, 3 is right on the retry, 1 and 5 are right on the first try.
    const plan: How[] = ['right', 'teach', 'retry', 'teach', 'right'];
    for (const how of plan) await playNormal(page, how);

    // AC338: question 2 comes back, no lesson page, the line is 2 then 4.
    await waitRepeat(page);
    await expect(page.locator('.lesson-view')).toHaveCount(0);
    const st = await breakState(page);
    expect(st).toMatchObject({ phase: 'question', repeatPart: true, index: 1 });
    expect(st?.repeatLine).toEqual([ids[1], ids[3]]);
    expect(st?.repeatCounts).toEqual({});
    await expect(page.locator('.break-repeat-left')).toHaveText('Nog 2 te gaan');
    // AC342: every dot of the round is done.
    await expect(page.locator('.break-dot-done')).toHaveCount(5);
    const pointsBefore = await readState<number>(page, 'points');
    const ledgerBefore = await ledgerCount(page);

    // AC339: right on the repeat of question 2: no points, no ledger row, it leaves the line.
    await repeatRight(page);
    expect(await readState<number>(page, 'points')).toBe(pointsBefore);
    expect(await ledgerCount(page)).toBe(ledgerBefore);
    await waitRepeat(page);
    const afterRight = await breakState(page);
    expect(afterRight?.repeatLine).toEqual([ids[3]]);
    await expect(page.locator('.break-repeat-left')).toHaveText('Nog 1 te gaan');

    // AC340 AC341: question 4 wrong three times: "straks", "straks", "Goed geoefend!".
    const first = await repeatWrong(page);
    expect(first).toContain('Zo zit het:');
    expect(first).toContain('Die komt straks nog een keer.');
    expect(first).not.toContain('Stap voor stap');
    await waitRepeat(page);
    expect(await readState<number>(page, 'points')).toBe(pointsBefore);
    expect(await ledgerCount(page)).toBe(ledgerBefore);
    await expect(page.locator('.break-repeat-left')).toHaveText('Nog 1 te gaan');
    expect((await breakState(page))?.repeatCounts).toEqual({ [ids[1]!]: 1, [ids[3]!]: 1 });
    expect(await repeatWrong(page)).toContain('Die komt straks nog een keer.');
    await waitRepeat(page);
    await answerOnce(page, false);
    await page.locator('.teach-moment').waitFor();
    const last = await page.locator('.teach-moment').innerText();
    expect(last).toContain('Goed geoefend! Deze komt een andere keer terug.');
    expect(last).not.toContain('Die komt straks nog een keer.');
    await page.locator('.teach-done').tap();

    // AC343: the summary. Q1 +2, Q2 -1, Q3 +1, Q4 -1, Q5 +2 = +3.
    await page.locator('.break-summary').waitFor();
    const summary = await page.locator('.break-summary').innerText();
    expect(summary).toContain('3 van de 5 goed!');
    expect(summary).toContain('En 1 alsnog goed!');
    expect(summary).toContain('+3 punten verdiend');
    expect(summary).toContain('Totaal: 13 punten');
    expect(await readState<number>(page, 'points')).toBe(13);

    // AC347: 4 repeat rows with the mark 1, then 1, 2, 3; the rows of the first tries and retries are as without repeats.
    const rows = await answersLog(page);
    const reps = rows.filter((r) => r.repeat);
    expect(reps.map((r) => [r.itemId, r.repeat])).toEqual([
      [ids[1], 1],
      [ids[3], 1],
      [ids[3], 2],
      [ids[3], 3],
    ]);
    expect(reps.every((r) => r.context === 'break')).toBe(true);
    expect(rows.filter((r) => !r.repeat).map((r) => r.try)).toEqual([1, 1, 2, 1, 2, 1, 2, 1]);
    expect(rows.some((r) => r.given === 'niet beantwoord')).toBe(false);
  });

  test('AC338: a break with no teach moment shows the summary right after the last question', async ({ page }) => {
    await openApp(page);
    await startTimedBreak(page);
    for (const how of ['right', 'retry', 'right', 'retry', 'right'] as How[]) await playNormal(page, how);
    await page.locator('.break-summary').waitFor();
    await expect(page.locator('.break-repeat-left')).toBeHidden();
    await expect(page.locator('[data-testid="summary-alsnog"]')).toHaveCount(0);
  });

  test('AC338 AC343: a Nu oefenen break repeats too, and with 0 right the kind message and a right repeat both show', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startTimedBreak(page, true);
    for (let i = 0; i < 5; i++) await playNormal(page, 'teach');
    const st = await breakState(page);
    expect(st?.repeatLine).toHaveLength(5);
    await waitRepeat(page);
    await repeatRight(page); // the first one right, the other four wrong until they leave
    for (let guard = 0; guard < 30; guard++) {
      await page.locator('.break-summary, [data-testid="repeat-line"]').first().waitFor();
      if ((await page.locator('.break-summary').count()) > 0) break;
      await repeatWrong(page);
    }
    await page.locator('.break-summary').waitFor();
    const text = await page.locator('.break-summary').innerText();
    expect(text).toContain('Dit was lastig');
    expect(text).toContain('En 1 alsnog goed!');
    expect(text).not.toMatch(/\+\d+ punt/);
  });

  test('AC348: a double tap on an answer and on Verder acts once in the repeat part', async ({ page }) => {
    await openApp(page);
    await startTimedBreak(page);
    const ids = ((await breakState(page))?.entries ?? []).map((e) => e.item.id);
    for (const how of ['teach', 'teach', 'right', 'right', 'right'] as How[]) await playNormal(page, how);
    await waitRepeat(page);
    const right = await solveShownSum(page);
    await typeDigits(page, right + 1);
    const done = page.locator('.number-pad .kb-done');
    await Promise.all([done.tap(), done.tap({ timeout: 1500 }).catch(() => undefined)]);
    await page.locator('.teach-moment').waitFor();
    expect((await breakState(page))?.repeatCounts).toEqual({ [ids[0]!]: 1 });
    expect((await answersLog(page)).filter((r) => r.repeat)).toHaveLength(1);
    const verder = page.locator('.teach-done');
    await Promise.all([verder.tap(), verder.tap({ timeout: 1500 }).catch(() => undefined)]);
    await waitRepeat(page);
    const st = await breakState(page);
    expect(st?.phase).toBe('question');
    expect(st?.repeatLine).toEqual([ids[1], ids[0]]);
    expect(st?.index).toBe(1);
  });

  test('AC346: a break closed in the repeat part reopens at the same repeat with the same line and counts', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startTimedBreak(page);
    const ids = ((await breakState(page))?.entries ?? []).map((e) => e.item.id);
    for (const how of ['teach', 'right', 'teach', 'right', 'right'] as How[]) await playNormal(page, how);
    await waitRepeat(page);
    await repeatWrong(page); // the first one wrong once: it goes behind the other
    await waitRepeat(page);
    const before = await breakState(page);
    expect(before?.repeatLine).toEqual([ids[2], ids[0]]);
    const points = await readState<number>(page, 'points');

    const fresh = await killApp(page);
    await expect(fresh.locator('.break-screen')).toBeVisible();
    await waitRepeat(fresh);
    const after = await breakState(fresh);
    expect(after).toMatchObject({ phase: 'question', repeatPart: true, index: 2 });
    expect(after?.repeatLine).toEqual([ids[2], ids[0]]);
    expect(after?.repeatCounts).toEqual({ [ids[0]!]: 1 });
    expect(await readState<number>(fresh, 'points')).toBe(points);

    // Question 3 right: it leaves. Question 1 gets its second and third repeat wrong and then leaves too.
    await repeatRight(fresh);
    await repeatWrong(fresh);
    await waitRepeat(fresh);
    expect(await repeatWrong(fresh)).toContain('Goed geoefend!');
    await fresh.locator('.break-summary').waitFor();
    expect((await answersLog(fresh)).filter((r) => r.itemId === ids[0] && r.repeat).map((r) => r.repeat)).toEqual([1, 2, 3]);
  });

  test('AC345: the parent ends the break in the repeat part: logged as stopped, no "niet beantwoord", no rows for open repeats', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startTimedBreak(page);
    for (const how of ['teach', 'teach', 'right', 'right', 'right'] as How[]) await playNormal(page, how);
    await waitRepeat(page);
    const rowsBefore = (await answersLog(page)).length;
    const points = await readState<number>(page, 'points');
    await readState(page, 'endBreakByParent');
    await expect(page.locator('.break-screen')).toBeHidden();
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    const breaks = await readState<Array<{ endedBy: string; score: number; points: number }>>(page, 'breaksLog');
    expect(breaks).toHaveLength(1);
    expect(breaks[0]?.endedBy).toBe('stopped');
    expect(breaks[0]?.score).toBe(3);
    const rows = await answersLog(page);
    expect(rows).toHaveLength(rowsBefore);
    expect(rows.some((r) => r.given === 'niet beantwoord' || r.repeat)).toBe(false);
    expect(await readState<number>(page, 'points')).toBe(points);
  });
});

test.describe('v25 Nog een keer in Extra oefenen (AC338, AC345, AC347)', () => {
  test('AC338 AC347: a round of Extra oefenen repeats too, with the context practice', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    const ids = ((await practiceState(page))?.entries ?? []).map((e) => e.item.id);
    for (const how of ['teach', 'right', 'right', 'right', 'right'] as How[]) await playNormal(page, how);
    await waitRepeat(page);
    expect((await practiceState(page))?.repeatLine).toEqual([ids[0]]);
    await expect(page.locator('.break-repeat-left')).toHaveText('Nog 1 te gaan');
    const points = await readState<number>(page, 'points');
    await repeatRight(page);
    expect(await readState<number>(page, 'points')).toBe(points);
    await page.locator('.break-summary').waitFor();
    const summary = await page.locator('.break-summary').innerText();
    expect(summary).toContain('4 van de 5 goed!');
    expect(summary).toContain('En 1 alsnog goed!');
    const reps = (await answersLog(page)).filter((r) => r.repeat);
    expect(reps).toHaveLength(1);
    expect(reps[0]).toMatchObject({ context: 'practice', itemId: ids[0], repeat: 1, correct: true });
  });

  test('AC345: Stoppen in the repeat part closes the round and the points stay', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    for (const how of ['teach', 'right', 'right', 'right', 'right'] as How[]) await playNormal(page, how);
    await waitRepeat(page);
    const points = await readState<number>(page, 'points');
    await page.locator('[data-testid="practice-stop"]').tap();
    await page.locator('.break-screen').waitFor({ state: 'hidden' });
    expect(await readState<number>(page, 'points')).toBe(points);
  });
});

test.describe('v25 Nog een keer: layout', () => {
  // The game is landscape only (portrait shows "Draai je iPad"): iPad gen 6 landscape, and iPad Pro 11 through @layout.
  for (const [largeFont, tag] of [[false, ''], [true, ''], [false, ' @layout'], [true, ' @layout']] as const) {
    test(`AC342${tag}: the repeat part fits, buttons are 44 points, the lock covers no answer (Groter lettertype ${largeFont ? 'aan' : 'uit'})`, async ({ page }) => {
      await openApp(page);
      await setSettings(page, { largeFont });
      await page.reload();
      await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
      await startTimedBreak(page);
      for (const how of ['teach', 'teach', 'right', 'right', 'right'] as How[]) await playNormal(page, how);
      await waitRepeat(page);

      const audit = async (label: string) => {
        const res = await page.evaluate(() => {
          const rect = (e: Element) => e.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const problems: string[] = [];
          const named: Array<[string, Element]> = [];
          for (const sel of ['.break-repeat-left', '.break-repeat-line', '.teach-note', '.teach-done', '.break-next-btn', '.break-lock', '.break-dots', '.dino-juf']) {
            const e = document.querySelector(sel);
            if (e && !(e as HTMLElement).hidden && rect(e).width > 0) named.push([sel, e]);
          }
          for (const [sel, e] of named) {
            const r = rect(e);
            if (r.left < -1 || r.right > vw + 1) problems.push(`${sel} sticks out sideways`);
            if (['.break-repeat-left', '.break-repeat-line', '.teach-note'].includes(sel)) {
              const el = e as HTMLElement;
              if (el.scrollWidth > el.clientWidth + 1) problems.push(`${sel} text is cut off`);
            }
          }
          const header = ['.dino-juf', '.break-dots', '.break-repeat-left', '.break-lock']
            .map((s) => named.find(([n]) => n === s))
            .filter((x): x is [string, Element] => Boolean(x));
          for (let i = 0; i < header.length; i++) {
            for (let j = i + 1; j < header.length; j++) {
              const a = rect(header[i]![1]);
              const b = rect(header[j]![1]);
              if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) {
                problems.push(`${header[i]![0]} overlaps ${header[j]![0]}`);
              }
            }
          }
          const buttons = [...document.querySelectorAll('.break-screen button, .break-screen .kb-char')].filter((b) => rect(b).width > 0);
          for (const b of buttons) {
            const r = rect(b);
            if (r.width < 44 || r.height < 44) problems.push(`button ${b.className} is ${Math.round(r.width)} x ${Math.round(r.height)}`);
          }
          const lock = document.querySelector('.break-lock');
          if (lock && !(lock as HTMLElement).hidden) {
            const l = rect(lock);
            for (const a of document.querySelectorAll('.q-option, .kb-char, .kb-done')) {
              const r = rect(a);
              if (r.width > 0 && l.left < r.right && r.left < l.right && l.top < r.bottom && r.top < l.bottom) problems.push('the lock covers an answer button');
            }
          }
          const done = document.querySelector('.teach-done, .kb-done');
          if (done && rect(done).bottom > vh + 1) problems.push('the main button is below the screen');
          return problems;
        });
        expect(res, label).toEqual([]);
      };

      await audit('repeat question');
      await answerOnce(page, false);
      await page.locator('.teach-moment').waitFor();
      await audit('wrong repeat card');
      await page.locator('.teach-done').tap();
      await waitRepeat(page);
      await answerOnce(page, true);
      await page.locator('.break-banner-right').waitFor();
      await audit('right repeat card');
    });
  }
});
