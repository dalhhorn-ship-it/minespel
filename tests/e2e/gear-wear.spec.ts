// The Uitrusten screen (V19c, AC261): the flat picture, wear, replace, take off, "Bij Ridder N" and move,
// the state after a reload, one canvas only, the play timer stopped and no block changed by taps on the screen.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);

interface GearState {
  owned: string[];
  worn: Record<string, Record<string, string>>;
  knights: { id: string; worn: Record<string, string> }[];
}
interface Knight { id: string; x: number; y: number; z: number }

const gear = (page: Page) => readState<GearState>(page, 'gearState');

async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 10; x <= c + 10; x++)
        for (let z = c - 10; z <= c + 10; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

let pointer = 100;
async function tapSel(page: Page, selector: string) {
  await page.evaluate(
    ({ selector, id }) => {
      const b = document.querySelector(selector) as HTMLElement;
      const fire = (type: string) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 5, clientY: 5, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { selector, id: pointer++ },
  );
}

async function tapWorld(page: Page, x: number, y: number) {
  await page.evaluate(
    ({ id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) => target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { id: pointer++, x, y },
  );
}

async function aimAtKnight(page: Page, id: string): Promise<{ x: number; y: number }> {
  const vp = page.viewportSize()!;
  const kid = await readState<{ x: number; y: number; z: number }>(page, 'player');
  for (let i = 0; i < 48; i++) {
    await readState(page, 'placePlayer', kid.x, kid.y, kid.z, (i * Math.PI) / 24);
    const p = await readState<{ x: number; y: number } | null>(page, 'knightScreenPoint', id);
    if (p && p.x > vp.width * 0.55 && p.x < vp.width * 0.9 && p.y > vp.height * 0.15 && p.y < vp.height * 0.85) return p;
  }
  throw new Error('knight not on screen');
}

/** Opens the Uitrusten screen of the knight the tap lands on and returns his number (the knights stand close together). */
async function openAnyGear(page: Page, id: string): Promise<number> {
  let number = 0;
  await expect(async () => {
    const p = await aimAtKnight(page, id);
    await tapWorld(page, p.x, p.y);
    await expect(page.locator('.knight-menu-card')).toBeVisible({ timeout: 500 });
    await tapSel(page, '[data-action="gear"]');
    const title = await page.locator('.gear-screen-title').textContent({ timeout: 500 });
    number = Number(/Ridder (\d)/.exec(title ?? '')?.[1]);
    expect(number).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });
  return number;
}

const openGear = async (page: Page, id: string, number: number) => {
  expect(await openAnyGear(page, id)).toBe(number);
};

async function blocksAround(page: Page, k: Knight): Promise<number[]> {
  const cells: [number, number, number][] = [];
  for (let dx = -3; dx <= 3; dx++)
    for (let dy = -2; dy <= 3; dy++)
      for (let dz = -3; dz <= 3; dz++) cells.push([Math.floor(k.x) + dx, Math.floor(k.y) + dy, Math.floor(k.z) + dz]);
  return page.evaluate(
    (list) => {
      const h = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      return list.map(([x, y, z]) => h.blockAt!(x, y, z));
    },
    cells,
  );
}

async function buyAll(page: Page, ids: string[]) {
  await readState(page, 'setPoints', 500);
  for (const id of ids) expect(await readState<boolean>(page, 'buyGearInShop', id)).toBe(true);
}

function noDoubles(g: GearState) {
  const all = g.knights.flatMap((k) => Object.values(k.worn));
  expect(new Set(all).size).toBe(all.length);
  for (const k of g.knights) for (const id of Object.values(k.worn)) expect(g.owned).toContain(id);
}

const item = (id: string) => `.gear-screen-item[data-item="${id}"]`;

test.describe('Uitrusten (V19c)', () => {
  test('AC261: one knight wears, replaces and takes off; one canvas; timer stopped; no block changes; the same after a reload', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
    await buyAll(page, ['ijzeren-helm', 'leren-kap', 'pony']);
    const k = (await readState<Knight[]>(page, 'knights'))[0]!;
    const before = await blocksAround(page, k);
    await openGear(page, id, 1);
    expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);
    expect(await page.locator('canvas').count()).toBe(1);
    expect(await page.locator('.knight-picture canvas').count()).toBe(0);
    const size = await page.evaluate(() => {
      const r = document.querySelector('.knight-menu-btn-gear, .gear-screen-item')!.getBoundingClientRect();
      return Math.min(r.width, r.height);
    });
    expect(size).toBeGreaterThanOrEqual(44);
    await expect(page.locator('[data-part="helm-default"]')).toHaveCount(1);

    await tapSel(page, item('ijzeren-helm'));
    await expect.poll(async () => (await gear(page)).knights[0]!.worn).toEqual({ hoofd: 'ijzeren-helm' });
    await expect(page.locator('.knight-picture [data-part="helm"]')).toHaveCount(1);
    await page.waitForTimeout(400);
    await tapSel(page, item('leren-kap'));
    await expect.poll(async () => (await gear(page)).knights[0]!.worn).toEqual({ hoofd: 'leren-kap' });
    await expect(page.locator(`${item('ijzeren-helm')}[aria-pressed="false"]`)).toHaveCount(1);
    await page.waitForTimeout(400);
    await tapSel(page, item('pony'));
    await expect.poll(async () => (await gear(page)).knights[0]!.worn).toEqual({ hoofd: 'leren-kap', rijdier: 'pony' });
    await expect(page.locator('.knight-picture [data-part="pony"]')).toHaveCount(1);
    await page.waitForTimeout(400);
    await tapSel(page, item('leren-kap'));
    await expect.poll(async () => (await gear(page)).knights[0]!.worn).toEqual({ rijdier: 'pony' });
    expect((await gear(page)).owned.sort()).toEqual(['ijzeren-helm', 'leren-kap', 'pony']);

    for (let i = 0; i < 20; i++) await tapWorldLike(page, i);
    expect(await blocksAround(page, k)).toEqual(before);
    expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);

    await tapSel(page, '.gear-screen-back');
    await expect(page.locator('.knight-menu-card')).toBeVisible();
    await expect(page.locator('.gear-screen-card')).toHaveCount(0);
    expect(await readState<boolean>(page, 'isPlayRunning')).toBe(false);
    await tapSel(page, '.knight-menu-btn-close');
    await expect.poll(() => readState<boolean>(page, 'isPlayRunning')).toBe(true);

    await page.waitForTimeout(500);
    await page.reload();
    await openApp(page);
    expect((await gear(page)).knights[0]!.worn).toEqual({ rijdier: 'pony' });
  });

  test('AC261: three knights, "Bij Ridder N" and a move at no cost, never an item twice', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    for (let i = 0; i < 3; i++) await readState<string | null>(page, 'addKnight', 'stay');
    await buyAll(page, ['glimzwaard', 'kietelveer', 'houten-schild']);
    const points = await readState<number>(page, 'points');
    const list = await readState<Knight[]>(page, 'knights');
    // Ridder 1 wears the Glimzwaard (by hook), then the screen of whichever other knight is tapped says "Bij Ridder 1".
    expect(await readState<boolean>(page, 'wearGear', list[0]!.id, 'glimzwaard')).toBe(true);
    const target = list[1]!;
    const number = await openAnyGear(page, target.id);
    const me = list[number - 1]!;
    const wearer = number === 1 ? list[1]! : list[0]!;
    if (number === 1) {
      await readState(page, 'wearGear', list[0]!.id, null, 'hand');
      await readState(page, 'wearGear', wearer.id, 'glimzwaard');
    }
    await expect(page.locator(`${item('glimzwaard')} .gear-screen-status`)).toHaveText(`Bij Ridder ${list.indexOf(wearer) + 1}`);
    await tapSel(page, item('glimzwaard'));
    await expect.poll(async () => (await gear(page)).worn[me.id]).toEqual({ hand: 'glimzwaard' });
    const g = await gear(page);
    expect(g.worn[wearer.id] ?? {}).toEqual({});
    expect(g.owned.sort()).toEqual(['glimzwaard', 'houten-schild', 'kietelveer']);
    noDoubles(g);
    await page.waitForTimeout(400);
    await tapSel(page, item('houten-schild'));
    await expect.poll(async () => (await gear(page)).worn[me.id]).toEqual({ hand: 'glimzwaard', schild: 'houten-schild' });
    noDoubles(await gear(page));
    expect(await readState<number>(page, 'points')).toBe(points);

    await page.waitForTimeout(500);
    await page.reload();
    await openApp(page);
    const after = await gear(page);
    expect(after.worn[me.id]).toEqual({ hand: 'glimzwaard', schild: 'houten-schild' });
    expect(after.owned.length).toBe(3);
  });

  test('AC282: one of each of the 13 new items, 8 slots on the screen, one item per slot, one of each owned', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const id = (await readState<string | null>(page, 'addKnight', 'stay'))!;
    const NEW = [
      'houten-zwaard', 'snelle-laarzen', 'banier', 'malienkolder', 'koningscape', 'pluimhelm', 'koningsbanier', 'drakenschild',
      'glanzend-harnas', 'bubbelstaf', 'gouden-helm', 'strijdpaard', 'rij-triceratops',
    ];
    await readState(page, 'setPoints', 1000);
    for (const n of NEW) expect(await readState<boolean>(page, 'buyGearInShop', n)).toBe(true);
    await openGear(page, id, 1);
    await expect(page.locator('.gear-screen-slot')).toHaveText(['Hoofd', 'Schild', 'Hand', 'Rug', 'Lijf', 'Voeten', 'Vlag', 'Rijdier']);
    for (const n of NEW) {
      await tapSel(page, item(n));
      await expect(page.locator(`${item(n)}[aria-pressed="true"]`)).toHaveCount(1);
      await page.waitForTimeout(150);
    }
    const g = await gear(page);
    expect(g.owned.slice().sort()).toEqual(NEW.slice().sort());
    expect(g.knights[0]!.worn).toEqual({
      hoofd: 'gouden-helm', schild: 'drakenschild', hand: 'bubbelstaf', rug: 'koningscape', lijf: 'glanzend-harnas',
      voeten: 'snelle-laarzen', vlag: 'koningsbanier', rijdier: 'rij-triceratops',
    });
    noDoubles(g);
    expect(await page.locator('.gear-screen-item').count()).toBe(13);
  });
});

/** A tap in the middle of the screen, outside the card, that must not reach the world. */
async function tapWorldLike(page: Page, i: number) {
  const vp = page.viewportSize()!;
  await tapWorld(page, 4 + (i % 5), vp.height / 2 + i);
}
