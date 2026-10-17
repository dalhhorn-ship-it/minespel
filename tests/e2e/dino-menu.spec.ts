import { expect, test } from '@playwright/test';
import { EGG_HATCH_SECONDS } from '../../src/dinos/egg';
import { openApp, readState } from './helpers/app';

test.describe('dino menu and naming (T45, AC16, AC18, AC23)', () => {
  test('opens dino menu, pauses play timer, names dino with kid keyboard, and gives a knuffel', async ({
    page,
  }) => {
    await openApp(page);

    await readState(page, 'addEgg', 'triceratops', false);
    await readState(page, 'stepDinos', EGG_HATCH_SECONDS + 0.2);
    const dinos = await readState<Array<{ id: string; name: string }>>(page, 'dinos');
    expect(dinos).toHaveLength(1);
    const dinoId = dinos[0]!.id;

    // Open dino menu -> screen is kid-overlay (timer paused, AC23)
    await readState(page, 'openDinoMenuFor', dinoId);
    expect(await readState<string>(page, 'currentScreen')).toBe('kid-overlay');
    await expect(page.getByRole('dialog', { name: 'Dino menu' })).toBeVisible();

    // Tap Knuffel
    await page.getByRole('button', { name: /Knuffel/ }).click();
    await expect(page.locator('.dino-menu-status')).toContainText('Wat een fijne knuffel!');

    // Tap Naam geven -> kid keyboard opens with "Bedenk een leuke dinonaam" (AC18)
    await page.getByRole('button', { name: 'Naam geven' }).click();
    await expect(page.locator('.name-screen-subtitle')).toHaveText('Bedenk een leuke dinonaam');

    // Type "Trix" on the kid keyboard and save
    for (const ch of ['t', 'r', 'i', 'x']) {
      await page.locator('.kb-char', { hasText: new RegExp(`^${ch}$`) }).click();
    }
    await page.getByRole('button', { name: 'Opslaan' }).click();

    await expect(page.locator('.dino-menu-title')).toContainText('trix (Triceratops)');
    const updatedDinos = await readState<Array<{ id: string; name: string }>>(page, 'dinos');
    expect(updatedDinos[0]?.name).toBe('trix');
  });
});
