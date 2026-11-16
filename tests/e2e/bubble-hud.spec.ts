// The pill state (V22b, AC301, AC302, AC304, AC305): read from the `bubbleHud` hook, no pixels. The pill view is V22e.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';
import { fence } from './helpers/mole';

interface Hud {
  shown: boolean;
  kind: 'clock' | 'soon' | 'bubble' | 'klodder' | 'mole';
  text: string;
  angle: number;
  distance: number;
  vertical: 'above' | 'below' | null;
}
interface Pose { x: number; y: number; z: number; yaw: number }
interface Spot { x: number; y: number; z: number }

const hud = (page: Page) => readState<Hud>(page, 'bubbleHud');
const texts = (page: Page) => expect.poll(async () => (await hud(page)).text, { timeout: 8000 });

async function prepare(page: Page, withKnight = true) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 3);
  await readState(page, 'resetPlayTimer', 600);
  if (withKnight) await readState(page, 'addKnight', 'stay');
}

/** The same turn the pill makes: 0 ahead, 90 right, 180 behind, -90 left. */
function angleTo(pose: Pose, at: Spot): number {
  const dx = at.x - pose.x;
  const dz = at.z - pose.z;
  const forward = dx * Math.sin(pose.yaw) + dz * Math.cos(pose.yaw);
  const right = -dx * Math.cos(pose.yaw) + dz * Math.sin(pose.yaw);
  return (Math.atan2(right, forward) * 180) / Math.PI;
}
const apart = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

test.describe('The pill state (V22b)', () => {
  test('AC301: the clock reads Bubbel over 3:20 and counts down by play time', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setBubbleClockMs', 400_000);
    await texts(page).toBe('Bubbel over 3:20');
    expect((await hud(page)).kind).toBe('clock');
    await readState(page, 'fastForward', 1000);
    await texts(page).toBe('Bubbel over 3:19');
  });

  test('AC301: the last half second reads 0:01, never 0:00', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setBubbleClockMs', 599_500);
    await texts(page).toBe('Bubbel over 0:01');
  });

  test('AC301: a due bubble held by a break says Bubbel komt zo!', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setPlayRemainingMs', 45_000);
    await readState(page, 'setBubbleClockMs', 599_000);
    await readState(page, 'fastForward', 20_000);
    await texts(page).toBe('Bubbel komt zo!');
    expect((await hud(page)).kind).toBe('soon');
  });

  test('AC302: with no knight and no points the pill does not show', async ({ page }) => {
    await prepare(page, false);
    await readState(page, 'setBubbleClockMs', 400_000);
    await readState(page, 'fastForward', 1000);
    expect((await hud(page)).shown).toBe(false);
  });

  test('AC304: the bubble gives its name, distance and an arrow that follows the turn', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnBubble')).toBe(true);
    await readState(page, 'fastForward', 4000);
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('bubble');
    const bubble = (await readState<{ bubble: Spot }>(page, 'monsterState')).bubble;
    const pose = await readState<Pose>(page, 'player');
    const s = await hud(page);
    expect(s.text).toMatch(/^Bubbel: \d+ blokken?( boven je| onder je)?$/);
    expect(Math.abs(s.distance - Math.hypot(bubble.x - pose.x, bubble.y - pose.y, bubble.z - pose.z))).toBeLessThanOrEqual(1.5);
    expect(apart(s.angle, angleTo(pose, bubble))).toBeLessThan(10);
    for (const turn of [Math.PI / 2, Math.PI]) {
      const yaw = pose.yaw + turn;
      await readState(page, 'placePlayer', pose.x, pose.y, pose.z, yaw);
      await expect
        .poll(async () => apart((await hud(page)).angle, angleTo({ ...pose, yaw }, bubble)), { timeout: 8000 })
        .toBeLessThan(10);
    }
  });

  test('AC304: Klodder gives kind klodder and the number follows him', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnKlodder')).toBe(true);
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('klodder');
    expect((await hud(page)).text).toMatch(/^Klodder: \d+ blokken?( boven je| onder je)?$/);
    await readState(page, 'fastForward', 3000);
    await expect
      .poll(async () => {
        const k = (await readState<{ klodder: Spot }>(page, 'monsterState')).klodder;
        const pose = await readState<Pose>(page, 'player');
        const s = await hud(page);
        return Math.abs(s.distance - Math.hypot(k.x - pose.x, k.y - pose.y, k.z - pose.z)) <= 1.5;
      }, { timeout: 8000 })
      .toBe(true);
  });

  test('AC305: a free mole gives kind mole with the arrow, and the pill goes back to the clock when he is sent off', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setBubbleClockMs', 400_000);
    const pose = await readState<{ x: number; z: number }>(page, 'player');
    expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('mole');
    expect((await hud(page)).text).toMatch(/^Mol: \d+ blokken?( boven je| onder je)?$/);
    expect(await readState(page, 'sendMoleAway')).toBe(true);
    await readState(page, 'fastForward', 1500);
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('clock');
  });

  test('AC305: a caught mole is never the target: the pill shows the clock again', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setBubbleClockMs', 400_000);
    const pose = await readState<{ x: number; z: number }>(page, 'player');
    expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('mole');
    // A closed wall 2 high round him catches him within 3 seconds (AC296).
    await readState(page, 'pauseGame');
    const m = (await readState<{ moles: Array<{ x: number; z: number; state: string }> }>(page, 'moleState')).moles[0]!;
    expect(await fence(page, Math.floor(m.x), Math.floor(m.z), 2)).toBeGreaterThan(0);
    await readState(page, 'resumeGame');
    await expect
      .poll(async () => {
        await readState(page, 'fastForward', 500);
        return (await readState<{ moles: Array<{ state: string }> }>(page, 'moleState')).moles[0]?.state;
      }, { timeout: 15_000 })
      .toBe('caught');
    await expect.poll(async () => (await hud(page)).kind, { timeout: 8000 }).toBe('clock');
    expect((await hud(page)).text).toMatch(/^Bubbel over \d+:\d\d$/);
  });
});
