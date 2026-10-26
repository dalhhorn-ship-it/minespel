import { expect, test } from '@playwright/test';
import { killApp, openApp, readState } from './helpers/app';

test.describe('Dinowinkel shop (T47, AC20, AC110, AC149, AC150)', () => {
  test('shows greyed cards when points are low, buys 1 egg on 10 fast taps with 45 points, and persists atomically across killApp', async ({
    page,
  }) => {
    await openApp(page);

    // Give 45 points
    await readState(page, 'setPoints', 45);
    await readState(page, 'openShop');

    await expect(page.getByRole('dialog', { name: 'Dinowinkel' })).toBeVisible();
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('45 punten');

    // Brachiosaurus (80) is greyed out and shows "Nog 35 punten nodig" (AC149)
    await expect(page.locator('[data-testid="shop-note-brachiosaurus"]')).toHaveText(
      'Nog 35 punten nodig',
    );

    // Rapidly invoke buyEggInShop 10 times for Triceratops (40 points) -> only 1 bought, 5 points left (AC110)
    const results = await page.evaluate(async () => {
      const hooks = (
        window as unknown as {
          __dino: { buyEggInShop(k: string): Promise<boolean> };
        }
      ).__dino;
      return Promise.all(Array.from({ length: 10 }, () => hooks.buyEggInShop('triceratops')));
    });
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await readState<number>(page, 'points')).toBe(5);

    // Kill app immediately after purchase -> points (5), egg (1), and ledger (-40) all survive atomically (AC150)
    const page2 = await killApp(page);
    expect(await readState<number>(page2, 'points')).toBe(5);
    const eggs = await readState<Array<{ kind: string }>>(page2, 'eggs');
    expect(eggs).toHaveLength(1);
    expect(eggs[0]?.kind).toBe('triceratops');
    const ledger = await readState<Array<{ delta: number; reason: string }>>(page2, 'ledgerLog');
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.delta).toBe(-40);
    expect(ledger[0]?.reason).toBe('shop');
  });

  test('buys one chicken for 5 points with Kopen and Ja, and a chicken needs no egg room (decision 55)', async ({
    page,
  }) => {
    await openApp(page);
    await readState(page, 'setPoints', 9);
    await readState(page, 'openShop');
    await expect(page.locator('[data-testid="shop-chicken-count"]')).toHaveText('Kippen: 0 van de 10');
    await expect(page.locator('[data-testid="shop-deploy-chicken-flock"]')).toHaveCount(0);

    await page.locator('[data-testid="shop-buy-kip"]').click();
    await page.locator('[data-testid="shop-confirm-yes-kip"]').click();
    await expect(page.locator('[data-testid="shop-chicken-count"]')).toHaveText('Kippen: 1 van de 10');
    expect(await readState<number>(page, 'points')).toBe(4);
    // 4 points left: not enough for another one
    await expect(page.locator('[data-testid="shop-note-kip"]')).toHaveText('Nog 1 punt nodig');
    await expect(page.locator('[data-testid="shop-buy-kip"]')).toBeDisabled();

    const ledger = await readState<Array<{ delta: number; reason: string }>>(page, 'ledgerLog');
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: -5, reason: 'shop' });
  });

  test('Inruilen: a hatched dino goes back for half its price, then the kid can buy again (decision 111)', async ({
    page,
  }) => {
    await openApp(page);
    await readState(page, 'addEgg', 'triceratops', false);
    await readState(page, 'stepDinos', 60);
    const [dino] = await readState<Array<{ id: string }>>(page, 'dinos');
    expect(dino).toBeDefined();
    await readState(page, 'setPoints', 0);
    await readState(page, 'openShop');

    const trade = page.locator(`[data-testid="shop-trade-${dino!.id}"]`);
    await expect(trade).toHaveText('Inruilen +20');
    const box = await trade.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await trade.click();
    await page.locator(`[data-testid="shop-trade-yes-${dino!.id}"]`).click();
    await expect(page.locator('[data-testid="shop-toast"]')).toHaveText('Dag Triceratops! Je kreeg 20 punten terug.');
    await expect(page.locator('[data-testid="shop-points"]')).toContainText('20 punten');
    await expect(page.locator('[data-testid="shop-herd-count"]')).toHaveText("\u{1F995} 0 / 25 dino's");
    await expect(page.locator('[data-testid="shop-buy-compy"]')).toBeEnabled();

    const page2 = await killApp(page);
    expect(await readState<number>(page2, 'points')).toBe(20);
    expect(await readState<unknown[]>(page2, 'dinos')).toHaveLength(0);
    const ledger = await readState<Array<{ delta: number; reason: string }>>(page2, 'ledgerLog');
    expect(ledger.at(-1)).toMatchObject({ delta: 20, reason: 'tradein' });
  });

  test('Nu oefenen starts an early break; a countdown break is not early (decision 56)', async ({ page }) => {
    await openApp(page);
    await readState(page, 'setPracticeUsed', 10);
    await page.locator('[data-testid="countdown-start-now"]').click();
    await expect.poll(() => readState<boolean>(page, 'isBreakActive')).toBe(true);
    expect((await readState<{ early?: boolean }>(page, 'breakState')).early).toBe(true);

    // Closing the app during the break: it comes back as an early break
    const page2 = await killApp(page);
    await expect.poll(() => readState<boolean>(page2, 'isBreakActive')).toBe(true);
    expect((await readState<{ early?: boolean }>(page2, 'breakState')).early).toBe(true);
    await readState(page2, 'endBreakByParent');

    await readState(page2, 'startBreakNow');
    expect((await readState<{ early?: boolean }>(page2, 'breakState')).early).toBeFalsy();
    await readState(page2, 'endBreakByParent');
  });
});
