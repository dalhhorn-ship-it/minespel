// Who a knight on Pas op de dieren guards (v22, AC331, AC333): at most the 4 nearest target animals, never one animal
// by two knights, and nobody by a knight on another mode. Read through the `guardState` hook.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { hatch } from './helpers/mole';

interface Entry { animalId: string; knightId: string }

async function start(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
}

const guards = (page: Page) => readState<Entry[]>(page, 'guardState');

test.describe('Guard knights (v22)', () => {
  test('AC331: one guard knight with 7 animals around him guards exactly 4', async ({ page }) => {
    await start(page);
    const knight = (await readState<string | null>(page, 'addKnight', 'guard'))!;
    const dinos = await hatch(page, 7);
    await expect.poll(async () => (await guards(page)).length, { timeout: 5000 }).toBe(4);
    const state = await guards(page);
    expect(state.every((e) => e.knightId === knight)).toBe(true);
    const ids = new Set(dinos.map((d) => d.id));
    for (const e of state) expect(ids.has(e.animalId)).toBe(true);
    expect(new Set(state.map((e) => e.animalId)).size).toBe(4);
  });

  test('AC331: 3 guard knights with 12 or more animals guard exactly 12, no animal twice', async ({ page }) => {
    await start(page);
    for (let i = 0; i < 3; i++) await readState(page, 'addKnight', 'guard');
    await hatch(page, 14);
    await expect.poll(async () => (await guards(page)).length, { timeout: 5000 }).toBe(12);
    const state = await guards(page);
    expect(new Set(state.map((e) => e.animalId)).size).toBe(12);
    for (const k of new Set(state.map((e) => e.knightId))) expect(state.filter((e) => e.knightId === k)).toHaveLength(4);
  });

  test('AC331: knights on Blijf hier, Volg mij and Jaag monsters weg guard nobody', async ({ page }) => {
    await start(page);
    for (const mode of ['stay', 'follow', 'chase']) await readState(page, 'addKnight', mode);
    await hatch(page, 5);
    await readState(page, 'fastForward', 3000);
    expect(await guards(page)).toEqual([]);
  });
});
