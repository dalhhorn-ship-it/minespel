import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// T51e: the HUD "Winkel" button (AC160, AC161, AC162) and a Pauze and Winkel that open at once,
// even when saved data is slow or never answers (AC163, AC164). Real finger taps, no fixed sleeps.

const SAFE = { top: 24, bottom: 20, left: 0, right: 0 };

async function setSafeArea(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `:root{--safe-top:${SAFE.top}px;--safe-bottom:${SAFE.bottom}px;--safe-left:${SAFE.left}px;--safe-right:${SAFE.right}px}`,
  });
}

async function fingerTap(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector);
  await loc.waitFor({ state: 'visible' });
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

/** Starts timing: remembers when the finger lifted and when a dialog first showed. Read with dialogDelay. */
async function watchDialog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __tapAt?: number; __shownAt?: number };
    w.__tapAt = undefined;
    w.__shownAt = undefined;
    document.addEventListener('pointerup', () => (w.__tapAt ??= performance.now()), { capture: true });
    const check = () => {
      if (w.__shownAt === undefined && document.querySelector('[role="dialog"]')) w.__shownAt = performance.now();
    };
    new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
  });
}

async function dialogDelay(page: Page): Promise<number> {
  await page.waitForFunction(() => (window as unknown as { __shownAt?: number }).__shownAt !== undefined);
  return page.evaluate(() => {
    const w = window as unknown as { __tapAt: number; __shownAt: number };
    return w.__shownAt - w.__tapAt;
  });
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

test.describe('Winkel button in the world (AC160, AC161)', () => {
  test('a finger on Winkel opens the Dinowinkel, and Sluiten goes back to the world, not the pause menu', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPoints', 45);
    await fingerTap(page, '[data-testid="hud-winkel"]');
    await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('45 punten');
    expect(await readState<string>(page, 'currentScreen')).toBe('kid-overlay');
    await fingerTap(page, '.shop-close-btn');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
  });

  test('the pause menu keeps its Dinowinkel button', async ({ page }) => {
    await openApp(page);
    await fingerTap(page, '[data-testid="hud-pause"]');
    await expect(page.getByRole('dialog', { name: 'Pauze' })).toBeVisible();
    await page.locator('.pause-btn', { hasText: 'Dinowinkel' }).click();
    await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
  });

  test('the Winkel button is covered by a break, so a finger cannot reach it (AC160)', async ({ page }) => {
    await openApp(page);
    await readState(page, 'startBreakNow');
    await page.locator('.break-screen').waitFor();
    const reachable = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="hud-winkel"]')!.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!top?.closest('[data-testid="hud-winkel"]');
    });
    expect(reachable).toBe(false);
  });
});

test.describe('Winkel layout (AC162)', () => {
  for (const size of [
    { name: '1024x768', width: 1024, height: 768 },
    { name: '1180x820', width: 1180, height: 820 },
    { name: '1024x690 Safari tab', width: 1024, height: 690 },
  ]) {
    test(`countdown, Winkel, Pauze and lock do not overlap and sit in the safe area at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openApp(page);
      await setSafeArea(page);
      const sel = {
        countdown: '.hud-countdown',
        winkel: '[data-testid="hud-winkel"]',
        pause: '[data-testid="hud-pause"]',
        lock: '.hud [data-testid="parent-controls-btn"]',
      };
      const boxes: Record<string, { x: number; y: number; width: number; height: number }> = {};
      for (const [k, s] of Object.entries(sel)) {
        await expect(page.locator(s)).toBeVisible();
        boxes[k] = (await page.locator(s).boundingBox())!;
      }
      const names = Object.keys(boxes);
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          expect(overlaps(boxes[names[i]!]!, boxes[names[j]!]!), `${names[i]} overlaps ${names[j]}`).toBe(false);
        }
      }
      for (const k of ['winkel', 'pause', 'lock']) {
        const b = boxes[k]!;
        expect(b.width, `${k} width`).toBeGreaterThanOrEqual(44);
        expect(b.height, `${k} height`).toBeGreaterThanOrEqual(44);
        expect(b.y, `${k} top`).toBeGreaterThanOrEqual(SAFE.top);
        expect(b.x + b.width, `${k} right`).toBeLessThanOrEqual(size.width - SAFE.right);
      }
      expect(boxes.winkel!.width).toBeCloseTo(boxes.pause!.width, 0);
      expect(boxes.winkel!.height).toBeCloseTo(boxes.pause!.height, 0);
      expect(boxes.winkel!.x + boxes.winkel!.width).toBeLessThanOrEqual(boxes.pause!.x);
    });
  }
});

test.describe('Pauze and Winkel with saved data that never answers (AC163, AC164)', () => {
  test.beforeEach(async ({ page }) => {
    // Storage that never opens: boot gives up after 3 s, the flows are never created.
    await page.addInitScript(() => {
      IDBFactory.prototype.open = function () {
        return {} as IDBOpenDBRequest;
      };
    });
  });

  test('one finger on Pauze opens the pause menu within 300 ms, with a points placeholder', async ({ page }) => {
    await openApp(page);
    await watchDialog(page);
    await fingerTap(page, '[data-testid="hud-pause"]');
    expect(await dialogDelay(page)).toBeLessThan(300);
    await expect(page.getByRole('dialog', { name: 'Pauze' })).toBeVisible();
    await expect(page.locator('[data-testid="pause-points"]')).toContainText('\u{2026}');
    await fingerTap(page, '.pause-btn-primary');
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
  });

  test('one finger on Winkel opens the Dinowinkel within 300 ms with a placeholder and no Kopen to tap', async ({ page }) => {
    await openApp(page);
    await watchDialog(page);
    await fingerTap(page, '[data-testid="hud-winkel"]');
    expect(await dialogDelay(page)).toBeLessThan(300);
    await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('\u{2026}');
    const buy = page.locator('.shop-buy-btn');
    expect(await buy.count()).toBeGreaterThan(0);
    for (const b of await buy.all()) await expect(b).toBeDisabled();
    await fingerTap(page, '.shop-close-btn');
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
  });

  test('Dinowinkel from the pause menu also opens at once', async ({ page }) => {
    await openApp(page);
    await fingerTap(page, '[data-testid="hud-pause"]');
    await page.getByRole('dialog', { name: 'Pauze' }).waitFor();
    await fingerTap(page, '.pause-btn:has-text("Dinowinkel")');
    await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
  });
});
