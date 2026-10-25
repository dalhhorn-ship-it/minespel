// UI review: whole practice and break sessions (kid-ui-reviewer, split out of ui-review.spec.ts in R2e).
// Each test plays one session from the first screen to the summary, saves one screenshot of every new
// phase and question type, and runs the same audit as the per screen checks on each of them.
// One boot per test: a session ends with changes in the world, so it does not share a page.
import { expect, test } from '@playwright/test';
import { readState } from './helpers/app';
import {
  SIZES,
  WANT,
  expectScreen,
  isKnown,
  phase,
  prepare,
  tapCenter,
  walkSession,
  type Finding,
  type WalkSeen,
} from './helpers/ui-audit';

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
        const all: Finding[] = [];
        for (const s of seen.values()) for (const f of s.findings) if (!isKnown(`${label}-${s.key}`, size.name, f)) all.push({ ...f, el: `[${s.key}] ${f.el}` });
        const unknown = all;
        const grouped = new Map<string, string[]>();
        for (const f of unknown) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
        for (const [kind, list] of grouped) expect.soft(list, `${kind} in ${label} at ${size.name}`).toEqual([]);

        // The summary has a finish button that goes back to the world.
        if ((await phase(page)) === 'summary') {
          await tapCenter(page, '.summary-done-btn');
          await expectScreen(page, 'world', `${label} finished`);
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
      const all: Finding[] = [];
      for (const s of seen.values()) for (const f of s.findings) if (!isKnown(`leerpauze-${s.key}`, size.name, f)) all.push({ ...f, el: `[${s.key}] ${f.el}` });
      const unknown = all;
      const grouped = new Map<string, string[]>();
      for (const f of unknown) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), `${f.el}: ${f.detail}`]);
      for (const [kind, list] of grouped) expect.soft(list, `${kind} in leerpauze at ${size.name}`).toEqual([]);
      if ((await phase(page)) === 'summary') {
        await tapCenter(page, '.summary-done-btn');
        await expectScreen(page, 'world', 'leerpauze finished');
      }
    });
  });
}
