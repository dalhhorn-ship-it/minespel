import { expect, test, type Page } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

const leftMs = (page: Page) => readState<number>(page, 'playMsLeft');
const timerReady = (page: Page) => page.waitForFunction(() => (window as unknown as { __dino: Record<string, () => unknown> }).__dino.playMsLeft?.() != null);

/** Opens the app with a controllable clock. After this, time only moves with runFor and fastForward. */
async function openWithClock(page: Page): Promise<void> {
  await page.clock.install();
  await openApp(page);
  await timerReady(page);
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await readState(page, 'pauseGame'); // fewer frames to run while time jumps
}

test.describe('play timer', () => {
  test('counts down 60 seconds in 60 seconds, shown at the top (AC22)', async ({ page }) => {
    await openWithClock(page);
    const before = await leftMs(page);
    expect(await readState<string>(page, 'countdownText')).toMatch(/^Leerpauze over \d:\d\d$/);
    await page.clock.runFor(60_000);
    const after = await leftMs(page);
    expect(before - after).toBeGreaterThanOrEqual(59_000);
    expect(before - after).toBeLessThanOrEqual(61_000);
    expect(await readState<string>(page, 'countdownText')).toBe(`Leerpauze over ${Math.floor(Math.ceil(after / 1000) / 60)}:${String(Math.ceil(after / 1000) % 60).padStart(2, '0')}`);
  });

  test('stops while an overlay, the parent area, the background or a small window is there (AC23, AC108, AC112)', async ({ page }) => {
    await openWithClock(page);
    await page.clock.runFor(2000);
    const start = await leftMs(page);
    for (const kind of ['kid-overlay', 'parent', 'learn']) {
      const id = await readState<number>(page, 'openScreen', kind);
      expect(await readState<boolean>(page, 'timerCounting')).toBe(false);
      await page.clock.runFor(10_000);
      await readState(page, 'closeScreen', id);
    }
    expect(await leftMs(page)).toBe(start);
    // Too small window.
    const size = page.viewportSize() ?? { width: 1024, height: 768 };
    const guardIs = (tooSmall: boolean) =>
      page.waitForFunction((v) => (window as unknown as { __dino: Record<string, () => { tooSmall: boolean }> }).__dino.screenGuard!().tooSmall === v, tooSmall);
    await page.setViewportSize({ width: 800, height: 600 });
    await guardIs(true);
    await page.clock.runFor(10_000);
    await page.setViewportSize(size);
    await guardIs(false);
    // Lost focus.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.clock.runFor(10_000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect(await leftMs(page)).toBe(start);
    await page.clock.runFor(5000);
    expect(start - (await leftMs(page))).toBeGreaterThanOrEqual(4000);
  });

  test('a 60 second jump between two heartbeats is not counted (AC113)', async ({ page }) => {
    await openWithClock(page);
    await page.clock.runFor(2000);
    const start = await leftMs(page);
    await page.clock.fastForward(60_000);
    await page.clock.runFor(1000);
    expect(start - (await leftMs(page))).toBeLessThanOrEqual(2000);
  });

  test('the time left survives a kill (AC24)', async ({ page }) => {
    await openWithClock(page);
    await page.clock.runFor(150_000);
    await page.clock.runFor(2000); // the queue writes within about 1 second
    const before = await leftMs(page);
    const fresh = await killApp(page);
    await timerReady(fresh);
    const after = await leftMs(fresh);
    expect(after).toBeLessThanOrEqual(before + 5000);
    expect(after).toBeGreaterThanOrEqual(before - 500);
  });

  test('the last 30 seconds grow and pulse, reduced motion keeps only the growing (AC25, AC142)', async ({ page }) => {
    await openWithClock(page);
    await page.clock.runFor(200_000);
    const label = page.locator('.countdown');
    await expect(label).not.toHaveClass(/countdown-warning/);
    const left = await leftMs(page);
    await page.clock.runFor(left - 20_000);
    await expect(label).toHaveClass(/countdown-warning/);
    const css = await label.evaluate((n) => {
      const s = getComputedStyle(n);
      return { animation: s.animationName, transform: s.transform };
    });
    expect(css.animation).toBe('countdown-pulse');
    expect(css.transform).not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await label.evaluate((n) => getComputedStyle(n).animationName);
    expect(reduced).toBe('none');
  });

  test('at 0 it saves, stops the world and opens a break nobody can close; the break comes back after a kill (AC26)', async ({ page }) => {
    await openWithClock(page);
    const left = await leftMs(page);
    await page.clock.runFor(left - 1500); // the world is paused here, so this is quick
    await readState(page, 'resumeGame');
    expect(await readState<boolean>(page, 'gameRunning')).toBe(true);
    await page.clock.runFor(2500);
    expect(await readState<boolean>(page, 'breakActive')).toBe(true);
    expect(await readState<string>(page, 'currentScreen')).toBe('learn');
    expect(await readState<boolean>(page, 'gameRunning')).toBe(false);
    expect(await leftMs(page)).toBe(0);
    await page.locator('.break-stub').waitFor();
    await expect(page.locator('.break-stub button')).toHaveCount(0);
    const fresh = await killApp(page);
    await timerReady(fresh);
    expect(await readState<boolean>(fresh, 'breakActive')).toBe(true);
    await readState(fresh, 'endBreak');
    expect(await readState<boolean>(fresh, 'breakActive')).toBe(false);
    expect(await readState<number>(fresh, 'playMsLeft')).toBe(300_000);
  });
});

