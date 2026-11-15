import { expect, test, type Page } from '@playwright/test';
import { STEEN } from '../../src/world/blocks';
import { cellIndex } from '../../src/world/terrain';
import { fromLegacy, killApp, openApp, readState } from './helpers/app';

// The 0.7.0 spots of these tests (7, 25, 7) and (12.5, 25, 14.5), at the same place in the big world.
const CELL = fromLegacy(7, 25, 7);
const SPOT = fromLegacy(12.5, 25, 14.5);

interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

async function build(page: Page) {
  await page.evaluate(
    ({ stone, cell, spot }) => {
      const h = (window as unknown as { __dino: Record<string, (...a: unknown[]) => unknown> }).__dino;
      h.setBlock!(cell.x, cell.y, cell.z, stone);
      h.markWorldDirty!();
      h.placePlayer!(spot.x, spot.y, spot.z, 1.1);
      h.setBuildState!({ mode: 'bouwen', hotbar: [12, 9, 10, 3, 1, 2, 7, 6], selected: 5 });
    },
    { stone: STEEN, cell: CELL, spot: SPOT },
  );
}

test.describe('saving the world', () => {
  test('a kill 3 seconds after building keeps the world, spot and hotbar (AC96, AC7)', async ({ page }) => {
    await openApp(page);
    await build(page);
    // No flush: the queue must write by itself (within about 2 seconds). Wait until the player AND the
    // world block (7,25,7) are both in storage.
    const entry = cellIndex(CELL.x, CELL.y, CELL.z) * 256 + STEEN;
    await expect
      .poll(
        () =>
          page.evaluate(
            ({ want, spotX }) =>
              new Promise<boolean>((resolve) => {
                const open = indexedDB.open('dino-blokwereld');
                open.onerror = () => resolve(false);
                open.onsuccess = () => {
                  const db = open.result;
                  const store = db.transaction('kv', 'readonly').objectStore('kv');
                  const player = store.get('player');
                  const world = store.get('world');
                  const tx = store.transaction;
                  tx.oncomplete = () => {
                    const p = player.result as { x?: number } | undefined;
                    const w = world.result as { diff?: ArrayLike<number> } | undefined;
                    db.close();
                    resolve(p?.x !== undefined && Math.abs(p.x - spotX) < 0.1 && Array.from(w?.diff ?? []).includes(want));
                  };
                  tx.onerror = () => {
                    db.close();
                    resolve(false);
                  };
                };
              }),
            { want: entry, spotX: SPOT.x },
          ),
        { timeout: 6000 },
      )
      .toBe(true);
    const fresh = await killApp(page);
    expect(await readState<number>(fresh, 'blockAt', CELL.x, CELL.y, CELL.z)).toBe(STEEN);
    const p = await readState<Pose>(fresh, 'player');
    expect(p.x).toBeCloseTo(SPOT.x, 1);
    expect(p.z).toBeCloseTo(SPOT.z, 1);
    expect(p.yaw).toBeCloseTo(1.1, 2);
    const b = await readState<{ mode: string; hotbar: number[]; selected: number }>(fresh, 'buildState');
    expect(b).toEqual({ mode: 'bouwen', hotbar: [12, 9, 10, 3, 1, 2, 7, 6], selected: 5 });
  });

  test('a normal reload saves on hide', async ({ page }) => {
    await openApp(page);
    await build(page);
    await readState(page, 'flushSave');
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
    expect(await readState<number>(page, 'blockAt', CELL.x, CELL.y, CELL.z)).toBe(STEEN);
  });

  test('resetWorld brings back the start world and it stays that way after a reopen', async ({ page }) => {
    await openApp(page);
    await build(page);
    await readState(page, 'flushSave');
    await readState(page, 'resetWorld');
    expect(await readState<number>(page, 'blockAt', CELL.x, CELL.y, CELL.z)).toBe(0);
    await readState(page, 'flushSave');
    await page.reload();
    await page.waitForFunction(() => (window as unknown as { __dino?: Record<string, () => unknown> }).__dino?.ready?.() === true);
    expect(await readState<number>(page, 'blockAt', CELL.x, CELL.y, CELL.z)).toBe(0);
  });

  test('a first start with no save works', async ({ page }) => {
    await openApp(page);
    expect(await readState<number>(page, 'blockAt', CELL.x, CELL.y, CELL.z)).toBe(0);
    expect(await readState<boolean>(page, 'gameRunning')).toBe(true);
  });
});
