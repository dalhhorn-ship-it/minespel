// The big world (V15e, AC234, AC242, AC243): walk to each side and stop at the invisible wall, dig from the start spot
// to the stripes, Ik zit vast, the version, and the Kijkafstand row. The generator rules have unit tests.
import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { KEISTEEN, OERSTEEN, STEEN, VEIN_BLOCKS, WAARSCHUWSTEEN } from '../../src/world/blocks';
import { START_SPOT, WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { answerGateQuestion, openApp, readState, waitFrames } from './helpers/app';
import { getKv } from './helpers/dorp';
import { loginAsParent, setupPin, typePin } from './helpers/gate';

interface Pose { x: number; y: number; z: number; onGround: boolean; yaw: number }
const player = (page: Page) => readState<Pose>(page, 'player');

/** A synthetic finger on the stick (the left half of the screen). */
async function stick(page: Page, type: 'pointerdown' | 'pointermove' | 'pointerup', y: number) {
  await page.evaluate(
    ({ type, y }) => {
      const target = document.querySelector('.world') as HTMLElement;
      target.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: 150, clientY: y, bubbles: true }));
    },
    { type, y },
  );
}

/** Flat stone floor with open air above for a strip, so a hill or a tree cannot stop the walk. */
async function carve(page: Page, x0: number, x1: number, z0: number, z1: number, floorTop: number) {
  await page.evaluate(
    ({ x0, x1, z0, z1, floorTop, height, stone }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = Math.max(0, x0); x <= Math.min(127, x1); x++)
        for (let z = Math.max(0, z0); z <= Math.min(127, z1); z++)
          for (let y = 1; y < height; y++) hooks.setBlock!(x, y, z, y < floorTop ? stone : 0, 1);
      hooks.rebuildWorld!();
    },
    { x0, x1, z0, z1, floorTop, height: WORLD_HEIGHT, stone: STEEN },
  );
}

test.describe('the big world (V15e)', () => {
  test('AC234: the world is 128 x 128 x 80', async ({ page }) => {
    await openApp(page);
    expect(await readState(page, 'worldSize')).toEqual({ width: 128, depth: 128, height: 80 });
  });

  // yaw 0 looks to +z, pi / 2 to +x (see world.spec.ts)
  const SIDES = [
    { name: '+x', yaw: Math.PI / 2, axis: 'x' as const, edge: WORLD_SIZE },
    { name: '-x', yaw: -Math.PI / 2, axis: 'x' as const, edge: 0 },
    { name: '+z', yaw: 0, axis: 'z' as const, edge: WORLD_SIZE },
    { name: '-z', yaw: Math.PI, axis: 'z' as const, edge: 0 },
  ];
  for (const side of SIDES) {
    test(`AC234: walking from the start spot to ${side.name} nothing stops the kid before the edge, and the wall keeps them in`, async ({ page }) => {
      test.setTimeout(90_000);
      await openApp(page);
      const sx = Math.floor(START_SPOT.x);
      const sz = Math.floor(START_SPOT.z);
      const floor = Math.floor(START_SPOT.y);
      // A strip of 5 blocks wide from the start spot to the edge. The terrain rules are proven in the unit tests.
      if (side.axis === 'x') await carve(page, Math.min(sx, side.edge), Math.max(sx, side.edge), sz - 2, sz + 2, floor);
      else await carve(page, sx - 2, sx + 2, Math.min(sz, side.edge), Math.max(sz, side.edge), floor);
      await readState(page, 'placePlayer', START_SPOT.x, floor, START_SPOT.z, side.yaw);
      await expect.poll(async () => (await player(page)).onGround).toBe(true);
      await stick(page, 'pointerdown', 600);
      await stick(page, 'pointermove', 540);
      const reached = () => player(page).then((p) => (side.edge === 0 ? p[side.axis] < 0.6 : p[side.axis] > WORLD_SIZE - 0.6));
      await expect.poll(reached, { timeout: 60_000, intervals: [500] }).toBe(true);
      await waitFrames(page, 30);
      const p = await player(page);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(WORLD_SIZE);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(p.z).toBeLessThanOrEqual(WORLD_SIZE);
      await stick(page, 'pointerup', 540);
    });
  }

  test('AC230 AC234: dig from the start spot to the stripes, oersteen is under y 1, and Ik zit vast gives the start spot', async ({ page }) => {
    await openApp(page);
    const x = Math.floor(START_SPOT.x);
    const z = Math.floor(START_SPOT.z);
    const top = Math.floor(START_SPOT.y) - 1; // the ground under the feet
    expect(await readState<number>(page, 'blockAt', x, top, z)).not.toBe(0);
    expect(await readState<number>(page, 'blockAt', x, top + 1, z)).toBe(0);
    // The kid digs every layer from the ground down to y 1: at least 18, in fact START_SPOT.y - 1.
    let dug = 0;
    for (let y = top; y >= 1; y--) {
      const before = await readState<number>(page, 'blockAt', x, y, z);
      if (y === 5) expect(before).toBe(WAARSCHUWSTEEN);
      if (y >= 1 && y <= 4) expect([STEEN, KEISTEEN, ...VEIN_BLOCKS]).toContain(before);
      if (y >= 6 && y <= 9) expect([STEEN, KEISTEEN]).toContain(before);
      expect(await readState<boolean>(page, 'mineAt', x, y, z)).toBe(true);
      expect(await readState<number>(page, 'blockAt', x, y, z)).toBe(0);
      // Mining the stripe block shows the Monstermol card (AC244, v16) and stops the loop until OK is tapped.
      if (y === 5) {
        await page.locator('[data-testid="mole-ok"]').tap();
        await expect(page.locator('[data-testid="mole-card"]')).toBeHidden();
      }
      dug++;
    }
    expect(dug).toBeGreaterThanOrEqual(18);
    expect(dug).toBe(START_SPOT.y - 1);
    // Oersteen under the shaft stays: it cannot be mined.
    expect(await readState<number>(page, 'blockAt', x, 0, z)).toBe(OERSTEEN);
    expect(await readState<boolean>(page, 'mineAt', x, 0, z)).toBe(false);
    expect(await readState<number>(page, 'blockAt', x, 0, z)).toBe(OERSTEEN);
    // The kid fell down the shaft, and is still inside the world.
    await expect.poll(async () => (await player(page)).y, { timeout: 15_000 }).toBeLessThan(START_SPOT.y - 10);
    expect((await player(page)).y).toBeGreaterThanOrEqual(0);

    await readState(page, 'openPauseMenu');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Ik zit vast')!;
      btn.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
      btn.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 5, clientY: 5, bubbles: true }));
    });
    expect(await readState<string>(page, 'currentScreen')).toBe('world');
    const home = await player(page);
    expect(home.x).toBeCloseTo(START_SPOT.x, 1);
    expect(home.z).toBeCloseTo(START_SPOT.z, 1);
  });
});

test.describe('version 0.9.0 (AC242 became AC257 in v16)', () => {
  test('AC257: package.json says 0.9.0 and Instellingen shows it at the bottom', async ({ page }) => {
    expect(pkg.version).toBe('0.9.0');
    await openApp(page);
    await readState(page, 'openParentControls');
    await page.locator('.parent-gate').waitFor();
    await setupPinFromGate(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await expect(page.locator('.parent-settings')).toContainText('Versie 0.9.0');
  });
});

/** The gate is open on the first start: solve it and choose a pin. */
async function setupPinFromGate(page: Page) {
  await answerGateQuestion(page);
  await page.locator('.parent-gate-key[data-key="1"]').waitFor();
  await typePin(page, '1234');
  await typePin(page, '1234');
  await page.locator('[data-testid="parent-shell"]').waitFor();
}

test.describe('Kijkafstand (AC243)', () => {
  async function openSettings(page: Page) {
    await loginAsParent(page);
    await page.locator('.parent-nav-btn[data-section="instellingen"]').tap();
    await page.locator('.parent-settings').waitFor();
  }
  const pressed = (page: Page) =>
    page.locator('[data-view-distance][aria-pressed="true"]').getAttribute('data-view-distance');

  test('AC243: Ver on a new install, Dichtbij is saved and stays after a reopen, the tap area is 44 x 44 or more', async ({ page }) => {
    await openApp(page);
    await setupPin(page);
    await openSettings(page);
    const row = page.locator('[data-testid="view-setting"]');
    await row.scrollIntoViewIfNeeded();
    await expect(row).toContainText('Kijkafstand');
    await expect(row).toContainText('Dichtbij maakt het spel sneller op een oudere iPad. Je kijkt dan minder ver.');
    expect(await pressed(page)).toBe('ver');
    for (const v of ['ver', 'dichtbij']) {
      const box = (await page.locator(`[data-view-distance="${v}"]`).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.locator('[data-view-distance="dichtbij"]').tap();
    expect(await pressed(page)).toBe('dichtbij');
    // The save is async: wait for the stored record, not for a timer, before the reopen.
    await expect
      .poll(async () => (await getKv<{ viewDistance?: string }>(page, 'settings'))?.viewDistance)
      .toBe('dichtbij');
    await page.reload();
    await openApp(page);
    await openSettings(page);
    expect(await pressed(page)).toBe('dichtbij');
  });

  test('AC243: with Dichtbij the fog ends at 40 blocks and no chunk more than 3 chunks from the player is drawn', async ({ page }) => {
    await openApp(page);
    test.skip(!(await readState<boolean>(page, 'usesRealRenderer')), 'No WebGL here: see the unit tests in src/render/quality.test.ts.');
    await setupPin(page);
    await openSettings(page);
    await page.locator('[data-view-distance="dichtbij"]').scrollIntoViewIfNeeded();
    await page.locator('[data-view-distance="dichtbij"]').tap();
    await page.locator('.parent-close-btn').tap();
    await readState(page, 'placePlayer', 8, 40, 8, Math.atan2(WORLD_SIZE / 2 - 8, WORLD_SIZE / 2 - 8));
    await waitFrames(page, 8);
    const stats = await readState<{ far: number; drawn: number; farthestDrawnChunks: number }>(page, 'chunkStats');
    expect(stats.drawn).toBeGreaterThan(0);
    expect(stats.farthestDrawnChunks).toBeLessThanOrEqual(3);
    expect(stats.far).toBe(44);
  });
});
