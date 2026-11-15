// The kid keyboard is laid out like the iPad keyboard (decision 126, AC57): letters, then accent key, wide
// space and Klaar on the bottom row. Played with real taps on a typing question of a practice session.
import { expect, test, type Page } from '@playwright/test';
import { readState } from './helpers/app';
import { prepare } from './helpers/ui-audit';

const TOPIC = 'cito-taalverzorging:trema-koppelteken';

/** Starts the practice topic and answers other question types until a typing question shows. */
async function reachTypingQuestion(page: Page): Promise<void> {
  await prepare(page);
  // A session has a few questions in random order. If it ends before a typing question, start another.
  for (let attempt = 0; attempt < 8; attempt++) {
    await readState(page, 'openPractice');
    const topic = page.locator(`[data-practice-topic="${TOPIC}"]`);
    await topic.waitFor();
    await topic.scrollIntoViewIfNeeded();
    await topic.tap();
    await page.locator('.break-screen').waitFor();
    for (let step = 0; step < 80; step++) {
      if (await page.locator('.type-view .kid-keyboard').isVisible()) return;
      if (await page.locator('.summary-done-btn').isVisible()) {
        await page.locator('.summary-done-btn').tap();
        break;
      }
      if (await page.locator('.break-next-btn').isVisible()) await page.locator('.break-next-btn').tap();
      else if (await page.locator('.teach-done').isVisible()) await page.locator('.teach-done').tap();
      else if (await page.locator('.lesson-next').isVisible()) await page.locator('.lesson-next').tap();
      else if (await page.locator('.q-none').isVisible()) await page.locator('.q-none').tap();
      else if (await page.locator('.q-option').first().isVisible()) await page.locator('.q-option').first().tap();
      await page.waitForTimeout(150);
    }
    await page
      .locator('.break-screen')
      .waitFor({ state: 'detached' })
      .catch(() => undefined);
  }
  throw new Error('no typing question showed up');
}

// Portrait shows only the "draai je iPad" message (ui-review-taps), so the keyboard is checked in landscape.
test.describe('kid keyboard like the iPad (decision 126, AC57)', () => {
  test.use({ viewport: { width: 1024, height: 690 } });
  test.setTimeout(120_000);

  test('AC57: bottom row order, accent through the accent key, shift plus accent, fast taps', async ({ page }) => {
    await reachTypingQuestion(page);
    const kb = page.locator('.type-view .kid-keyboard');

    // Bottom row: accent key, wide space bar, Klaar.
    const bottom = await kb.locator('.kb-bottom > button').evaluateAll((bs) =>
      bs.map((b) => ({
        text: b.textContent,
        x: b.getBoundingClientRect().x,
        w: b.getBoundingClientRect().width,
      })),
    );
    expect(bottom.map((b) => b.text)).toEqual(['é ë', 'spatie', 'Klaar']);
    expect(bottom[0]!.x).toBeLessThan(bottom[1]!.x);
    expect(bottom[1]!.x).toBeLessThan(bottom[2]!.x);
    expect(bottom[1]!.w).toBeGreaterThan(bottom[0]!.w * 2);
    expect(bottom[1]!.w).toBeGreaterThan(bottom[2]!.w * 1.5);
    await expect(kb.locator('.kb-letters .kb-row').first()).toBeVisible();

    // Accent key: panel swaps, one tap on an accent types it and returns to the letters.
    const text = page.locator('.type-field .type-text');
    await kb.locator('.kb-accent').tap();
    await expect(kb.locator('.kb-accents')).toBeVisible();
    await expect(kb.locator('.kb-letters')).toBeHidden();
    await expect(kb.locator('.kb-accent')).toHaveText('abc');
    await kb.locator('.kb-accents .kb-char', { hasText: /^ë$/ }).tap();
    await expect(text).toHaveText('ë');
    await expect(kb.locator('.kb-letters')).toBeVisible();
    await expect(kb.locator('.kb-accent')).toHaveText('é ë');

    // Shift plus accent gives a capital.
    await kb.locator('.kb-letters .kb-shift').tap();
    await kb.locator('.kb-accent').tap();
    await kb.locator('.kb-accents .kb-char', { hasText: /^É$/ }).tap();
    await expect(text).toHaveText('ëÉ');

    // Fast taps are one character each.
    await kb.locator('.kb-space').dispatchEvent('pointerdown', { pointerId: 5, clientX: 1, clientY: 1 });
    await kb.locator('.kb-space').dispatchEvent('pointerup', { pointerId: 5, clientX: 1, clientY: 1 });
    await kb
      .locator('.kb-char', { hasText: /^e$/ })
      .dispatchEvent('pointerdown', { pointerId: 6, clientX: 1, clientY: 1 });
    await kb
      .locator('.kb-char', { hasText: /^e$/ })
      .dispatchEvent('pointerup', { pointerId: 6, clientX: 1, clientY: 1 });
    await expect(text).toHaveText('ëÉ e');
  });

  for (const size of [
    {
      name: 'smallest iPad size, landscape in Safari',
      width: 1024,
      height: 690,
    },
  ]) {
    test(`AC57: the keyboard does not cover the question, ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await reachTypingQuestion(page);
      const box = async (sel: string) => {
        const b = await page.locator(sel).first().boundingBox();
        if (!b) throw new Error(`${sel} has no box`);
        return b;
      };
      const vp = page.viewportSize()!;
      const kb = await box('.type-view .kid-keyboard');
      const field = await box('.type-view .type-field');
      const sentence = page.locator('.type-view .type-sentence');
      expect(field.y + field.height).toBeLessThanOrEqual(kb.y + 1);
      if ((await sentence.count()) > 0) {
        const s = await box('.type-view .type-sentence');
        expect(s.y + s.height).toBeLessThanOrEqual(field.y + 1);
      }
      expect(kb.y + kb.height).toBeLessThanOrEqual(vp.height);
      // Klaar is fully on screen and every key is a big target.
      const done = await box('.type-view .kb-done');
      expect(done.y + done.height).toBeLessThanOrEqual(vp.height);
      expect(done.x + done.width).toBeLessThanOrEqual(vp.width);
      for (const k of await page.locator('.type-view .kb-key:visible').all()) {
        const b = (await k.boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.width).toBeGreaterThanOrEqual(44);
      }
      // The prompt of the question is above the keyboard too.
      const prompt = page.locator('.break-body .q-prompt, .break-body .type-sentence').first();
      if ((await prompt.count()) > 0) {
        const p = (await prompt.boundingBox())!;
        expect(p.y + p.height).toBeLessThanOrEqual(kb.y + 1);
      }
      if (size.height === 690)
        await page.screenshot({
          path: 'test-results/screenshots/kid-keyboard.png',
        });
    });
  }
});
