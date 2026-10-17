import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE, START_SPOT, cellIndex, generateTerrain } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

interface PlayerPose {
  x: number;
  y: number;
  z: number;
  onGround: boolean;
  yaw: number;
  pitch: number;
}

const player = (page: Page) => readState<PlayerPose>(page, 'player');
const frames = (page: Page) => readState<number>(page, 'frameCount');

/** One synthetic touch event on the world, like a finger on the iPad. */
async function touch(page: Page, type: 'pointerdown' | 'pointermove' | 'pointerup', id: number, x: number, y: number) {
  await page.evaluate(
    ({ type, id, x, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      target.dispatchEvent(
        new PointerEvent(type, { pointerId: id, pointerType: 'touch', isPrimary: id === 1, clientX: x, clientY: y, bubbles: true }),
      );
    },
    { type, id, x, y },
  );
}

/** A tap on the jump button (a different finger id each time). */
async function tapJump(page: Page, id: number) {
  await page.evaluate((id) => {
    const b = document.querySelector('.hud-jump') as HTMLElement;
    const fire = (type: string) =>
      b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: 900, clientY: 600, bubbles: true }));
    fire('pointerdown');
    fire('pointerup');
  }, id);
}

/**
 * Makes a flat stone floor at height `floorTop` (the top of the floor) with open air above,
 * for a block area, so walking tests do not depend on hills and trees.
 */
async function flatten(page: Page, x0: number, x1: number, z0: number, z1: number, floorTop: number) {
  await page.evaluate(
    ({ x0, x1, z0, z1, floorTop, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++)
          for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < floorTop ? stone : 0, 1);
      hooks.rebuildWorld!();
    },
    { x0, x1, z0, z1, floorTop, stone: STEEN, height: WORLD_HEIGHT },
  );
}

async function place(page: Page, x: number, y: number, z: number, yaw: number) {
  await page.evaluate(({ x, y, z, yaw }) => (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino.placePlayer!(x, y, z, yaw), { x, y, z, yaw });
  await page.waitForTimeout(150);
}

test.describe('walkable world', () => {
  test('the world shows at the start spot and fills the screen (AC1)', async ({ page }) => {
    await openApp(page);
    await expect.poll(() => frames(page)).toBeGreaterThan(5);
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const r = c.getBoundingClientRect();
      return { w: r.width, h: r.height, iw: window.innerWidth, ih: window.innerHeight };
    });
    expect(canvas.w).toBe(canvas.iw);
    expect(canvas.h).toBe(canvas.ih);
    const p = await player(page);
    expect(p.x).toBeCloseTo(START_SPOT.x, 1);
    expect(p.z).toBeCloseTo(START_SPOT.z, 1);
    expect(p.onGround).toBe(true);
  });

  test('the world is the same every time and matches the generator (AC1)', async ({ page }) => {
    await openApp(page);
    const expected = generateTerrain();
    const cells: Array<[number, number, number]> = [];
    for (let i = 0; i < 300; i++) {
      cells.push([(i * 7) % WORLD_SIZE, (i * 5) % WORLD_HEIGHT, (i * 13) % WORLD_SIZE]);
    }
    const got = await page.evaluate((cells) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
      return cells.map(([x, y, z]) => hooks.blockAt!(x!, y!, z!));
    }, cells);
    expect(got).toEqual(cells.map(([x, y, z]) => expected[cellIndex(x, y, z)]));
  });

  test('the player stops at the world edge and cannot leave (AC2)', async ({ page }) => {
    await openApp(page);
    const z = Math.floor(WORLD_SIZE / 2);
    await flatten(page, WORLD_SIZE - 8, WORLD_SIZE - 1, z - 2, z + 2, 10);
    await place(page, WORLD_SIZE - 4, 10, z + 0.5, Math.PI / 2); // yaw pi/2 looks towards +x
    await touch(page, 'pointerdown', 1, 150, 600);
    await touch(page, 'pointermove', 1, 150, 540); // full forward
    await page.waitForTimeout(1800);
    const p = await player(page);
    expect(p.x).toBeLessThanOrEqual(WORLD_SIZE);
    expect(p.x).toBeGreaterThan(WORLD_SIZE - 0.5);
    await page.waitForTimeout(500);
    expect((await player(page)).x).toBeLessThanOrEqual(WORLD_SIZE);
    await touch(page, 'pointerup', 1, 150, 540);
  });

  test('one finger on the stick and one on the right walk and turn together (AC8)', async ({ page }) => {
    await openApp(page);
    const c = Math.floor(WORLD_SIZE / 2);
    await flatten(page, c - 10, c + 10, c - 10, c + 10, 10);
    await place(page, c + 0.5, 10, c + 0.5, 0);
    const before = await player(page);
    await touch(page, 'pointerdown', 1, 150, 600);
    await touch(page, 'pointermove', 1, 150, 540);
    await touch(page, 'pointerdown', 2, 700, 400);
    for (let i = 1; i <= 10; i++) {
      await touch(page, 'pointermove', 2, 700 + i * 12, 400);
      await page.waitForTimeout(60);
    }
    const mid = await player(page);
    expect(Math.hypot(mid.x - before.x, mid.z - before.z)).toBeGreaterThan(1);
    expect(mid.yaw).toBeLessThan(before.yaw - 0.3); // dragging right turns right
    await touch(page, 'pointerup', 2, 820, 400);
    await touch(page, 'pointerup', 1, 150, 540);
    await page.waitForTimeout(200);
    const end = await player(page);
    await page.waitForTimeout(300);
    const later = await player(page);
    expect(Math.hypot(later.x - end.x, later.z - end.z)).toBeLessThan(0.01);
  });

  test('a jump lands on a block one higher (AC9)', async ({ page }) => {
    await openApp(page);
    const c = Math.floor(WORLD_SIZE / 2);
    await flatten(page, c - 6, c + 6, c - 6, c + 6, 10);
    // A one block step 2 blocks ahead (towards +z).
    await page.evaluate(
      ({ c, stone }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
        for (let x = c - 3; x <= c + 3; x++) for (let z = c + 2; z <= c + 5; z++) hooks.setBlock!(x, 10, z, stone, 1);
        hooks.rebuildWorld!();
      },
      { c, stone: STEEN },
    );
    await place(page, c + 0.5, 10, c + 0.5, 0);
    expect((await player(page)).onGround).toBe(true);
    await touch(page, 'pointerdown', 1, 150, 600);
    await touch(page, 'pointermove', 1, 150, 540);
    await page.waitForTimeout(250);
    await tapJump(page, 5);
    await page.waitForTimeout(900);
    await touch(page, 'pointerup', 1, 150, 540);
    await page.waitForTimeout(200);
    const p = await player(page);
    expect(p.y).toBeCloseTo(11, 1);
    expect(p.onGround).toBe(true);
  });

  test('pause stops the world, resume continues, teleportHome goes back to the start', async ({ page }) => {
    await openApp(page);
    const c = Math.floor(WORLD_SIZE / 2);
    await flatten(page, c - 10, c + 10, c - 10, c + 10, 10);
    await place(page, c - 6 + 0.5, 10, c - 6 + 0.5, 0);
    await readState(page, 'pauseGame');
    expect(await readState(page, 'gameRunning')).toBe(false);
    const f0 = await frames(page);
    await page.waitForTimeout(400);
    expect(await frames(page)).toBe(f0);
    await readState(page, 'resumeGame');
    expect(await readState(page, 'gameRunning')).toBe(true);
    await expect.poll(() => frames(page)).toBeGreaterThan(f0 + 3);

    await readState(page, 'teleportHome');
    expect(await readState(page, 'teleportedCount')).toBe(1);
    const p = await player(page);
    expect(p.x).toBeCloseTo(START_SPOT.x, 5);
    expect(p.z).toBeCloseTo(START_SPOT.z, 5);
  });

  test('the loop is paused in portrait @portrait', async ({ page }) => {
    await openApp(page);
    await expect(page.locator('[data-overlay="portrait"]')).toBeVisible();
    expect(await readState(page, 'gameRunning')).toBe(false);
    const f0 = await frames(page);
    await page.waitForTimeout(400);
    expect(await frames(page)).toBe(f0);
  });
});
