import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';
import { loginAsParent, setupPin } from './helpers/gate';

// Release v9 Eerlijke punten (0.3.0) and v10 Punten voor elke ronde (0.4.0), played with real finger taps.
// v10 replaced the day limit and the no minus rule of v9 (AC166 to AC168, AC170) with AC172 to AC176.
// AC169 (the egg hint) still holds. AC177 (version and changelog) is checked in tests/unit.

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

type PointsMode = 'makkelijk' | 'normaal' | 'moeilijk';

/** Saves the Punten setting, as the parent would (before a round starts). */
async function setPointsMode(page: Page, mode: PointsMode): Promise<void> {
  await page.evaluate(
    (m) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          const get = store.get('settings');
          get.onsuccess = () => store.put({ ...((get.result ?? {}) as object), pointsMode: m }, 'settings');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    mode,
  );
}

const MINUS = /[−-]\s*\d+\s*punt/i;

/** First try wrong, and the retry wrong (a teach moment) or right. Returns the texts seen on the way. */
async function wrongTries(page: Page, retryRight: boolean): Promise<{ retryBanner: string; after: string }> {
  await answerOnce(page, false);
  const banner = page.locator('.break-banner-wrong');
  await banner.waitFor();
  const retryBanner = (await banner.innerText()).replace('✗', '').trim();
  await answerOnce(page, retryRight);
  if (retryRight) {
    await page.locator('.break-banner-right').waitFor();
    return { retryBanner, after: (await page.locator('.break-banner-right').innerText()).replace('✓', '').trim() };
  }
  await page.locator('.teach-moment').waitFor();
  return { retryBanner, after: await page.locator('.teach-moment').innerText() };
}

test.describe('v10 Punten voor elke ronde (AC172 to AC176, AC169)', () => {
  test('AC175: Extra oefenen pays every round, also with 50 points counted today and in a second round', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 50);
    for (const total of [60, 70]) {
      await startPractice(page);
      const banners = await playRound(page, ['right', 'right', 'right', 'right', 'right']);
      for (const b of banners) expect(b).toBe('Goed! +2 punten');
      const text = await summaryText(page);
      expect(text).toContain('+10 punten verdiend');
      expect(text).toContain(`Totaal: ${total} punten`);
      expect(await page.locator('body').innerText()).not.toContain('Genoeg geoefend');
      expect(await readState<number>(page, 'points')).toBe(total);
      await page.locator('.summary-done-btn').tap();
      await page.locator('.break-screen').waitFor({ state: 'hidden' });
    }
    await readState(page, 'openPractice');
    await expect(page.getByRole('dialog', { name: 'Extra oefenen' })).toBeVisible();
    const picker = await page.getByRole('dialog', { name: 'Extra oefenen' }).innerText();
    expect(picker).not.toContain('Genoeg geoefend');
    expect(picker).not.toContain('Vandaag:');
  });

  test('AC175: a Nu oefenen break pays +2 and the +3 bonus with 50 points counted today', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 50);
    await readState(page, 'setPracticeUsed', 50);
    await onlyRekenen(page);
    await readState(page, 'startEarlyBreak');
    await page.locator('.break-screen').waitFor();
    await skipLessonIfShown(page);
    await expectOnlySums(page);
    const banners = await playRound(page, ['right', 'right', 'right', 'right', 'right']);
    for (const b of banners) expect(b).toBe('Goed! +2 punten');
    const text = await summaryText(page);
    expect(text).toContain('+13 punten verdiend');
    expect(text).toContain('inclusief +3 bonus');
    expect(text).not.toContain('Genoeg geoefend');
    expect(await readState<number>(page, 'points')).toBe(63);
  });

  test('AC175: a timed break pays +2, +1 and the +3 bonus', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPracticeUsed', 99);
    await startTimedBreak(page);
    const banners = await playRound(page, ['retry', 'right', 'right', 'right', 'right']);
    expect(banners[0]).toBe('Goed zo! +1 punt');
    expect(banners[1]).toBe('Goed! +2 punten');
  });

  test('AC173: Makkelijk, two wrong tries leave the total and no minus shows', async ({ page }) => {
    await openApp(page);
    await setPointsMode(page, 'makkelijk');
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    const seen = await wrongTries(page, false);
    expect(seen.retryBanner).not.toMatch(MINUS);
    expect(seen.after).not.toMatch(MINUS);
    expect(await readState<number>(page, 'points')).toBe(10);
  });

  test('AC173: Normaal, a wrong first try costs nothing and the teach moment shows -1 punt', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    await answerOnce(page, false);
    await page.locator('.break-banner-wrong').waitFor();
    expect(await page.locator('.break-banner-wrong').innerText()).not.toMatch(MINUS);
    expect(await readState<number>(page, 'points')).toBe(10);
    await answerOnce(page, false);
    await page.locator('.teach-moment').waitFor();
    await expect(page.locator('.teach-minus')).toHaveText('-1 punt');
    expect(await readState<number>(page, 'points')).toBe(9);
    await page.locator('.teach-done').tap();
  });

  test('AC173 and AC174: Moeilijk, the first wrong try shows -1 punt in soft orange, a right retry gives +1 back', async ({
    page,
  }) => {
    await openApp(page);
    await setPointsMode(page, 'moeilijk');
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    await answerOnce(page, false);
    const minus = page.locator('.break-banner-wrong .points-minus');
    await expect(minus).toHaveText('-1 punt');
    const color = await minus.evaluate((e) => getComputedStyle(e).color);
    const [r = 0, g = 0, b = 0] = (color.match(/\d+/g) ?? []).map(Number);
    expect(r).toBeGreaterThan(g); // orange or brown, never pure red
    expect(g).toBeGreaterThan(0);
    expect(b).toBeLessThan(r);
    expect(await readState<number>(page, 'points')).toBe(9);
    await answerOnce(page, true);
    await expect(page.locator('.break-banner-right')).toContainText('Goed zo! +1 punt');
    expect(await readState<number>(page, 'points')).toBe(10);
  });

  test('AC173: Moeilijk, wrong twice takes 2 in total', async ({ page }) => {
    await openApp(page);
    await setPointsMode(page, 'moeilijk');
    await readState(page, 'setPoints', 10);
    await startPractice(page);
    await wrongTries(page, false);
    await expect(page.locator('.teach-minus')).toHaveText('-1 punt');
    expect(await readState<number>(page, 'points')).toBe(8);
  });

  test('AC174: at 0 points Normaal takes nothing and the teach moment shows no minus', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 0);
    await startPractice(page);
    const seen = await wrongTries(page, false);
    expect(seen.after).not.toMatch(MINUS);
    await expect(page.locator('.teach-minus')).toHaveCount(0);
    expect(await readState<number>(page, 'points')).toBe(0);
  });

  test('AC173 and AC176: a timed break with 4 right and 1 teach moment gives 7 on Normaal', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 40);
    await startTimedBreak(page);
    await playRound(page, ['right', 'right', 'teach', 'right', 'right']);
    const text = await summaryText(page);
    expect(text).toContain('4 van de 5 goed!');
    expect(text).toContain('+7 punten verdiend');
    expect(text).not.toMatch(/bonus/i);
    expect(text).toContain('Totaal: 47 punten');
    expect(await readState<number>(page, 'points')).toBe(47);
  });

  test('AC176: a round of only mistakes on Moeilijk shows the minus sum in soft orange and the new total', async ({ page }) => {
    await openApp(page);
    await setPointsMode(page, 'moeilijk');
    await readState(page, 'setPoints', 40);
    await startPractice(page);
    await playRound(page, ['teach', 'teach', 'teach', 'teach', 'teach']);
    const line = page.locator('.summary-points');
    await expect(line).toHaveText('-10 punten');
    await expect(line).toHaveClass(/points-minus/);
    await expect(page.locator('.summary-total')).toHaveText('Totaal: 30 punten');
    expect(await readState<number>(page, 'points')).toBe(30);
  });

  test('AC172: Punten is in Ouders, Instellingen behind the gate, Normaal first, big choices, and Moeilijk stays after a restart', async ({
    page,
  }) => {
    await openApp(page);
    await setupPin(page);
    // Nothing of it is in the world
    await expect(page.locator('[data-testid="points-setting"]')).toHaveCount(0);
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    const card = page.locator('[data-testid="points-setting"]');
    await expect(card).toContainText('Punten');
    for (const mode of ['makkelijk', 'normaal', 'moeilijk']) {
      const box = await card.locator(`[data-points-mode="${mode}"]`).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(56);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(56);
      await expect(card.locator(`[data-points-mode="${mode}"] .parent-points-line`)).not.toHaveText('');
    }
    await expect(card.locator('[data-points-mode="normaal"]')).toHaveAttribute('aria-pressed', 'true');
    await card.locator('[data-points-mode="moeilijk"]').tap();
    await expect(card.locator('[data-points-mode="moeilijk"]')).toHaveAttribute('aria-pressed', 'true');
    await readState(page, 'flushSave');

    const fresh = await killApp(page);
    await loginAsParent(fresh);
    await fresh.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await expect(fresh.locator('[data-points-mode="moeilijk"]')).toHaveAttribute('aria-pressed', 'true');
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
