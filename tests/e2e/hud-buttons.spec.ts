import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

// G6: right side HUD buttons (Omhoog, Omlaag, four camera arrows). Pointer events are dispatched on the
// button itself, like a finger would, with the pointer id given by the test.
interface Pose { x: number; y: number; z: number; yaw: number; pitch: number; floating: boolean }
const pose = (page: Page) => readState<Pose>(page, 'player');

type Step = { type: 'pointerdown' | 'pointermove' | 'pointerup'; dx?: number; dy?: number; wait?: number };
/** Runs pointer events on the node found by selector (first match). Waits `wait` ms before each step. */
async function touch(page: Page, selector: string, id: number, steps: Step[]) {
  await page.evaluate(
    async ({ selector, id, steps }) => {
      const node = document.querySelector<HTMLElement>(selector)!;
      const r = node.getBoundingClientRect();
      const x = r.x + r.width / 2;
      const y = r.y + r.height / 2;
      for (const s of steps) {
        if (s.wait) await new Promise((res) => setTimeout(res, s.wait));
        node.dispatchEvent(
          new PointerEvent(s.type, { pointerId: id, pointerType: 'touch', clientX: x + (s.dx ?? 0), clientY: y + (s.dy ?? 0), bubbles: true }),
        );
      }
    },
    { selector, id, steps },
  );
}

for (const [w, h] of [[1024, 768], [1180, 820], [1366, 1024]] as const) {
  test(`HUD buttons fit and do not overlap at ${w} x ${h} landscape`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    const boxes = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.hud button')].map((b) => {
        const r = b.getBoundingClientRect();
        return { name: b.getAttribute('aria-label') ?? b.textContent ?? b.className, x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    expect(boxes.length).toBeGreaterThanOrEqual(8 + 1 + 4 + 2 + 3);
    for (const b of boxes) {
      expect(b.w, b.name).toBeGreaterThanOrEqual(44);
      expect(b.h, b.name).toBeGreaterThanOrEqual(44);
      expect(b.x, b.name).toBeGreaterThanOrEqual(0);
      expect(b.y, b.name).toBeGreaterThanOrEqual(0);
      expect(b.x + b.w, b.name).toBeLessThanOrEqual(w);
      expect(b.y + b.h, b.name).toBeLessThanOrEqual(h - 20);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.name} overlaps ${b.name}`).toBe(false);
      }
    }
  });
}

const BUTTONS: Array<[string, string, 'fly' | 'x' | 'y']> = [
  ['Omhoog vliegen', '.hud-fly-up', 'fly'],
  ['Omlaag vliegen', '.hud-fly-down', 'fly'],
  ['Kijk omhoog', '.hud-arrow-up', 'y'],
  ['Kijk omlaag', '.hud-arrow-down', 'y'],
  ['Kijk naar links', '.hud-arrow-left', 'x'],
  ['Kijk naar rechts', '.hud-arrow-right', 'x'],
];

async function sampleBlocks(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> & { player: () => { x: number; z: number } } }).__dino;
    const p = hooks.player!();
    const out: number[] = [];
    for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) for (let y = 0; y < 48; y++) out.push(hooks.blockAt!(Math.floor(p.x) + x, y, Math.floor(p.z) + z));
    return out;
  });
}

for (const [label, selector, kind] of BUTTONS) {
  test(`a 100 px drag starting on "${label}" never looks, mines or places (AC172)`, async ({ page }) => {
    await openApp(page);
    await page.waitForTimeout(500);
    const before = await pose(page);
    const blocks = await sampleBlocks(page);
    await touch(page, selector, 5, [
      { type: 'pointerdown' },
      { type: 'pointermove', dx: -50, dy: -50 },
      { type: 'pointermove', dx: -100, dy: -100 },
      { type: 'pointerup', dx: -100, dy: -100 },
    ]);
    await page.waitForTimeout(700);
    const after = await pose(page);
    const dYaw = Math.abs(after.yaw - before.yaw);
    if (kind === 'x') expect(dYaw).toBeLessThan(0.3); // the arrow's own 15 degree tap at most
    else expect(dYaw).toBeLessThan(0.001);
    if (kind !== 'y') expect(Math.abs(after.pitch - before.pitch)).toBeLessThan(0.001);
    expect(await sampleBlocks(page)).toEqual(blocks);
  });
}

// Real time here: the press and release round trips add a few frames, so the top bound has 0.2 slack.
// The exact 3 to 5 blocks of AC164 is checked with a fake clock in player-controller.test.ts.
test('holding Omhoog for about 1 s lifts the player about 4 blocks and releasing keeps the height (AC164 wiring)', async ({ page }) => {
  await openApp(page);
  await page.waitForFunction(() => (window as unknown as { __dino: Record<string, () => { onGround: boolean }> }).__dino.player!().onGround);
  const start = await pose(page);
  await touch(page, '.hud-fly-up', 6, [{ type: 'pointerdown' }]);
  await page.waitForTimeout(1000);
  await touch(page, '.hud-fly-up', 6, [{ type: 'pointerup' }]);
  const up = await pose(page);
  expect(up.y - start.y).toBeGreaterThanOrEqual(3);
  expect(up.y - start.y).toBeLessThanOrEqual(5.2);
  await page.waitForTimeout(1500);
  const later = await pose(page);
  expect(Math.abs(later.y - up.y)).toBeLessThan(0.3);
  expect(later.floating).toBe(true);
});

test('opening the pause menu while Omhoog is held lets go of it', async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(800);
  await touch(page, '.hud-fly-up', 7, [{ type: 'pointerdown' }]);
  await page.waitForTimeout(300);
  await readState(page, 'openScreen', 'kid-overlay');
  await readState(page, 'pauseGame');
  const a = await pose(page);
  await readState(page, 'resumeGame');
  await page.waitForTimeout(800);
  const b = await pose(page);
  expect(Math.abs(b.y - a.y)).toBeLessThan(0.3);
});

test('stick with one finger and an arrow with another: the player walks and turns', async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(800);
  const before = await pose(page);
  await page.evaluate(() => {
    const world = document.querySelector('.world') as HTMLElement;
    const fire = (type: string, y: number) =>
      world.dispatchEvent(new PointerEvent(type, { pointerId: 20, pointerType: 'touch', clientX: 100, clientY: y, bubbles: true }));
    fire('pointerdown', 400);
    fire('pointermove', 340);
  });
  await touch(page, '.hud-arrow-right', 21, [{ type: 'pointerdown' }]);
  await page.waitForFunction(
    (b) => {
      const p = (window as unknown as { __dino: Record<string, () => { x: number; z: number; yaw: number }> }).__dino.player!();
      return Math.hypot(p.x - b.x, p.z - b.z) > 0.5 && Math.abs(p.yaw - b.yaw) > 0.3;
    },
    before,
    { timeout: 8000 },
  );
  const during = await pose(page);
  await touch(page, '.hud-arrow-right', 21, [{ type: 'pointerup' }]);
  await page.evaluate(() => {
    const world = document.querySelector('.world') as HTMLElement;
    world.dispatchEvent(new PointerEvent('pointerup', { pointerId: 20, pointerType: 'touch', clientX: 100, clientY: 340, bubbles: true }));
  });
  expect(Math.hypot(during.x - before.x, during.z - before.z)).toBeGreaterThan(0.5);
  expect(Math.abs(during.yaw - before.yaw)).toBeGreaterThan(0.3);
});
