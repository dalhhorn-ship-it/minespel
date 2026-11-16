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
    // No pre-unlock any more: the first tap of the page may be this one (V16e, the audio unlock does not delay it).
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

type Part = 'left' | 'middle' | 'right';

/**
 * Turns the kid so the bubble sits where the part under test is on the right side of the line between the stick half
 * and the look half, then taps that part in the same step (the bubble drifts), with one finger down and up.
 */
async function tapPart(page: Page, part: Part) {
  return page.evaluate((part) => {
    const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => unknown> }).__dino;
    const split = window.innerWidth / 2;
    const pose = hooks.player!() as { x: number; y: number; z: number; yaw: number };
    for (let i = 0; i <= 120; i++) {
      const yaw = pose.yaw + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.01;
      hooks.placePlayer!(pose.x, pose.y, pose.z, yaw);
      const at = hooks.bubbleScreenPoint!() as { x: number; y: number } | null;
      const w = hooks.bubbleScreenWidth!() as number | null;
      if (!at || !w) continue;
      const x = at.x + (part === 'left' ? -0.4 : part === 'right' ? 0.4 : 0) * w;
      const ok = part === 'left' ? x < split - 4 : part === 'right' ? x > split + 4 : Math.abs(at.x - split) < 0.1 * w;
      if (!ok) continue;
      const target = document.querySelector('.world') as HTMLElement;
      const fire = (type: string) =>
        target.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: at.y, bubbles: true }));
      fire('pointerdown');
      fire('pointerup');
      return { x, split };
    }
    return null;
  }, part);
}

test.describe('The tap area of the black bubble (V16e)', () => {
  for (const part of ['left', 'middle', 'right'] as const) {
    test(`AC213: a tap on the ${part} part of the bubble pops it, whichever half of the screen it floats in`, async ({ page }) => {
      await prepare(page);
      expect(await readState(page, 'spawnBubble')).toBe(true);
      await readState(page, 'fastForward', 4000);
      expect((await state(page)).bubble!.stage).toBe('drift');
      const tapped = await tapPart(page, part);
      expect(tapped).not.toBeNull();
      if (part === 'left') expect(tapped!.x).toBeLessThan(tapped!.split);
      if (part === 'right') expect(tapped!.x).toBeGreaterThan(tapped!.split);
      expect((await state(page)).phase).toBe('klodder');
    });
  }

  test('V16e: the first tap after boot pops the bubble even when the audio unlock takes 400 ms', async ({ page }) => {
    // The unlock builds the AudioContext inside the first pointerup. Make that slow, like a busy iPad.
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, new (...a: unknown[]) => unknown>;
      const Real = (w.AudioContext ?? w.webkitAudioContext) as new (...a: unknown[]) => unknown;
      class Slow extends (Real as new (...a: unknown[]) => object) {
        constructor(...args: unknown[]) {
          const until = performance.now() + 400;
          while (performance.now() < until) { /* busy */ }
          super(...args);
        }
      }
      w.AudioContext = Slow as never;
      w.webkitAudioContext = Slow as never;
    });
    await prepare(page);
    expect(await readState<boolean>(page, 'audioUnlocked')).toBe(false);
    expect(await readState(page, 'spawnBubble')).toBe(true);
    await readState(page, 'fastForward', 4000);
    expect(await tapPart(page, 'right')).not.toBeNull();
    expect((await state(page)).phase).toBe('klodder');
    expect(await readState<boolean>(page, 'audioUnlocked')).toBe(true);
  });
});
