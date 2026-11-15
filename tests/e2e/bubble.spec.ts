// The black bubble (V18a, AC211, AC212, AC213): the clock, the spot, the size and the tunnel.
import { expect, test, type Page } from '@playwright/test';
import { KEISTEEN } from '../../src/world/blocks';
import { openApp, readState } from './helpers/app';

interface Pose { x: number; y: number; z: number; yaw: number }
interface MonsterState {
  phase: 'idle' | 'bubble' | 'klodder';
  bubble: { x: number; y: number; z: number; stage: string; ageMs: number; spot: { x: number; y: number; z: number } } | null;
  hiddenCount: number;
}

const state = (page: Page) => readState<MonsterState>(page, 'monsterState');

/** A long play stretch with no learning break in the way, and a knight so the clock may run. */
async function prepare(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 3);
  await readState(page, 'resetPlayTimer', 600);
  await readState(page, 'addKnight', 'stay');
}

test.describe('Zwarte bubbel (V18a)', () => {
  test('AC211: with a knight the bubble comes after 10 minutes of play time, not before', async ({ page }) => {
    await prepare(page);
    await readState(page, 'fastForward', 598_000);
    expect((await state(page)).phase).toBe('idle');
    expect(await readState<number>(page, 'bubbleClockMs')).toBe(598_000);
    await readState(page, 'fastForward', 3000);
    expect((await state(page)).phase).toBe('bubble');
    expect(await readState<number>(page, 'bubbleClockMs')).toBe(0);
  });

  test('AC211: with a bubble out the clock does not move', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnBubble')).toBe(true);
    await readState(page, 'fastForward', 20_000);
    expect(await readState<number>(page, 'bubbleClockMs')).toBe(0);
  });

  test('AC212: a break due in under 60 seconds holds a due bubble', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setPlayRemainingMs', 45_000);
    await readState(page, 'setBubbleClockMs', 599_000);
    await readState(page, 'fastForward', 20_000);
    expect((await state(page)).phase).toBe('idle');
    expect(await readState<number>(page, 'bubbleClockMs')).toBe(600_000);
  });

  test('AC213: floats in over 3 seconds, 6 to 10 blocks ahead, 80 points wide, drifts within 1 block, a tap opens Klodder', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnBubble')).toBe(true);
    await readState(page, 'fastForward', 2000);
    expect((await state(page)).bubble?.stage).toBe('in');
    await readState(page, 'fastForward', 2000);
    const s = (await state(page)).bubble!;
    expect(s.stage).toBe('drift');
    const pose = await readState<Pose>(page, 'player');
    const dist = Math.hypot(s.spot.x - pose.x, s.spot.z - pose.z);
    expect(dist).toBeGreaterThanOrEqual(6);
    expect(dist).toBeLessThanOrEqual(10);
    expect(await readState<number>(page, 'bubbleScreenWidth')).toBeGreaterThanOrEqual(80);
    for (let i = 0; i < 6; i++) {
      await readState(page, 'fastForward', 5000);
      const b = (await state(page)).bubble!;
      expect(Math.hypot(b.x - s.spot.x, b.y - s.spot.y, b.z - s.spot.z)).toBeLessThanOrEqual(1);
    }
    // The first pointerup of a page makes the audio unlock build the sound context before the world sees the finger
    // lift. On a busy machine that takes over 300 ms, and the game then reads the tap as a drag (it measures from
    // pointerdown to pointerup). A first gesture that is not on the world gets that work done before the real tap.
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, pointerType: 'touch', bubbles: true })));
    expect(await readState<boolean>(page, 'audioUnlocked')).toBe(true);
    // The bubble floats straight ahead, so its middle sits on the line that splits the stick (left half) from the look
    // zone (right half), and its drift moves it across that line from frame to frame. A tap on the middle is the stick's
    // some of the time. So: read the point and tap in one step, on the right part of the bubble (it is 80 points wide
    // or more), where the finger is in the look zone.
    await page.evaluate(() => {
      const hooks = (window as unknown as { __dino: Record<string, () => unknown> }).__dino;
      const at = hooks.bubbleScreenPoint!() as { x: number; y: number };
      const width = hooks.bubbleScreenWidth!() as number;
      const x = Math.max(at.x + width / 4, window.innerWidth / 2 + 4);
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: at.y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
    });
    expect((await state(page)).phase).toBe('klodder');
  });

  test('AC213: in a tunnel 1 block wide no bubble shows until a valid spot exists, checked every 5 seconds', async ({ page }) => {
    await prepare(page);
    const pose = await readState<Pose>(page, 'player');
    const fx = Math.floor(pose.x);
    const fy = Math.floor(pose.y);
    const fz = Math.floor(pose.z);
    await page.evaluate(
      ({ fx, fy, fz, stone }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: unknown[]) => unknown> }).__dino;
        for (let x = fx - 6; x <= fx + 6; x++) {
          for (let z = fz - 2; z <= fz + 14; z++) {
            for (let y = fy - 1; y <= fy + 3; y++) hooks.setBlock!(x, y, z, stone, 1);
          }
        }
        for (let z = fz; z <= fz + 3; z++) for (let y = fy; y <= fy + 1; y++) hooks.setBlock!(fx, y, z, 0, 1);
        hooks.rebuildWorld!();
        hooks.placePlayer!(fx + 0.5, fy, fz + 0.5, 0);
      },
      { fx, fy, fz, stone: KEISTEEN },
    );
    await readState(page, 'setBubbleClockMs', 599_000);
    await readState(page, 'fastForward', 21_000);
    expect((await state(page)).phase).toBe('idle');
    // Open the tunnel ahead: a spot exists now, the next check shows the bubble.
    await page.evaluate(
      ({ fx, fy, fz }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: unknown[]) => unknown> }).__dino;
        for (let z = fz + 4; z <= fz + 12; z++) for (let y = fy; y <= fy + 1; y++) hooks.setBlock!(fx, y, z, 0, 1);
        hooks.rebuildWorld!();
      },
      { fx, fy, fz },
    );
    await readState(page, 'fastForward', 6000);
    expect((await state(page)).phase).toBe('bubble');
  });
});
