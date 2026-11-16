// The rules that follow from the v21 gear (V21a, AC285): the banners make a knight notice Klodder from further away.
// The exact distances (11 and 13, 13 and 15, 21 and 23 blocks, also for the mole) are in the unit tests of
// moed.test.ts and mole-moed.test.ts; here the same rule runs in the real app with a knight who stands still (reach 8, 12 and 14).
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Knight { id: string; x: number; y: number; z: number }
interface Monster { phase: string; klodder: { x: number; z: number; pokers: number } | null }

/** One knight who stands still, Klodder out `dist` blocks from him along x; returns how far the knight walked in 1.5 seconds. */
async function walked(page: Page, wear: string | null, dist: number): Promise<number> {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'resetPlayTimer', 3600);
  const id = (await readState<string>(page, 'addKnight', 'stay'))!;
  if (wear) {
    await readState(page, 'setPoints', 500);
    expect(await readState<boolean>(page, 'buyGearInShop', wear)).toBe(true);
    expect(await readState<boolean>(page, 'wearGear', id, wear)).toBe(true);
  }
  const k = (await readState<Knight[]>(page, 'knights')).find((x) => x.id === id)!;
  await readState(page, 'placePlayer', k.x + dist - 4, k.y, k.z, Math.PI / 2);
  expect(await readState(page, 'spawnKlodder')).toBe(true);
  const before = (await readState<Knight[]>(page, 'knights')).find((x) => x.id === id)!;
  const m = await readState<Monster>(page, 'monsterState');
  expect(m.klodder).not.toBeNull();
  await readState(page, 'fastForward', 1500);
  const after = (await readState<Knight[]>(page, 'knights')).find((x) => x.id === id)!;
  return Math.hypot(after.x - before.x, after.z - before.z);
}

test.describe('Banners (V21a)', () => {
  test('AC285: a bare knight 11 blocks from Klodder stays, the Banier at 9.5 and the Koningsbanier at 11 go', async ({ page }) => {
    expect(await walked(page, null, 11)).toBeLessThan(1);
    expect(await walked(page, 'banier', 9.5)).toBeGreaterThan(2);
    expect(await walked(page, 'koningsbanier', 11)).toBeGreaterThan(2);
  });

  test('AC285: the Koningsbanier does not go at 18 blocks and the Banier not at 16', async ({ page }) => {
    expect(await walked(page, 'koningsbanier', 18)).toBeLessThan(1);
    expect(await walked(page, 'banier', 16)).toBeLessThan(1);
  });
});
