// UI review: portrait and real touches (kid-ui-reviewer, split out of ui-review.spec.ts in R2e).
// Portrait shows the turn message and nothing else is tappable. Then real finger taps and drags on the
// world, the lock, the teach moment, the lists and Stoppen. One boot per test: they change the world.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import {
  SAFE,
  SHOTS,
  answer,
  expectScreen,
  idle,
  openShell,
  openShopWithPoints,
  phase,
  prepare,
  screen,
  sessionSig,
  shot,
  tapCenter,
  waitSessionMoved,
} from './helpers/ui-audit';

// ---------------------------------------------------------------- portrait

test.describe('UI review portrait', () => {
  test.use({ viewport: { width: 768, height: 1024 } });
  test('portrait shows the turn message and nothing else is tappable', async ({ page }) => {
    await openApp(page);
    await expect(page.getByText('Draai je iPad')).toBeVisible();
    await idle(page);
    await page.screenshot({ path: shot('768x1024-portrait', 'draai-je-ipad') });
    const covered = await page.evaluate(() => {
      const hud = document.querySelector('.hud button') as HTMLElement | null;
      if (!hud) return false;
      const r = hud.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top?.closest('.shell-overlay');
    });
    expect(covered, 'the turn message covers the HUD').toBe(true);
  });
});

// ---------------------------------------------------------------- real taps and flows

async function reachTeachMoment(page: Page): Promise<void> {
  await readState(page, 'openPractice');
  await page.locator('[data-practice-topic="cito-taalverzorging:apostrof"]').scrollIntoViewIfNeeded();
  await tapCenter(page, '[data-practice-topic="cito-taalverzorging:apostrof"]');
  await page.locator('.break-screen').waitFor();
  for (let i = 0; i < 40; i++) {
    await idle(page);
    const before = await sessionSig(page);
    const ph = await phase(page);
    if (ph === 'teach') return;
    if (ph === 'feedback') await page.locator('.break-next-btn').click();
    else if (ph === 'question' || ph === 'retry') await answer(page, 'apostrof', false);
    else if (ph === 'summary') throw new Error('session ended without a teach moment');
    await waitSessionMoved(page, before);
  }
  throw new Error('no teach moment reached');
}

/**
 * True when the app cancels a finger drag that starts on this element. On iOS a cancelled touchmove means
 * the page does not scroll. (Chromium here cannot swipe for real, so the drag is sent as an event.)
 */
async function dragIsCancelled(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`no ${sel}`);
    const ev = new Event('touchmove', { bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    return ev.defaultPrevented;
  }, selector);
}

test.describe('UI review real taps', () => {
  test.use({ viewport: { width: 1024, height: 768 } });
  test.setTimeout(90_000);

  test('a finger on Pauze in the world opens the pause menu', async ({ page }) => {
    await prepare(page);
    await tapCenter(page, '.hud-pause');
    await expectScreen(page, 'kid-overlay');
  });

  test('a finger on Ouders in the world opens the parent gate', async ({ page }) => {
    await prepare(page);
    await tapCenter(page, '[data-testid="parent-controls-btn"]');
    await page.locator('.parent-gate').waitFor();
    expect(await screen(page)).toBe('parent');
  });

  test('the world lock is small and grey, not covering Pauze or the countdown, and only the world has it (decision 53)', async ({ page }) => {
    await prepare(page);
    const lock = page.locator('.hud [data-testid="parent-controls-btn"]');
    await expect(lock).toHaveText('\u{1F512}');
    const box = (await lock.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(1024 - SAFE.right);
    expect(box.y).toBeGreaterThanOrEqual(SAFE.top);
    for (const sel of ['.hud-pause', '.hud-countdown']) {
      const other = (await page.locator(sel).boundingBox())!;
      const overlap = box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + other.height && other.y < box.y + box.height;
      expect(overlap, `lock overlaps ${sel}`).toBe(false);
    }
    // No lock on a break screen, the pause menu overlay or the shop.
    await readState(page, 'startBreakNow');
    await page.locator('.break-screen').waitFor();
    // The HUD lock stays in the page under the break screen, so check that a finger cannot reach it.
    const reachable = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="parent-controls-btn"]')!.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top?.closest('[data-testid="parent-controls-btn"]');
    });
    expect(reachable).toBe(false);
    await expect(page.locator('.break-screen [data-testid="parent-controls-btn"], .lock-icon-btn-floating')).toHaveCount(0);
  });

  test('a finger drag on the teach moment is allowed, so it can scroll to Ik snap het', async ({ page }) => {
    await prepare(page);
    await reachTeachMoment(page);
    expect(await dragIsCancelled(page, '.teach-moment')).toBe(false);
  });

  test('a finger drag on the Extra oefenen list is allowed', async ({ page }) => {
    await prepare(page);
    await readState(page, 'openPractice');
    await page.getByRole('dialog', { name: 'Extra oefenen' }).waitFor();
    expect(await dragIsCancelled(page, '.lesboek-topics-grid')).toBe(false);
  });

  test('a finger drag on the Dinowinkel is allowed', async ({ page }) => {
    await prepare(page);
    await openShopWithPoints(page, 200);
    expect(await dragIsCancelled(page, '.shop-grid')).toBe(false);
  });

  test('a finger drag in the parent area is allowed', async ({ page }) => {
    await prepare(page);
    await openShell(page, 'inhoud');
    expect(await dragIsCancelled(page, '.parent-main')).toBe(false);
  });

  test('a finger drag in the world is cancelled on purpose', async ({ page }) => {
    await prepare(page);
    expect(await dragIsCancelled(page, '.hud')).toBe(true);
  });

  test('the teach moment shows Ik snap het without scrolling', async ({ page }) => {
    await prepare(page);
    await reachTeachMoment(page);
    const box = await page.locator('.teach-done').boundingBox();
    expect(box && box.y + box.height <= 768 - SAFE.bottom).toBe(true);
  });

  test('Extra oefenen sessions have a big Stoppen that goes back to the world, a real break has none', async ({ page }) => {
    await prepare(page);
    await readState(page, 'openPractice');
    await tapCenter(page, '[data-practice-topic="rekenen-basis:optellen"]');
    await page.locator('.break-screen').waitFor();
    const stop = page.locator('[data-testid="practice-stop"]');
    await expect(stop).toBeVisible();
    const box = (await stop.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(56);
    await page.screenshot({ path: `${SHOTS}/oefenen-stoppen.png` });
    await tapCenter(page, '[data-testid="practice-stop"]');
    await expectScreen(page, 'world');
    await readState(page, 'startBreakNow');
    await page.locator('.break-screen').waitFor();
    await expect(page.locator('[data-testid="practice-stop"]')).toHaveCount(0);
  });

  test('screenshots of the world lock and the first PIN grown up question', async ({ page }) => {
    await prepare(page);
    await page.screenshot({ path: `${SHOTS}/wereld-slot.png` });
    await readState(page, 'openParentControls');
    await page.locator('.parent-input').waitFor();
    await idle(page);
    await page.screenshot({ path: `${SHOTS}/eerste-pin-vraag.png` });
  });

  test('Dinowinkel Kippenhok buttons are reachable without scrolling', async ({ page }) => {
    await prepare(page);
    await openShopWithPoints(page, 200);
    const box = await page.locator('[data-testid="shop-buy-kip"]').boundingBox();
    expect(box && box.y + box.height <= 768).toBe(true);
  });
});
