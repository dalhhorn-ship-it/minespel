// The near sounds in a full play session (V24c, AC327): the bubble, Klodder, a free mole and the Lavakip-bar all sound
// while the kid walks about, and the app makes no request beyond its own files.
import { expect, test, type Page } from '@playwright/test';
import { openApp, readState } from './helpers/app';

interface Src { kind: string; closeness: number; gain: number; playing: boolean }
interface Near { running: boolean; sources: Src[] }
interface Pose { x: number; y: number; z: number }

function kvPut(page: Page, name: string, value: unknown): Promise<void> {
  return page.evaluate(
    ({ key, v }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(v, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: name, v: value },
  );
}

test.describe('Near sounds safety (V24c)', () => {
  test('AC327: a session that walks to Klodder, a free mole and the bar makes no request beyond the app', async ({ page, baseURL }) => {
    const outside: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('about:')) return;
      if (new URL(u).origin !== new URL(baseURL!).origin) outside.push(u);
    });
    await openApp(page);
    await kvPut(page, 'lavakip', { bought: true, spot: null, carried: 0 });
    await page.reload();
    await openApp(page);
    await readState(page, 'setCreatureSeed', 4);
    await readState(page, 'setPlayRemainingMs', 3_600_000);
    await readState(page, 'resetPlayTimer', 3600);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { pointerId: 99, pointerType: 'touch', bubbles: true })));
    await expect.poll(async () => (await readState<{ spot: unknown }>(page, 'lavakipState')).spot).not.toBeNull();
    const pose = await readState<Pose>(page, 'player');
    expect(await readState(page, 'mineAt', Math.floor(pose.x) + 4, 3, Math.floor(pose.z))).toBe(true);
    await readState(page, 'fastForward', 5000);
    await expect.poll(async () => (await readState<{ phase: string }>(page, 'moleState')).phase, { timeout: 8000 }).toBe('out');
    expect(await readState(page, 'spawnKlodder')).toBeTruthy();
    await readState(page, 'fastForward', 500);
    // Walk to the bar and to Klodder, and let the game run in between.
    const bar = (await readState<{ spot: Pose }>(page, 'lavakipState')).spot;
    const k = (await readState<{ klodder: Pose }>(page, 'monsterState')).klodder;
    for (const [x, y, z] of [[bar.x + 1, bar.y + 1, bar.z + 4.5], [k.x + 1, k.y + 1, k.z]] as const) {
      await readState(page, 'placePlayer', x, y, z, 0);
      await readState(page, 'fastForward', 2000);
      const near = await readState<Near>(page, 'nearSounds');
      expect(near.sources.filter((s) => s.playing).length).toBeLessThanOrEqual(2);
      for (const s of near.sources) expect(s.gain).toBeLessThanOrEqual(0.8);
    }
    await readState(page, 'fastForward', 30_000);
    expect(outside).toEqual([]);
  });
});
