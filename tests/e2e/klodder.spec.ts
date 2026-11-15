// Klodder (V18b, AC214, AC217, AC218, AC219): out of the bubble, nibbles that never reach the save, tired at 5 minutes.
import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { killApp, openApp, readState } from './helpers/app';

interface MonsterState {
  phase: 'idle' | 'bubble' | 'klodder';
  klodder: { ageMs: number; nibbled: number; tired: boolean } | null;
  hiddenCount: number;
}
const state = (page: Page) => readState<MonsterState>(page, 'monsterState');

/** The stored `world` record as a plain list, straight from IndexedDB. */
function worldRecord(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('kv').objectStore('kv').get('world');
          req.onsuccess = () => {
            const v = req.result as { diff?: ArrayLike<number> } | undefined;
            resolve(JSON.stringify(v ? { ...v, diff: Array.from(v.diff ?? []) } : null));
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

async function prepare(page: Page) {
  await openApp(page);
  await readState(page, 'setCreatureSeed', 5);
  await readState(page, 'resetPlayTimer', 600);
}

test.describe('Klodder (V18b)', () => {
  test('AC214: Klodder comes out with Hihihi!', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnKlodder')).toBe(true);
    await readState(page, 'fastForward', 500);
    await expect(page.locator('.speech-line')).toHaveText('Hihihi!', { timeout: 8000 });
    expect((await state(page)).phase).toBe('klodder');
  });

  test('AC218: a hard kill with 10 nibbled cells leaves the stored world record byte for byte the same', async ({ page }) => {
    await prepare(page);
    await readState(page, 'setBlock', 30, 11, 30, STEEN);
    await readState(page, 'markWorldDirty');
    await readState(page, 'flushSave');
    const before = await worldRecord(page);
    expect(before).not.toBe('null');
    expect(await readState(page, 'spawnKlodder')).toBe(true);
    for (let i = 0; i < 40 && (await state(page)).hiddenCount < 10; i++) await readState(page, 'fastForward', 5000);
    expect((await state(page)).hiddenCount).toBeGreaterThanOrEqual(10);
    await readState(page, 'flushSave');
    expect(await worldRecord(page)).toBe(before);
    const fresh = await killApp(page);
    expect(await worldRecord(fresh)).toBe(before);
    const after = await state(fresh);
    expect(after.phase).toBe('idle');
    expect(after.hiddenCount).toBe(0);
  });

  test('AC219: tired after 5 minutes of play time, then every block is back', async ({ page }) => {
    await prepare(page);
    expect(await readState(page, 'spawnKlodder')).toBe(true);
    await readState(page, 'fastForward', 298_000);
    let s = await state(page);
    expect(s.phase).toBe('klodder');
    expect(s.klodder?.tired).toBe(false);
    await readState(page, 'fastForward', 2500);
    s = await state(page);
    expect(s.klodder?.tired === true || s.phase === 'idle').toBe(true);
    await readState(page, 'fastForward', 4000);
    s = await state(page);
    expect(s.phase).toBe('idle');
    expect(s.hiddenCount).toBe(0);
  });
});
