// The near sound mixer (V24b, AC323 to AC326): Klodder, the bar (V23b), the mole, the arrow side (V22b) and the silence cases.
import { expect, test, type Page } from '@playwright/test';
import { NEAR_SPECS } from '../../src/audio/near-recipes';
import { NEAR_KINDS } from '../../src/audio/near-mix';
import { STEEN } from '../../src/world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../../src/world/terrain';
import { openApp, readState } from './helpers/app';

interface Src { id: string; kind: string; distance: number; closeness: number; gain: number; pan: number; playing: boolean }
interface Near { running: boolean; sources: Src[] }
interface Kl { x: number; y: number; z: number }

const near = (page: Page) => readState<Near>(page, 'nearSounds');
const unlockAudio = (page: Page) =>
  page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, pointerType: 'touch', bubbles: true })));

async function klodderOut(page: Page): Promise<Kl> {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 4);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await readState(page, 'resetPlayTimer', 3600);
  expect(await readState(page, 'spawnKlodder')).toBeTruthy();
  await readState(page, 'fastForward', 100);
  const m = await readState<{ klodder: Kl }>(page, 'monsterState');
  return m.klodder;
}

/** The kid stands `d` blocks from Klodder (along x) and looks at him (yaw so that forward is -x ... toward him). */
async function standAt(page: Page, d: number, side: 'ahead' | 'left' | 'right' | 'behind' = 'ahead'): Promise<void> {
  const m = await readState<{ klodder: Kl }>(page, 'monsterState');
  const k = m.klodder;
  // Forward is (sin yaw, cos yaw). The kid stands at k.x + d and looks toward -x: yaw = -pi/2.
  const yaw = { ahead: -Math.PI / 2, behind: Math.PI / 2, left: Math.PI, right: 0 }[side];
  await readState(page, 'placePlayer', k.x + d, k.y, k.z, yaw);
  await readState(page, 'fastForward', 100);
}

const C = Math.floor(WORLD_SIZE / 2);

function kvPatch(page: Page, name: string, patch: Record<string, unknown>): Promise<void> {
  return page.evaluate(
    ({ key, p }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          const store = tx.objectStore('kv');
          const get = store.get(key);
          get.onsuccess = () => store.put({ ...(get.result as object | undefined), ...p }, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, p: patch },
  );
}

/** A flat stone arena round the middle with open air above, so nothing hides or blocks anything. */
async function flatten(page: Page) {
  await page.evaluate(
    ({ c, stone, height }) => {
      const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => void> }).__dino;
      for (let x = c - 14; x <= c + 14; x++)
        for (let z = c - 14; z <= c + 14; z++) for (let y = 0; y < height; y++) hooks.setBlock!(x, y, z, y < 10 ? stone : 0, 1);
      hooks.rebuildWorld!();
      hooks.placePlayer!(c + 0.5, 10, c + 0.5, 0);
    },
    { c: C, stone: STEEN, height: WORLD_HEIGHT },
  );
  await expect.poll(async () => (await readState<{ onGround: boolean }>(page, 'player')).onGround).toBe(true);
}

/** An app with a bought bar at (C - 1, 10, C + 8) in a flat arena. The kid stands in the middle. */
async function barApp(page: Page) {
  await openApp(page);
  await kvPatch(page, 'lavakip', { bought: true, spot: { x: C - 1, y: 10, z: C + 8 }, carried: 0 });
  await page.reload();
  await openApp(page);
  await readState(page, 'setCreatureSeed', 4);
  await readState(page, 'setPlayRemainingMs', 3_600_000);
  await readState(page, 'resetPlayTimer', 3600);
  await flatten(page);
  await expect.poll(() => readState(page, 'lavakipBarScreenPoint')).not.toBeNull();
}

/** The kid stands `d` blocks from the middle of the truck, on the +z side of it... on the kid's side, looking at it. */
async function standByBar(page: Page, d: number) {
  // The truck covers x C-1..C+1, z C+8..C+11: its middle is (C, C + 9.5). Stand south of it, looking north (+z, yaw 0).
  await readState(page, 'placePlayer', C, 10, C + 9.5 - d, 0);
  await readState(page, 'fastForward', 100);
}

const barOf = async (page: Page) => (await near(page)).sources.find((s) => s.kind === 'bar');
const klodderOf = async (page: Page) => (await near(page)).sources.find((s) => s.kind === 'klodder');

test.describe('Near sounds (V24b)', () => {
  test('AC323: Klodder gives a gain of peak times closeness at 2, 8, 14 and 25 blocks, Volume scales it', async ({ page }) => {
    await klodderOut(page);
    await unlockAudio(page);
    const want: [number, number][] = [[2, 0.2], [8, 0.141], [14, 0.071], [25, 0]];
    // The default Volume is below 100: the gain at 2 blocks (closeness 1) shows it, every other gain scales with it.
    await standAt(page, 2);
    await expect.poll(async () => (await klodderOf(page))?.gain ?? 0).toBeGreaterThan(0.05);
    const volume = (await klodderOf(page))!.gain / 0.2;
    expect(volume).toBeGreaterThan(0.2);
    expect(volume).toBeLessThanOrEqual(1);
    for (const [d, peakGain] of want) {
      const gain = peakGain * volume;
      await standAt(page, d);
      await expect.poll(async () => (await klodderOf(page))?.gain ?? -1, { message: `at ${d}` }).toBeGreaterThanOrEqual(0);
      const s = (await klodderOf(page))!;
      // Klodder walks a little between two reads, so read the distance he reports and check the rule on it.
      const c = Math.min(1, Math.max(0, (20 - s.distance) / 17));
      expect(s.gain).toBeCloseTo(0.2 * c * volume, 2);
      expect(Math.abs(s.gain - gain)).toBeLessThan(0.03);
      expect(s.playing).toBe(d < 20);
    }
  });

  test('AC326: before the first tap every gain is 0 and after it Klodder plays (the switch and Volume 0 are in the unit test)', async ({ page }) => {
    await klodderOut(page);
    await standAt(page, 3);
    let s = (await klodderOf(page))!;
    expect(s.gain).toBe(0);
    expect(s.playing).toBe(false);
    await unlockAudio(page);
    await standAt(page, 3);
    await expect.poll(async () => (await klodderOf(page))?.gain ?? 0).toBeGreaterThan(0.05);
    s = (await klodderOf(page))!;
    expect(s.playing).toBe(true);
  });

  test('AC326: in a pause state the list is empty and the hook says not running', async ({ page }) => {
    await klodderOut(page);
    await unlockAudio(page);
    await standAt(page, 3);
    await expect.poll(async () => (await klodderOf(page))?.playing).toBe(true);
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect.poll(async () => (await near(page)).running).toBe(false);
    expect((await near(page)).sources).toEqual([]);
    await page.setViewportSize({ width: 1180, height: 820 });
    await expect.poll(async () => (await near(page)).running).toBe(true);
    await standAt(page, 3);
    await expect.poll(async () => (await klodderOf(page))?.gain ?? 0).toBeGreaterThan(0.05);
  });

  test('AC325: the pan is below 0 to the left, above 0 to the right and near 0 ahead and behind', async ({ page }) => {
    await klodderOut(page);
    await unlockAudio(page);
    await standAt(page, 8, 'left');
    expect((await klodderOf(page))!.pan).toBeLessThan(-0.3);
    await standAt(page, 8, 'right');
    expect((await klodderOf(page))!.pan).toBeGreaterThan(0.3);
    await standAt(page, 8, 'ahead');
    expect(Math.abs((await klodderOf(page))!.pan)).toBeLessThan(0.1);
    await standAt(page, 8, 'behind');
    expect(Math.abs((await klodderOf(page))!.pan)).toBeLessThan(0.1);
  });

  test('AC323: the bar gives the sizzle gain of its own start (12) and loudest (3) distance, Volume scales it', async ({ page }) => {
    await barApp(page);
    await unlockAudio(page);
    const peak = NEAR_SPECS[NEAR_KINDS.bar.name].peak;
    await standByBar(page, 2);
    await expect.poll(async () => (await barOf(page))?.gain ?? 0).toBeGreaterThan(0.02);
    const volume = (await barOf(page))!.gain / peak;
    expect(volume).toBeGreaterThan(0.2);
    expect(volume).toBeLessThanOrEqual(1);
    for (const d of [3, 7.5, 12, 15]) {
      await standByBar(page, d);
      const s = (await barOf(page))!;
      const c = Math.min(1, Math.max(0, (NEAR_KINDS.bar.start - s.distance) / (NEAR_KINDS.bar.start - NEAR_KINDS.bar.loudest)));
      expect(s.gain, `at ${d} (reported ${s.distance})`).toBeCloseTo(peak * c * volume, 2);
      expect(s.playing).toBe(c > 0);
    }
    // 12 blocks and further is silent, 3 and nearer is the peak.
    await standByBar(page, 14);
    expect((await barOf(page))?.gain ?? 0).toBe(0);
  });

  test('AC324: the bar, a free mole and Klodder: exactly the two with the highest closeness play, and it follows the kid', async ({ page }) => {
    // The natural world: a mole never comes up next to blocks the kid changed. A bar with no spot gets its home spot.
    await openApp(page);
    await kvPatch(page, 'lavakip', { bought: true, spot: null, carried: 0 });
    await page.reload();
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'resetPlayTimer', 3600);
    await unlockAudio(page);
    await expect.poll(async () => (await readState<{ spot: unknown }>(page, 'lavakipState')).spot).not.toBeNull();
    const pose = await readState<{ x: number; z: number }>(page, 'player');
    // The mole first: with Klodder out the next mole rule says he sleeps on.
    expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await readState<{ phase: string }>(page, 'moleState')).phase, { timeout: 8000 }).toBe('out');
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    await readState(page, 'fastForward', 100);
    const check = async (label: string) => {
      const list = (await near(page)).sources;
      const audible = list.filter((s) => s.closeness > 0);
      const ranked = [...audible].sort((a, b) => b.closeness - a.closeness);
      const playing = list.filter((s) => s.playing);
      expect(playing.length, `${label}: ${JSON.stringify(list)}`).toBe(Math.min(2, audible.length));
      for (const s of playing) expect(s.closeness, label).toBeGreaterThanOrEqual((ranked[1]?.closeness ?? 0) - 1e-6);
      return list;
    };
    await check('where the kid stands');
    // Beside the bar: it plays (nothing nearer than 3 blocks can outrank it but the others at 3 blocks).
    const bar = (await readState<{ spot: { x: number; y: number; z: number } }>(page, 'lavakipState')).spot;
    await readState(page, 'placePlayer', bar.x + 1, bar.y + 1, bar.z + 4.5, 0);
    await readState(page, 'fastForward', 100);
    const byBar = await check('by the bar');
    expect(byBar.find((s) => s.kind === 'bar')?.closeness).toBeGreaterThan(0.5);
    // Beside Klodder: he plays too.
    const k = (await readState<{ klodder: Kl }>(page, 'monsterState')).klodder;
    await readState(page, 'placePlayer', k.x + 1, k.y + 1, k.z, -Math.PI / 2);
    await readState(page, 'fastForward', 100);
    const byKlodder = await check('by Klodder');
    expect(byKlodder.find((s) => s.kind === 'klodder')?.playing).toBe(true);
  });

  test('AC325: the pan side matches the bubbleHud arrow for the same target', async ({ page }) => {
    await klodderOut(page);
    await readState(page, 'addKnight', 'stay');
    await unlockAudio(page);
    for (const side of ['left', 'right'] as const) {
      await standAt(page, 8, side);
      await expect.poll(async () => (await readState<{ kind: string }>(page, 'bubbleHud')).kind).toBe('klodder');
      const hud = await readState<{ angle: number }>(page, 'bubbleHud');
      const s = (await klodderOf(page))!;
      expect(Math.sign(hud.angle), side).toBe(Math.sign(s.pan));
      expect(Math.sign(s.pan)).toBe(side === 'left' ? -1 : 1);
    }
  });

  test('AC326: with Geluidseffecten uit every near gain is 0 and nothing plays', async ({ page }) => {
    await openApp(page);
    await kvPatch(page, 'settings', { soundEffectsEnabled: false });
    await page.reload();
    await klodderOut(page);
    await unlockAudio(page);
    await standAt(page, 2);
    await readState(page, 'fastForward', 1000);
    const s = (await klodderOf(page))!;
    expect(s.gain).toBe(0);
    expect(s.playing).toBe(false);
    expect((await near(page)).sources.every((x) => x.gain === 0 && !x.playing)).toBe(true);
  });

  test('AC326: with Volume 0 every near gain is 0 and nothing plays', async ({ page }) => {
    await openApp(page);
    await kvPatch(page, 'settings', { volume: 0 });
    await page.reload();
    await klodderOut(page);
    await unlockAudio(page);
    await standAt(page, 2);
    await readState(page, 'fastForward', 1000);
    const s = (await klodderOf(page))!;
    expect(s.gain).toBe(0);
    expect(s.playing).toBe(false);
    expect((await near(page)).sources.every((x) => x.gain === 0 && !x.playing)).toBe(true);
  });
});
