import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { openShellFirstTime } from './helpers/gate';

// Dinofluit (decision 114) and Voortgang (decision 115). Real finger taps on the iPad profile.

async function fingerTap(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector);
  await loc.waitFor({ state: 'visible' });
  await loc.scrollIntoViewIfNeeded();
  const box = await loc.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

interface DinoRow {
  id: string;
  mode: string;
  called?: number;
}

test.describe('Dinofluit (decision 114)', () => {
  test('the kid buys the fluit once, the button shows in the world, and a tap calls every dino', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('[data-testid="hud-fluit"]')).toBeHidden();

    await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'stepDinos', 6);
    const [dino] = await readState<DinoRow[]>(page, 'dinos');
    await readState(page, 'setDinoMode', dino!.id, 'stay');

    await readState(page, 'setPoints', 100);
    await fingerTap(page, '[data-testid="hud-winkel"]');
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('100 punten');
    await fingerTap(page, '[data-testid="shop-buy-fluit"]');
    await fingerTap(page, '[data-testid="shop-confirm-yes-fluit"]');
    await expect(page.locator('[data-testid="shop-fluit-owned"]')).toBeVisible();
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('40 punten');
    await expect(page.locator('[data-testid="shop-buy-fluit"]')).toHaveCount(0);
    const ledger = await readState<{ delta: number; reason: string }[]>(page, 'ledgerLog');
    expect(ledger.filter((l) => l.reason === 'shop')).toEqual([expect.objectContaining({ delta: -60 })]);

    await fingerTap(page, '.shop-close-btn');
    const fluit = page.locator('[data-testid="hud-fluit"]');
    await expect(fluit).toBeVisible();
    const box = (await fluit.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(56);
    expect(box.height).toBeGreaterThanOrEqual(56);

    await fingerTap(page, '[data-testid="hud-fluit"]');
    const after = await readState<DinoRow[]>(page, 'dinos');
    expect(after[0]?.mode).toBe('follow');
    expect(after[0]?.called ?? 0).toBeGreaterThan(0);
    expect(await readState<string>(page, 'currentScreen')).toBe('world');

    // Owned stays owned after a reload.
    await readState(page, 'flushSave');
    await page.reload();
    await openApp(page);
    await expect(page.locator('[data-testid="hud-fluit"]')).toBeVisible();
  });
});

test.describe('Voortgang (decision 115)', () => {
  test('the parent sees the week report, the charts, the topics and the hard questions', async ({ page }) => {
    await openApp(page);
    const today = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const rows = Array.from({ length: 6 }, (_, i) => ({
      ts: Date.now() - i * 1000, day: today, context: 'break', sessionId: 's', moduleId: 'rekenen-basis', topic: 'tafels',
      skill: 'x', level: 'E6', itemId: i < 2 ? 'som-hard' : `som-${i}`, try: 1, correct: i >= 2, given: '42', ms: 4000,
    }));
    await readState(page, 'logAnswers', rows);

    await openShellFirstTime(page);
    await page.locator('.parent-nav-btn[data-section="voortgang"]').tap();
    const report = page.locator('[data-testid="progress-week-report"]');
    await expect(report).toBeVisible();
    await expect(report).toContainText('6 vragen beantwoord');
    await expect(page.locator('[data-testid="progress-tile-pct"] .progress-tile-value')).toHaveText(/^67%/);
    for (const id of ['progress-chart-pct', 'progress-chart-questions', 'progress-chart-days']) {
      await expect(page.locator(`[data-testid="${id}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-testid="progress-topics"] tbody tr')).toHaveCount(1);
    await expect(page.locator('[data-testid="progress-hard"] li').first()).toContainText('2× fout');
    // The charts fit the pane: no sideways scroll.
    const overflow = await page.locator('.parent-main').evaluate((m) => m.scrollWidth - m.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
