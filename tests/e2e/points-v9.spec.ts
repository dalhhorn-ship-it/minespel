import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// Release v9 Eerlijke punten (0.3.0): AC166 to AC170 played with real finger taps.
// AC171 (version and changelog) is checked in tests/unit.

type How = 'right' | 'retry' | 'teach';

interface BreakItem {
  type: string;
  answer?: unknown;
  options?: string[];
}
interface BreakStateShape {
  index: number;
  entries: Array<{ item: BreakItem }>;
}

/** Solves "12 + 7 = ?" or "3 × 4 = ?" from the screen (the Rekenen number pad). */
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

async function typeNumber(page: Page, n: number): Promise<void> {
  for (const ch of String(n).replace('.', ',')) {
    await page.locator('.number-pad .kb-char', { hasText: new RegExp(`^${ch}$`) }).tap();
  }
  await page.locator('.number-pad .kb-done').tap();
}

/** One try on the open question: right or deliberately wrong. Works for Rekenen sums and choice questions. */
async function answerOnce(page: Page, wantRight: boolean): Promise<void> {
  await page.locator('.q-view').waitFor();
  if ((await page.locator('.number-pad').count()) > 0) {
    const right = await solveShownSum(page);
    await typeNumber(page, wantRight ? right : right + 1);
    return;
  }
  const st = await readState<BreakStateShape | null>(page, 'breakState');
  const item = st?.entries[st.index]?.item;
  if (item?.type === 'type') {
    // A Taal typing question: type the right word, or a wrong one, on the letter keyboard.
    const rightText = String((item.answer as string[])[0]);
    const text = wantRight ? rightText : rightText === 'q' ? 'z' : 'q';
    for (const ch of text) {
      const key = ch === ' ' ? page.locator('.kb-space') : page.locator('.kid-keyboard .kb-char', { hasText: new RegExp(`^${ch}$`) });
      await key.first().tap();
    }
    await page.locator('.kid-keyboard .kb-done').tap();
    return;
  }
  if (!item || item.type !== 'choice') throw new Error(`test cannot answer a ${item?.type ?? 'unknown'} question`);
  const rightIndex = item.answer as number;
  const idx = wantRight ? rightIndex : rightIndex === 0 ? 1 : 0;
  await page.locator('.q-option').nth(idx).tap();
}

/** Plays one question and returns the banner text of a right answer ('' for a teach moment). */
async function playQuestion(page: Page, how: How): Promise<string> {
  await answerOnce(page, how === 'right');
  if (how === 'right') {
    const banner = page.locator('.break-banner-right');
    await banner.waitFor();
    const text = (await banner.innerText()).replace('✓', '').trim();
    await page.locator('.break-next-btn').tap();
    return text;
  }
  await page.locator('.break-banner-wrong').waitFor();
  await answerOnce(page, how === 'retry');
  if (how === 'retry') {
    const banner = page.locator('.break-banner-right');
    await banner.waitFor();
    const text = (await banner.innerText()).replace('✓', '').trim();
    await page.locator('.break-next-btn').tap();
    return text;
  }
  await page.locator('.teach-moment').waitFor();
  await page.locator('.teach-done').tap();
  return '';
}

async function playRound(page: Page, plan: How[]): Promise<string[]> {
  const banners: string[] = [];
  for (const how of plan) banners.push(await playQuestion(page, how));
  await page.locator('.break-summary').waitFor();
  return banners;
}

/** Switches the Taal subject off in the saved switches, so every break asks Rekenen sums (the number pad). */
async function onlyRekenen(page: Page): Promise<void> {
  await page.evaluate(
    () =>
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
            store.put({ ...cur, modules: cur.modules ?? {}, subjects: { ...(cur.subjects ?? {}), taal: false } }, 'switches');
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** Fails the test if the break asked anything but number pad sums. */
async function expectOnlySums(page: Page): Promise<void> {
  const st = await readState<BreakStateShape | null>(page, 'breakState');
  expect(st?.entries.length).toBeGreaterThan(0);
  expect(st?.entries.every((e) => e.item.type === 'type' && (e as { numeric?: boolean }).numeric === true)).toBe(true);
}

async function startPractice(page: Page): Promise<void> {
  await readState(page, 'openPractice');
  await page.locator('[data-practice-topic$=":optellen"]').tap();
  await page.locator('.break-screen').waitFor();
  // Optellen starts with a question (no lesson first in Extra oefenen).
  await page.locator('.q-view').waitFor();
}

async function startTimedBreak(page: Page): Promise<void> {
  await onlyRekenen(page);
  await readState(page, 'startBreakNow');
  await page.locator('.break-screen').waitFor();
  await skipLessonIfShown(page);
  await expectOnlySums(page);
}

/** A break may open on the short lesson. Tap through its pages until the first question shows. */
async function skipLessonIfShown(page: Page): Promise<void> {
  await page.locator('.q-view, .lesson-view').first().waitFor();
  for (let i = 0; i < 12 && (await page.locator('.q-view').count()) === 0; i++) {
    const before = await page.locator('.lesson-body').innerText();
    // A tap right after the lesson appears can be lost while the screen settles, so tap again until the page moves.
    await expect
      .poll(
        async () => {
          if ((await page.locator('.q-view').count()) > 0) return true;
          if ((await page.locator('.lesson-body').innerText().catch(() => before)) !== before) return true;
          await page.locator('.lesson-next').tap({ timeout: 1000 }).catch(() => undefined);
          return false;
        },
        { intervals: [500], timeout: 10_000 },
      )
      .toBe(true);
  }
  await page.locator('.q-view').waitFor();
}

async function summaryText(page: Page): Promise<string> {
  return page.locator('.break-summary').innerText();
}

async function expectNoMinusPoints(page: Page): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/[−-]\s*\d+\s*punt/i);
  const ledger = await readState<Array<{ delta: number }>>(page, 'ledgerLog');
  expect(ledger.filter((l) => l.delta < 0)).toEqual([]);
}

test.describe('v9 Eerlijke punten (AC166 to AC170)', () => {
  test('AC166: Extra oefenen past the 10 point limit shows Goed! with no number and the total stays', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 10);
    await startPractice(page);
    // first try right, then right on the retry
    const banners = await playRound(page, ['right', 'retry', 'right', 'right', 'right']);
    expect(banners[0]).toBe('Goed!');
    expect(banners[1]).toBe('Goed zo!');
    for (const b of banners) expect(b).not.toMatch(/\+|punt/);
    expect(await readState<number>(page, 'points')).toBe(50);
    const text = await summaryText(page);
    expect(text).toContain('Totaal: 50 punten');
    expect(text).not.toMatch(/\+[1-9]/);
  });

  test('AC166: a Nu oefenen break past the limit also shows Goed! with no number', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 10);
    await onlyRekenen(page);
    await readState(page, 'startEarlyBreak');
    await page.locator('.break-screen').waitFor();
    await skipLessonIfShown(page);
    await expectOnlySums(page);
    const banners = await playRound(page, ['right', 'retry', 'right', 'right', 'right']);
    expect(banners[0]).toBe('Goed!');
    expect(banners[1]).toBe('Goed zo!');
    expect(await readState<number>(page, 'points')).toBe(50);
  });

  test('AC167: with 1 point left the banner shows +1 punt and the total goes up by exactly 1', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 9);
    await startPractice(page);
    const first = await playQuestion(page, 'right');
    expect(first).toBe('Goed! +1 punt');
    expect(await readState<number>(page, 'points')).toBe(51);
    // next right answer is over the limit: no number, total stays 51
    const second = await playQuestion(page, 'right');
    expect(second).toBe('Goed!');
    expect(await readState<number>(page, 'points')).toBe(51);
  });

  test('AC167: a Nu oefenen break with every first try right and 1 point left shows only points that fit', async ({
    page,
  }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 9);
    await onlyRekenen(page);
    await readState(page, 'startEarlyBreak');
    await page.locator('.break-screen').waitFor();
    await skipLessonIfShown(page);
    await expectOnlySums(page);
    const banners = await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    expect(banners[0]).toBe('Goed! +1 punt');
    const text = await summaryText(page);
    // 1 point fit, so the bonus line shows nothing
    expect(text).toContain('+1 punt verdiend');
    expect(text).not.toMatch(/bonus/i);
    expect(await readState<number>(page, 'points')).toBe(51);
  });

  test('AC168: a round where the limit cut points shows the note and what was really earned', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 9);
    await startPractice(page);
    await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    const text = await summaryText(page);
    expect(text).toContain('Genoeg geoefend voor vandaag');
    expect(text).toContain('+1 punt verdiend');
    expect(text).toContain('Totaal: 51 punten');
  });

  test('AC168: a round where the limit cut nothing has no note', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 0);
    await startPractice(page);
    // 2 right (+4), 3 teach moments: well under the limit
    await playRound(page, ['right', 'right', 'teach', 'teach', 'teach']);
    const text = await summaryText(page);
    expect(text).not.toContain('Genoeg geoefend voor vandaag');
    expect(text).toContain('+4 punten verdiend');
    expect(text).toContain('Totaal: 54 punten');
  });

  test('AC168: a timed break after the limit still shows +2 and the +3 bonus, no note', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 10);
    await startTimedBreak(page);
    const banners = await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    for (const b of banners) expect(b).toBe('Goed! +2 punten');
    const text = await summaryText(page);
    expect(text).toContain('+13 punten verdiend');
    expect(text).toContain('inclusief +3 bonus');
    expect(text).not.toContain('Genoeg geoefend voor vandaag');
    expect(await readState<number>(page, 'points')).toBe(63);
  });

  test('AC168: a timed break shows +1 punt on a right retry', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPracticeUsed', 10);
    await startTimedBreak(page);
    const banners = await playRound(page, ['retry', 'right', 'right', 'right', 'right']);
    expect(banners[0]).toBe('Goed zo! +1 punt');
    expect(banners[1]).toBe('Goed! +2 punten');
  });

  test('AC170: wrong twice in Extra oefenen shows no minus and the total does not drop', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 40);
    await startPractice(page);
    await answerOnce(page, false);
    await page.locator('.break-banner-wrong').waitFor();
    await answerOnce(page, false);
    await page.locator('.teach-moment').waitFor();
    await expect(page.locator('.teach-moment')).toContainText('Zo zit het:');
    const card = await page.locator('.teach-moment').innerText();
    expect(card).not.toMatch(/punt/i);
    expect(card).not.toMatch(/[−-]\s*\d+\s*punt/i);
    expect(await readState<number>(page, 'points')).toBe(40);
    await page.locator('.teach-done').tap();
    await expectNoMinusPoints(page);
    expect(await readState<number>(page, 'points')).toBe(40);
  });

  test('AC170: wrong twice in a Nu oefenen break and a timed break keeps the total and shows no points line', async ({
    page,
  }) => {
    await openApp(page);
    await readState(page, 'setPoints', 40);
    await onlyRekenen(page);
    for (const hook of ['startEarlyBreak', 'startBreakNow']) {
      await readState(page, hook);
      await page.locator('.break-screen').waitFor();
      await skipLessonIfShown(page);
      await expectOnlySums(page);
      await answerOnce(page, false);
      await page.locator('.break-banner-wrong').waitFor();
      await answerOnce(page, false);
      await page.locator('.teach-moment').waitFor();
      expect(await page.locator('.teach-moment').innerText()).not.toMatch(/punt/i);
      expect(await readState<number>(page, 'points')).toBe(40);
      await expectNoMinusPoints(page);
      await readState(page, 'endBreakByParent');
      await page.locator('.break-screen').waitFor({ state: 'hidden' });
      expect(await readState<number>(page, 'points')).toBe(40);
    }
  });

  test('AC170: a timed break with 4 right first try and 1 teach moment gives 8 points', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 40);
    await startTimedBreak(page);
    await playRound(page, ['right', 'right', 'teach', 'right', 'right']);
    const text = await summaryText(page);
    expect(text).toContain('4 van de 5 goed!');
    expect(text).toContain('+8 punten verdiend');
    expect(text).not.toMatch(/bonus/i);
    expect(text).toContain('Totaal: 48 punten');
    expect(await readState<number>(page, 'points')).toBe(48);
    await expectNoMinusPoints(page);
  });

  async function ownHerd(page: Page, shop: number): Promise<void> {
    await readState(page, 'setPoints', 100);
    for (let i = 0; i < 3; i++) expect(await readState<boolean>(page, 'buyChickenInShop')).toBe(true);
    for (let i = 0; i < shop; i++) await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'addEgg', 'compy', true);
    await readState(page, 'addEgg', 'stegosaurus', true);
    await readState(page, 'flushSave');
    await readState(page, 'setPoints', 30);
  }

  test('AC169: with 11 shop dinos, 2 golden dinos and 3 chickens the egg hint shows after a break and after Extra oefenen', async ({
    page,
  }) => {
    await openApp(page);
    await ownHerd(page, 11);

    await startTimedBreak(page);
    await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    await expect(page.locator('.summary-egg-hint')).toHaveText('Je kunt een ei kopen in de Dinowinkel!');
    await page.locator('.summary-done-btn').tap();
    await page.locator('.break-screen').waitFor({ state: 'hidden' });

    await startPractice(page);
    await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    await expect(page.locator('.summary-egg-hint')).toHaveText('Je kunt een ei kopen in de Dinowinkel!');
    await page.locator('.summary-done-btn').tap();
    await page.locator('.break-screen').waitFor({ state: 'hidden' });

    // The Dinowinkel really has a Kopen button for the Compy
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-buy-compy"]')).toBeEnabled();
  });

  test('AC169: with 12 shop dinos the egg hint never shows after a break or after Extra oefenen', async ({ page }) => {
    await openApp(page);
    await ownHerd(page, 12);

    await startTimedBreak(page);
    await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    await expect(page.locator('.summary-egg-hint')).toHaveCount(0);
    await page.locator('.summary-done-btn').tap();
    await page.locator('.break-screen').waitFor({ state: 'hidden' });

    await startPractice(page);
    await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    await expect(page.locator('.summary-egg-hint')).toHaveCount(0);
  });
});
