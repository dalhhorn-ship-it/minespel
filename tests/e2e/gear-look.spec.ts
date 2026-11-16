// Gear on the 3D knight (V19d, V21b, AC264, AC286, AC287): the mesh cap with all 8 slots and the shared geometry of one gear set.
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

const ALL_13 = ['houten-zwaard', 'snelle-laarzen', 'banier', 'malienkolder', 'koningscape', 'pluimhelm', 'koningsbanier', 'drakenschild', 'glanzend-harnas', 'bubbelstaf', 'gouden-helm', 'strijdpaard', 'rij-triceratops'];
const EIGHT = ['pluimhelm', 'drakenschild', 'bubbelstaf', 'koningscape', 'glanzend-harnas', 'snelle-laarzen', 'koningsbanier'];

async function buyAll(page: Page): Promise<void> {
  await readState(page, 'setPoints', 5000);
  for (const id of ALL_13) expect(await readState<boolean>(page, 'buyGearInShop', id)).toBe(true);
}

test('AC287: a knight with an item in all 8 slots has at most 6 meshes, on the horse and on the triceratops', async ({ page }) => {
  const a = await readState<string>(page, 'addKnight', 'follow');
  await buyAll(page);
  for (const mount of ['strijdpaard', 'rij-triceratops']) {
    for (const id of [...EIGHT, mount]) expect(await readState<boolean>(page, 'wearGear', a, id)).toBe(true);
    await waitFrames(page, 10);
    await expect.poll(async () => (await readState<KnightMeshes[]>(page, 'knightMeshes')).filter((k) => k.look.split('+').length === 8).length).toBe(1);
    const [k] = (await readState<KnightMeshes[]>(page, 'knightMeshes')).filter((x) => x.look !== '');
    expect(k!.meshes).toBeLessThanOrEqual(6);
    expect(k!.names.filter((n) => n === 'mount')).toHaveLength(1);
    expect(k!.look.split('+')).toContain(mount);
  }
});

test('AC286, AC287: a tap on the mounted knight with the Bubbelstaf spawns nothing and the dino list does not change', async ({ page }) => {
  await readState(page, 'setCreatureSeed', 4);
  const a = await readState<string>(page, 'addKnight', 'follow');
  await buyAll(page);
  const before = JSON.stringify(await readState<{ id: string }[]>(page, 'dinos'));
  for (const id of ['bubbelstaf', 'rij-triceratops']) expect(await readState<boolean>(page, 'wearGear', a, id)).toBe(true);
  await waitFrames(page, 10);
  const box = (await page.locator('canvas').first().boundingBox())!;
  for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.6], [0.45, 0.55]] as const) {
    await page.touchscreen.tap(box.x + box.width * fx, box.y + box.height * fy);
    await waitFrames(page, 5);
  }
  const after = await readState<{ id: string }[]>(page, 'dinos');
  expect(after.length).toBe(JSON.parse(before).length);
  expect(JSON.stringify(after.map((d) => d.id).sort())).toBe(JSON.stringify((JSON.parse(before) as { id: string }[]).map((d) => d.id).sort()));
});
