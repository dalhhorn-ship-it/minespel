// Knight safety (V17e, AC207): 3 knights, one per mode, 2 minutes of play. No block changes, the kid is never moved
// by a knight, and the Dinofluit and Allemaal vrij change no knight.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Knight { id: string; mode: string; x: number; y: number; z: number; spot: { x: number; z: number } | null }
interface Pose { x: number; y: number; z: number; yaw: number }

const knights = (page: Page) => readState<Knight[]>(page, 'knights');

/** A fingerprint of every block in a 61 x 61 column area around the kid, from the ground to 20 up. */
async function worldPrint(page: Page, cx: number, cz: number): Promise<string> {
  return page.evaluate(
    ({ cx, cz }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      let h = 2166136261;
      let solid = 0;
      for (let x = Math.floor(cx) - 30; x <= Math.floor(cx) + 30; x++)
        for (let z = Math.floor(cz) - 30; z <= Math.floor(cz) + 30; z++)
          for (let y = 0; y < 32; y++) {
            const id = hooks.blockAt!(x, y, z)!;
            if (id) solid++;
            h = Math.imul(h ^ (id + 1), 16777619) >>> 0;
          }
      return `${h}:${solid}`;
    },
    { cx, cz },
  );
}

async function threeKnights(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 7);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await readState(page, 'addKnight', 'follow');
  await readState(page, 'addKnight', 'stay');
  await readState(page, 'addKnight', 'guard');
  await readState(page, 'fastForward', 3000);
}

test.describe('Knight safety (V17e)', () => {
  test('AC207: 3 knights in all three modes for 2 minutes change no block and never move the kid', async ({ page }) => {
    await threeKnights(page);
    expect((await knights(page)).map((k) => k.mode).sort()).toEqual(['follow', 'guard', 'stay']);
    const before = await readState<Pose>(page, 'player');
    const print = await worldPrint(page, before.x, before.z);
    await readState(page, 'fastForward', 120_000);
    const after = await readState<Pose>(page, 'player');
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.z).toBeCloseTo(before.z, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
    expect(await worldPrint(page, before.x, before.z)).toBe(print);
    expect(await knights(page)).toHaveLength(3);
  });

  test('AC207: the Dinofluit and Allemaal vrij change no knight mode or spot', async ({ page }) => {
    await threeKnights(page);
    await readState(page, 'setPoints', 100);
    await readState(page, 'buyFluitInShop');
    await readState(page, 'addEgg', 'compy', false);
    await readState(page, 'stepDinos', 6);
    const [dino] = await readState<{ id: string }[]>(page, 'dinos');
    await readState(page, 'setDinoMode', dino!.id, 'follow');
    await readState(page, 'stepDinos', 0.1);
    const stay = page.locator('[data-testid="hud-stay"]');
    const fluit = page.locator('[data-testid="hud-fluit"]');
    await expect(fluit).toBeVisible();
    await expect(stay).toBeVisible();
    const before = await knights(page);
    const modes = (ks: Knight[]) => ks.map((k) => `${k.id}:${k.mode}`).sort();

    const f = (await fluit.boundingBox())!;
    await page.touchscreen.tap(f.x + f.width / 2, f.y + f.height / 2);
    expect(modes(await knights(page))).toEqual(modes(before));

    await readState(page, 'stepDinos', 0.1);
    const s = (await stay.boundingBox())!;
    await page.touchscreen.tap(s.x + s.width / 2, s.y + s.height / 2);
    await expect(stay).toBeHidden();
    const after = await knights(page);
    expect(modes(after)).toEqual(modes(before));
    // The stay knight keeps his spot exactly. He strolls a little around it (STAY_RADIUS), so his own x and z are
    // not the spot; the spot is what Allemaal vrij must leave alone.
    const stayBefore = before.find((k) => k.mode === 'stay')!;
    const stayAfter = after.find((k) => k.id === stayBefore.id)!;
    expect(stayBefore.spot).not.toBeNull();
    expect(stayAfter.spot!.x).toBeCloseTo(stayBefore.spot!.x, 5);
    expect(stayAfter.spot!.z).toBeCloseTo(stayBefore.spot!.z, 5);
  });
});
