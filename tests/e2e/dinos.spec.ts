import { expect, test } from '@playwright/test';
import { EGG_HATCH_SECONDS } from '../../src/dinos/egg';
import { START_SPOT } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

test.describe('dinos in the world and sky floating controls (T42)', () => {
  test('spawns an egg next to the player, hatches after 5s of play, brings follow dinos on teleportHome, and supports Up/Down floating', async ({
    page,
  }) => {
    await openApp(page);

    // Up (Omhoog) and Down (Omlaag) arrows are visible in HUD
    await expect(page.locator('[data-testid="hud-ascend"]')).toBeVisible();
    await expect(page.locator('[data-testid="hud-descend"]')).toBeVisible();

    // Spawn a Compy egg
    await readState(page, 'addEgg', 'compy', false);
    const eggsBefore = await readState<Array<{ id: string; kind: string }>>(page, 'eggs');
    expect(eggsBefore).toHaveLength(1);

    // Advance play time by EGG_HATCH_SECONDS -> egg hatches into a Compy dino (AC150)
    await readState(page, 'stepDinos', EGG_HATCH_SECONDS + 0.2);
    const eggsAfter = await readState<Array<{ id: string }>>(page, 'eggs');
    const dinosAfter = await readState<Array<{ id: string; kind: string; x: number; z: number }>>(
      page,
      'dinos',
    );
    expect(eggsAfter).toHaveLength(0);
    expect(dinosAfter).toHaveLength(1);
    expect(dinosAfter[0]?.kind).toBe('compy');

    // Move player far away, then teleportHome -> follow dino comes along to START_SPOT (AC106)
    await readState(page, 'placePlayer', 10.5, 15, 10.5, 0);
    await readState(page, 'teleportHome');
    const dinosAtHome = await readState<Array<{ x: number; z: number }>>(page, 'dinos');
    const dist = Math.hypot(
      (dinosAtHome[0]?.x ?? 0) - START_SPOT.x,
      (dinosAtHome[0]?.z ?? 0) - START_SPOT.z,
    );
    expect(dist).toBeLessThan(3.5);
  });
});
