import { expect, test, type Page } from '@playwright/test';
import { growthScale } from '../../src/dinos/egg';
import { DINO_KINDS, type DinoKindId } from '../../src/dinos/kinds';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

const C = Math.floor(WORLD_SIZE / 2);
const GROUND = 10;

interface DinoInfo { id: number; kind: DinoKindId; name: string; mode: string; x: number; y: number; z: number; growth: number }
interface EggInfo { id: number; kind: DinoKindId; x: number; y: number; z: number; playSeconds: number }
interface State { dinos: DinoInfo[]; eggs: EggInfo[] }

async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height, ground }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 12; x <= c + 12; x++)
        for (let z = c - 12; z <= c + 12; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < ground ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, ground, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT, ground: GROUND },
  );
  await page.waitForTimeout(200);
}

const state = (page: Page) => readState<State>(page, 'dinoState');

async function hatchOne(page: Page, kind: DinoKindId = 'compy', golden = false): Promise<DinoInfo> {
  await readState(page, 'addTestEgg', kind, golden);
  await expect.poll(async () => (await state(page)).dinos.length, { timeout: 12_000 }).toBe(1);
  return (await state(page)).dinos[0]!;
}

/** A touch on the right half of the world at a screen point. */
async function worldTap(page: Page, id: number, x: number, y: number) {
  await page.evaluate(
    ({ id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    },
    { id, x, y },
  );
}

/** Where on the screen a point in the world shows, for a player looking along +z with no tilt. */
async function screenOf(page: Page, wx: number, wy: number, wz: number) {
  return page.evaluate(
    ({ wx, wy, wz, ground, c }) => {
      const W = window.innerWidth, H = window.innerHeight;
      const t = Math.tan((70 * Math.PI) / 360);
      const dx = wx - (c + 0.5), dy = wy - (ground + 1.6), dz = wz - (c + 0.5);
      const ndcX = -dx / dz / (t * (W / H));
      const ndcY = dy / dz / t;
      return { x: ((ndcX + 1) / 2) * W, y: ((1 - ndcY) / 2) * H };
    },
    { wx, wy, wz, ground: GROUND, c: C },
  );
}

test.describe('dinos in the world', () => {
  test('a new game has no dinos and no eggs (AC12)', async ({ page }) => {
    await openApp(page);
    expect(await state(page)).toEqual({ dinos: [], eggs: [] });
  });

  test('an egg lies next to the player and hatches after 5 seconds into a Volg mij dino (AC150)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    await readState(page, 'addTestEgg', 'triceratops', false);
    // The egg gets its spot on the next game step; until then its position is not a number.
    await expect.poll(async () => typeof (await state(page)).eggs[0]?.x).toBe('number');
    const egg = (await state(page)).eggs[0]!;
    const dist = Math.hypot(egg.x - (C + 0.5), egg.z - (C + 0.5));
    expect(dist).toBeGreaterThan(0.9);
    expect(dist).toBeLessThan(3);
    await expect.poll(async () => (await state(page)).dinos.length, { timeout: 12_000 }).toBe(1);
    const s = await state(page);
    expect(s.eggs).toHaveLength(0);
    expect(s.dinos[0]).toMatchObject({ kind: 'triceratops', mode: 'follow' });
  });

  test('a tap on a dino opens its menu and mines no block (AC16, AC104)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const d = await hatchOne(page);
    await readState(page, 'pauseGame');
    // The game is paused, so the dino stands still; put it in view, then let the world run one tap.
    const x = C + 0.5 - 1.2, z = C + 0.5 + 3;
    await readState(page, 'placeDino', d.id, x, GROUND, z);
    await readState(page, 'resumeGame');
    const live = (await state(page)).dinos[0]!;
    const cy = live.y + (DINO_KINDS[live.kind].size.h * growthScale(live.growth)) / 2;
    const p = await screenOf(page, live.x, cy, live.z);
    expect(p.x).toBeGreaterThan(await page.evaluate(() => window.innerWidth / 2));
    expect(await readState<boolean>(page, 'dinoMenuOpen')).toBe(false);
    const floorBefore = await readState<number>(page, 'blockAt', C, GROUND - 1, C + 5);
    await worldTap(page, 21, p.x, p.y);
    await expect.poll(() => readState<boolean>(page, 'dinoMenuOpen')).toBe(true);
    expect(await readState<boolean>(page, 'gameRunning')).toBe(false);
    expect(await readState<number>(page, 'blockAt', C, GROUND - 1, C + 5)).toBe(floorBefore);
    await readState(page, 'closeDinoMenu');
    expect(await readState<boolean>(page, 'gameRunning')).toBe(true);
  });

  test('Ik zit vast: a Volg mij dino comes along and the world stays (AC106, AC152)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    const d = await hatchOne(page);
    await readState(page, 'placeDino', d.id, C + 8.5, GROUND, C + 8.5);
    await readState(page, 'setBlock', C + 2, GROUND, C + 2, STEEN);
    await readState(page, 'teleportHome');
    const p = await readState<{ x: number; z: number }>(page, 'player');
    await expect
      .poll(async () => {
        const n = (await state(page)).dinos[0]!;
        return Math.hypot(n.x - p.x, n.z - p.z);
      })
      .toBeLessThan(8);
    expect(await readState<number>(page, 'blockAt', C + 2, GROUND, C + 2)).toBe(STEEN);
    expect((await state(page)).dinos).toHaveLength(1);
  });

  test('a tap on an egg builds nothing (AC6, AC104)', async ({ page }) => {
    await openApp(page);
    await flatten(page);
    await readState(page, 'addTestEgg', 'compy', false);
    // The egg gets its spot on the next game step; until then its position is not a number.
    await expect.poll(async () => typeof (await state(page)).eggs[0]?.x).toBe('number');
    const egg = (await state(page)).eggs[0]!;
    await readState(page, 'setBuildState', { mode: 'bouwen', selected: 0 });
    // Tap the top of the ground cell the egg lies on from the player's eye.
    const p = await screenOf(page, Math.floor(egg.x) + 0.5, GROUND, Math.floor(egg.z) + 0.5);
    const before = await readState<number>(page, 'blockAt', Math.floor(egg.x), GROUND, Math.floor(egg.z));
    await worldTap(page, 22, Math.max(p.x, (await page.evaluate(() => window.innerWidth)) / 2 + 20), p.y);
    expect(await readState<number>(page, 'blockAt', Math.floor(egg.x), GROUND, Math.floor(egg.z))).toBe(before);
  });
});
