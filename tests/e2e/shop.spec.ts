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
});
