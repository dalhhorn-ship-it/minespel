// The pill on screen (V22e, AC303, AC306): boxes, one line, a tap does nothing, hidden in every pause state, reduced motion.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { fingerTap } from './helpers/dorp';

const PILL = '[data-testid="bubble-pill"]';
const TEXT = '[data-testid="bubble-pill-text"]';

async function prepare(page: Page, large: boolean): Promise<void> {
  await openApp(page);
  if (large) {
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--font-scale', '1.25');
      document.documentElement.setAttribute('data-large-font', 'true');
    });
  }
  await readState(page, 'setCreatureSeed', 3);
  await readState(page, 'resetPlayTimer', 600);
  await readState(page, 'addKnight', 'stay');
  await readState(page, 'setBubbleClockMs', 400_000);
  await expect(page.locator(TEXT)).toHaveText('Bubbel over 3:20');
}

const box = (page: Page, selector: string) =>
  page.evaluate((s) => {
    const n = document.querySelector(s);
    if (!n || (n as HTMLElement).hidden) return null;
    const r = n.getBoundingClientRect();
    return r.width === 0 ? null : { x: r.x, y: r.y, w: r.width, h: r.height };
  }, selector);

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [large, tag] of [[false, ''], [true, ''], [false, ' @layout'], [true, ' @layout']] as const) {
  test.describe(`The pill on screen${large ? ' with Groter lettertype' : ''}${tag}`, () => {
    test('AC303: during the last 30 s of the break pill it overlaps no HUD box, is one line, a tap mines nothing', async ({ page }) => {
      await prepare(page, large);
      await readState(page, 'setPlayRemainingMs', 25_000);
      await expect(page.locator('[data-testid="countdown-start-now"]')).toBeVisible();
      const pill = (await box(page, PILL))!;
      expect(pill).not.toBeNull();
      const others = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="hud-countdown"], [data-testid="countdown-start-now"], .hud-btn')]
          .filter((n) => (n as HTMLElement).offsetWidth > 0)
          .map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height };
          }),
      );
      expect(others.length).toBeGreaterThan(1);
      for (const o of others) expect(overlap(pill, o)).toBe(false);
      const t = (await box(page, TEXT))!;
      expect(t.h).toBeLessThan(t.w); // one line
      expect(await page.locator(TEXT).evaluate((n) => getComputedStyle(n).whiteSpace)).toBe('nowrap');
      expect(await page.locator(PILL).textContent()).not.toContain('\u23F3');
      const before = await readState<number>(page, 'bubbleClockMs');
      await fingerTap(page, PILL);
      expect(await readState<{ changed?: number }[] | unknown>(page, 'bubbleHud')).toMatchObject({ shown: true, kind: 'clock' });
      expect(Math.abs((await readState<number>(page, 'bubbleClockMs')) - before)).toBeLessThan(2000);
    });
  });
}

test('AC306: each pause state hides the pill and after it the same text is back, the clock not moved', async ({ page }) => {
  await prepare(page, false);
  const clock = () => readState<number>(page, 'bubbleClockMs');
  const states: Array<{ name: string; enter: () => Promise<void>; leave: () => Promise<void> }> = [
    { name: 'pause button', enter: () => readState(page, 'pauseGame'), leave: () => readState(page, 'resumeGame') },
    {
      name: 'pause menu',
      enter: () => readState(page, 'openPauseMenu'),
      leave: () => fingerTap(page, '.pause-btn-primary'),
    },
    {
      name: 'learning break',
      enter: () => readState(page, 'startBreakNow'),
      leave: () => readState(page, 'endBreakByParent'),
    },
  ];
  for (const s of states) {
    const text = await page.locator(TEXT).textContent();
    const at = await clock();
    await s.enter();
    await expect(page.locator(PILL), s.name).toBeHidden();
    await s.leave();
    await expect(page.locator(PILL), s.name).toBeVisible();
    await expect(page.locator(TEXT), s.name).toHaveText(/^Bubbel over \d:\d\d$/);
    expect(text).toMatch(/^Bubbel over \d:\d\d$/);
    // Play time only counts while the game runs: the clock never moved while hidden.
    expect(Math.abs((await clock()) - at), s.name).toBeLessThan(3000);
  }
});

test('AC306: with reduced motion the arrow has no turn transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await prepare(page, false);
  await readState(page, 'spawnBubble');
  await expect(page.locator('[data-testid="bubble-pill-arrow"]')).toBeVisible();
  const dur = await page.locator('[data-testid="bubble-pill-arrow"]').evaluate((n) => getComputedStyle(n).transitionDuration);
  expect(['0s', '']).toContain(dur);
});

test('AC304: without reduced motion the arrow turns by a CSS transition', async ({ page }) => {
  await prepare(page, false);
  await readState(page, 'spawnBubble');
  await expect(page.locator('[data-testid="bubble-pill-arrow"]')).toBeVisible();
  const dur = await page.locator('[data-testid="bubble-pill-arrow"]').evaluate((n) => getComputedStyle(n).transitionDuration);
  expect(dur).not.toBe('0s');
  expect(await page.locator(PILL).evaluate((n) => getComputedStyle(n).animationName)).toBe('none');
});
