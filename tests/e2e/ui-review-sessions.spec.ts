// UI review of the practice and break sessions (kid-ui-reviewer). Plays a whole session at four iPad
// sizes and checks every new phase and question type it meets (same rules as ui-review.spec.ts).
// These walks end in the world anyway, so each test boots its own page (R2e).
import { test, expect } from '@playwright/test';
import { readState } from './helpers/app';
import { SIZES, WANT, assertWalkClean, phase, prepare, screen, tapCenter, walkSession, waitScreen, type WalkSeen } from './helpers/ui-audit';

for (const size of SIZES) {
  test.describe(`UI review sessions ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });
    test.setTimeout(120_000);

    // Practice sessions from Extra oefenen. Tafels gives number pad questions, Apostrof gives choice, find error and typing, Komma gives punctuation.
    for (const [moduleId, topic, label] of [
      ['rekenen-basis', 'optellen', 'oefenen-rekenen'],
      ['cito-taalverzorging', 'apostrof', 'oefenen-taal'],
      ['cito-taalverzorging', 'komma', 'oefenen-komma'],
    ] as const) {
      test(`${label} session screens fit and finish back in the world`, async ({ page }) => {
        await prepare(page);
        await readState(page, 'openPractice');
        await page.locator(`[data-practice-topic="${moduleId}:${topic}"]`).waitFor();
        // The topic button may sit below the fold. A kid scrolls the list, so scroll it into view first.
        await page.locator(`[data-practice-topic="${moduleId}:${topic}"]`).scrollIntoViewIfNeeded();
        await tapCenter(page, `[data-practice-topic="${moduleId}:${topic}"]`);
        await page.locator('.break-screen').waitFor();
        const seen = new Map<string, WalkSeen>();
        await walkSession(page, size.name, label, topic, WANT, seen);
        assertWalkClean(label, size.name, seen, label);

        // The summary has a finish button that goes back to the world.
        if ((await phase(page)) === 'summary') {
          await tapCenter(page, '.summary-done-btn');
          await waitScreen(page, 'world');
          expect(await screen(page), `${label} finished`).toBe('world');
        }
      });
    }

    test('leerpauze session screens fit', async ({ page }) => {
      await prepare(page);
      await readState(page, 'startBreakNow');
      await page.locator('.break-screen').waitFor();
      const seen = new Map<string, WalkSeen>();
      // The break topic is picked by the app. The walker answers with the Taal files when it can.
      await walkSession(page, size.name, 'leerpauze', 'apostrof', new Set([...WANT].filter((k) => k !== 'les')), seen);
      assertWalkClean('leerpauze', size.name, seen, 'leerpauze');
      if ((await phase(page)) === 'summary') {
        await tapCenter(page, '.summary-done-btn');
        await waitScreen(page, 'world');
        expect(await screen(page), 'leerpauze finished').toBe('world');
      }
    });
  });
}
