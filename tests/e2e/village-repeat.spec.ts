import { expect, test, type Page } from '@playwright/test';
import { killApp, readState } from './helpers/app';
import {
  SEEN_ANSWER, SEEN_ITEM_ID, cardState as baseCardState, fingerTap, openCardAt, openForVillage, typeNumber,
  villageState, villagers,
} from './helpers/dorp';

// Release v25 Nog een keer (0.16.0): the villager card asks a question that ended in a teach moment again,
// at most 3 times. AC349 and AC351, played with real finger taps. The break part is in repeat.spec.ts.

const cardState = (page: Page) => readState<{ open: boolean; phase: string | null; repeat: number }>(page, 'villageCard');
const card = (page: Page) => page.locator('[data-testid="village-card"]');
const say = (page: Page) => page.locator('[data-testid="village-say"]');
const points = (page: Page) => readState<number>(page, 'points');
void baseCardState;

async function answerWrong(page: Page): Promise<void> {
  await typeNumber(page, SEEN_ANSWER - 1);
}

async function box(page: Page): Promise<number | undefined> {
  return page.evaluate(
    (key) =>
      new Promise<number | undefined>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction('progress', 'readonly').objectStore('progress').get(key);
          get.onsuccess = () => {
            db.close();
            resolve((get.result as { box?: number } | undefined)?.box);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    `rekenen-basis|${SEEN_ITEM_ID}`,
  );
}

/** Opens a card on the first villager and gets to its first repeat: wrong, wrong, Verder. */
async function toFirstRepeat(page: Page): Promise<void> {
  await openForVillage(page);
  await readState(page, 'setPoints', 10);
  const v = (await villagers(page))[0]!;
  await openCardAt(page, v.id);
  await answerWrong(page);
  await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('retry');
  await answerWrong(page);
  await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('wrong');
  await fingerTap(page, '[data-testid="village-verder"]');
  await expect(say(page)).toHaveText('Nog een keer! Weet je het nu?');
}

test.describe('v25 Nog een keer on the villager card (AC349)', () => {
  test('AC349: Verder after the teach moment shows the same question again with Laat maar, input cleared', async ({ page }) => {
    await toFirstRepeat(page);
    expect(await cardState(page)).toMatchObject({ open: true, phase: 'question', repeat: 0 });
    await expect(card(page).locator('.type-text')).toHaveText('');
    await expect(page.locator('[data-testid="village-laat-maar"]')).toBeVisible();
    await expect(card(page).locator('.q-prompt')).toContainText('7');
    await expect(card(page).locator('.village-banner-wrong')).toHaveCount(0);
  });

  test('AC349 AC351: a right repeat shows a check and the text, no dance, no Respect, no block, found count and total stay', async ({ page }) => {
    await toFirstRepeat(page);
    const foundBefore = (await villageState(page)).found;
    await typeNumber(page, SEEN_ANSWER);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('right');
    await expect(card(page).locator('.village-banner-right')).toContainText('✓');
    await expect(card(page)).toContainText('Goed zo! Nu weet je het.');
    await expect(card(page)).not.toContainText('Respect bruuuuu!');
    await expect(card(page)).not.toContainText('Kijk, een dansje!');
    await expect(card(page).locator('[data-testid="village-found"], [data-testid="village-hotbar"]')).toHaveCount(0);
    expect(await card(page).locator('.village-face-dance').count()).toBe(0);
    expect((await villagers(page))[0]!.dancing).toBe(false);
    expect((await villageState(page)).found).toEqual(foundBefore);
    expect(await points(page)).toBe(10);
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    expect(await box(page)).toBe(1);
    expect((await villageState(page)).found).toEqual(foundBefore);
    const rows = await readState<Array<{ context: string; try: number; repeat?: number; correct: boolean }>>(page, 'answersLog');
    expect(rows.map((r) => [r.context, r.try, r.repeat ?? 0, r.correct])).toEqual([
      ['dorp', 1, 0, false],
      ['dorp', 2, 0, false],
      ['dorp', 1, 1, true],
    ]);
  });

  test('AC349 AC351: a wrong repeat shows the cross, the answer and explain; the third one praises the practice and closes', async ({ page }) => {
    await toFirstRepeat(page);
    for (let n = 1; n <= 3; n++) {
      await answerWrong(page);
      await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('wrong');
      await expect(card(page).locator('.village-banner-wrong')).toContainText('✗');
      await expect(card(page).locator('.village-zo')).toHaveText('Zo zit het:');
      await expect(page.locator('[data-testid="village-answer"]')).toContainText('56');
      expect(await points(page)).toBe(10);
      if (n < 3) {
        await expect(card(page)).not.toContainText('Goed geoefend');
        await fingerTap(page, '[data-testid="village-verder"]');
        await expect(say(page)).toHaveText('Nog een keer! Weet je het nu?');
        expect((await cardState(page)).repeat).toBe(n);
      }
    }
    await expect(card(page)).toContainText('Goed geoefend! Deze komt een andere keer terug.');
    await fingerTap(page, '[data-testid="village-verder"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    expect(await box(page)).toBe(1);
    expect((await villageState(page)).found).toEqual([]);
    const rows = await readState<Array<{ repeat?: number; context: string }>>(page, 'answersLog');
    expect(rows.filter((r) => r.repeat).map((r) => r.repeat)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.context === 'dorp')).toBe(true);
    expect(await points(page)).toBe(10);
  });

  test('AC349: Laat maar on a repeat closes the card at once, with no block', async ({ page }) => {
    await toFirstRepeat(page);
    await fingerTap(page, '[data-testid="village-laat-maar"]');
    await expect.poll(() => cardState(page).then((c) => c.open)).toBe(false);
    expect((await villageState(page)).found).toEqual([]);
    expect(await box(page)).toBe(1);
    expect(await points(page)).toBe(10);
  });

  test('AC349: a double tap on Verder acts once, and an app closed during a repeat reopens in the world with no card', async ({ page }) => {
    await openForVillage(page);
    const v = (await villagers(page))[0]!;
    await openCardAt(page, v.id);
    await answerWrong(page);
    await answerWrong(page);
    await expect.poll(() => cardState(page).then((c) => c.phase)).toBe('wrong');
    const verder = page.locator('[data-testid="village-verder"]');
    await Promise.all([verder.tap(), verder.tap({ timeout: 1000 }).catch(() => undefined)]);
    await expect(say(page)).toHaveText('Nog een keer! Weet je het nu?');
    expect((await cardState(page)).repeat).toBe(0);
    expect(await readState<string>(page, 'currentScreen')).not.toBe('world');
    const fresh = await killApp(page);
    expect((await cardState(fresh)).open).toBe(false);
    expect(await readState<string>(fresh, 'currentScreen')).toBe('world');
  });

  test('AC351: the new card texts hold no banned word and no "Fout"', async () => {
    const { hasBannedWord } = await import('../../src/core/kid-words');
    const texts = ['Nog een keer! Weet je het nu?', 'Goed zo! Nu weet je het.', 'Kijk even mee, zo zit het.', 'Goed geoefend! Deze komt een andere keer terug.', 'Net niet.'];
    for (const t of texts) {
      expect(hasBannedWord(t)).toBe(false);
      expect(t).not.toMatch(/fout/i);
    }
  });
});
