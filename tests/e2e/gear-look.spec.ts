// Gear on the 3D knight (V19d, AC264): the mesh cap with all 5 slots and the shared geometry of one gear set.
// Needs real WebGL like context-loss.spec.ts; the unit tests in src/render/knight-model.test.ts cover the rest.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState, waitFrames } from './helpers/app';

interface KnightMeshes { id: string; look: string; meshes: number; geometries: string[]; names: string[] }

const FULL = ['leren-kap', 'houten-schild', 'riddercape', 'kietelveer', 'pony'];

async function dress(page: Page, knight: string): Promise<void> {
  for (const id of FULL) expect(await readState<boolean>(page, 'wearGear', knight, id)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  test.skip(!(await readState<boolean>(page, 'usesRealRenderer')), 'No WebGL here: see the unit tests in src/render.');
});

test('AC264: a knight in full gear has at most 6 meshes and rides the Pony', async ({ page }) => {
  const a = await readState<string>(page, 'addKnight', 'follow');
  await readState(page, 'setPoints', 500);
  for (const id of FULL) expect(await readState<boolean>(page, 'buyGearInShop', id)).toBe(true);
  await dress(page, a);
  await waitFrames(page, 10);
  await expect
    .poll(async () => (await readState<KnightMeshes[]>(page, 'knightMeshes')).filter((k) => k.look !== '').length)
    .toBe(1);
  const [ka] = (await readState<KnightMeshes[]>(page, 'knightMeshes')).filter((k) => k.look !== '');
  expect(ka!.meshes).toBeLessThanOrEqual(6);
  expect(ka!.names).toContain('mount');
  expect(ka!.look.split('+').sort()).toEqual([...FULL].sort());
});

test('AC264: two knights with the same gear set (bare) share one geometry', async ({ page }) => {
  await readState<string>(page, 'addKnight', 'follow');
  await readState<string>(page, 'addKnight', 'follow');
  await waitFrames(page, 10);
  await expect.poll(async () => (await readState<KnightMeshes[]>(page, 'knightMeshes')).length).toBe(2);
  const [x, y] = await readState<KnightMeshes[]>(page, 'knightMeshes');
  expect(x!.geometries).toEqual(y!.geometries);
});

test('AC264: a bare knight and a dressed knight do not share a geometry', async ({ page }) => {
  const a = await readState<string>(page, 'addKnight', 'follow');
  await readState<string>(page, 'addKnight', 'follow');
  await readState(page, 'setPoints', 100);
  expect(await readState<boolean>(page, 'buyGearInShop', 'riddercape')).toBe(true);
  expect(await readState<boolean>(page, 'wearGear', a, 'riddercape')).toBe(true);
  await waitFrames(page, 10);
  await expect.poll(async () => new Set((await readState<KnightMeshes[]>(page, 'knightMeshes')).map((k) => k.look)).size).toBe(2);
  const list = await readState<KnightMeshes[]>(page, 'knightMeshes');
  expect(list[0]!.geometries[0]).not.toBe(list[1]!.geometries[0]);
});
