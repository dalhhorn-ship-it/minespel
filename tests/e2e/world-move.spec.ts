// The move of an old save into the big world (V15b, AC235, AC236, AC237): the 0.7.0 and 0.4.0 builder saves are
// written into IndexedDB, the app opens, and the world, the player, the animals and the knights are at the move.
import { expect, test, type Page } from '@playwright/test';
import { save040, save070, type OldSave } from '../fixtures/move/old-saves';
import { openApp, readState } from './helpers/app';
import { putKv } from './helpers/dorp';

const MOVE = { x: 32, y: 10, z: 32 };
const step = (p: { x: number; y: number; z: number }) => ({ x: p.x + MOVE.x, y: p.y + MOVE.y, z: p.z + MOVE.z });

/** Every kv record of the app database, with typed arrays as plain arrays. */
async function dumpKv(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const open = indexedDB.open('dino-blokwereld');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const store = db.transaction('kv').objectStore('kv');
          const keys = store.getAllKeys();
          const values = store.getAll();
          values.onsuccess = () => {
            const out: Record<string, unknown> = {};
            (keys.result as string[]).forEach((k, i) => {
              const v = values.result[i] as Record<string, unknown> | null;
              out[k] = v && v.diff instanceof Uint32Array ? { ...v, diff: Array.from(v.diff) } : v;
            });
            db.close();
            resolve(out);
          };
          values.onerror = () => reject(values.error);
        };
      }),
  );
}

/** Opens the app once, stops its saving, and writes the records of an old save. The next open moves them. */
async function seedOldSave(page: Page, save: OldSave): Promise<void> {
  await openApp(page);
  // The save queue stops first, so nothing the new install wrote can land over the old records.
  await readState(page, 'simulateKill');
  await putKv(page, 'world', { ...save.world, diff: Uint32Array.from(save.world.diff) });
  for (const key of ['player', 'dinos', 'economy', 'village', 'monsters', 'settings'] as const) await putKv(page, key, save[key]);
}

async function reopen(page: Page): Promise<void> {
  await page.reload();
  await openApp(page);
}

test.describe('the move of a 0.7.0 save (AC235)', () => {
  test('AC235: the hut, the player, the animals and the knights are at the move', async ({ page }) => {
    const save = save070();
    await seedOldSave(page, save);
    await reopen(page);

    // Every kid changed cell of the old save is at the move with the same block.
    const wrong = await page.evaluate(
      ({ changes, move }) => {
        const hooks = (window as unknown as { __dino: Record<string, (...a: number[]) => number> }).__dino;
        let bad = 0;
        for (const [x, y, z, id] of changes) if (hooks.blockAt!(x! + move.x, y! + move.y, z! + move.z) !== id) bad++;
        return bad;
      },
      { changes: save.changes, move: MOVE },
    );
    expect(wrong).toBe(0);
    expect(save.changes.length).toBeGreaterThan(100);

    const kv = await dumpKv(page);
    expect((kv.world as { terrainVersion: number }).terrainVersion).toBe(3);
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);

    // The player stands at the move and looks the same way.
    const p = await readState<{ x: number; y: number; z: number; yaw: number; pitch: number }>(page, 'player');
    const want = step(save.player);
    expect(p.x).toBeCloseTo(want.x, 0);
    expect(p.z).toBeCloseTo(want.z, 0);
    expect(p.y).toBeGreaterThan(want.y - 1.5);
    expect(p.yaw).toBeCloseTo(save.player.yaw, 5);
    expect(p.pitch).toBeCloseTo(save.player.pitch, 5);

    // Dinos, chickens and eggs: every record and every spot is at the move.
    const dinos = await readState<{ id: string; x: number; z: number; stayX: number; stayZ: number; mode: string }[]>(page, 'dinos');
    // An egg may hatch while the app starts, so there are 8 animals and 0 to 2 more.
    expect(dinos.length).toBeGreaterThanOrEqual(8);
    for (const old of save.dinos.dinos as Record<string, number | string>[]) {
      const now = dinos.find((d) => d.id === old.id)!;
      expect(now.mode).toBe(old.mode);
      expect(now.stayX).toBeCloseTo((old.stayX as number) + MOVE.x, 5);
      expect(now.stayZ).toBeCloseTo((old.stayZ as number) + MOVE.z, 5);
      // They have barely walked yet. An animal that was far from the kid (more than 15 blocks) is brought to him by
      // the game rule that was already in 0.7.0, so it is near its moved spot or near the player.
      const fromSpot = Math.hypot(now.x - ((old.x as number) + MOVE.x), now.z - ((old.z as number) + MOVE.z));
      const fromKid = Math.hypot(now.x - p.x, now.z - p.z);
      expect(Math.min(fromSpot, fromKid)).toBeLessThan(4);
    }
    const eggs = await readState<{ id: string; x: number; z: number }[]>(page, 'eggs');
    expect(dinos.length + eggs.length).toBe(10);
    for (const old of save.dinos.eggs as Record<string, number | string>[]) {
      const now = eggs.find((e) => e.id === old.id);
      if (!now) continue; // hatched already
      expect(now.x).toBeCloseTo((old.x as number) + MOVE.x, 5);
      expect(now.z).toBeCloseTo((old.z as number) + MOVE.z, 5);
    }

    // The knights: both spots are at the move, the modes are the same.
    const knights = await readState<{ id: string; mode: string; spot: { x: number; y: number; z: number } | null }[]>(page, 'knights');
    expect(knights).toHaveLength(2);
    for (const old of save.monsters.knights) {
      const now = knights.find((k) => k.id === old.id)!;
      expect(now.mode).toBe(old.mode);
      expect(now.spot).toEqual(step(old.spot!));
    }

    // Everything else is as before.
    expect(kv.economy).toEqual(save.economy);
    expect(kv.village).toEqual(save.village);
    expect((kv.player as { hotbar: number[] }).hotbar).toEqual(save.player.hotbar);
    expect((kv.monsters as { bubbleClockMs: number; hintShown: boolean }).hintShown).toBe(true);
  });

  test('AC237: killed halfway: the old save stays whole, the next clean open moves it once, 3 more opens change nothing', async ({ browser }) => {
    const context = await browser.newContext();
    const save = save070();
    const first = await context.newPage();
    await seedOldSave(first, save);
    const old = await dumpKv(first);
    await first.close();

    // A run killed after its writes inside the one transaction: the transaction aborts.
    const killed = await context.newPage();
    await killed.addInitScript(() => {
      (window as unknown as { __e2eMoveKill: boolean }).__e2eMoveKill = true;
    });
    await openApp(killed);
    // The kid plays the start world, nothing is saved over the old save.
    expect(await readState<number>(killed, 'blockAt', 64, 0, 64)).not.toBe(0);
    await readState(killed, 'simulateKill');
    expect(await dumpKv(killed)).toEqual(old);
    await killed.close();

    // The next open is clean: it moves everything.
    const clean = await context.newPage();
    await openApp(clean);
    await readState(clean, 'flushSave');
    const moved = await dumpKv(clean);
    expect((moved.world as { terrainVersion: number }).terrainVersion).toBe(3);
    expect((moved.player as { x: number }).x).toBeCloseTo(save.player.x + MOVE.x, 1);
    const knights = await readState<{ id: string; spot: { x: number; y: number; z: number } | null }[]>(clean, 'knights');
    for (const k of save.monsters.knights) expect(knights.find((n) => n.id === k.id)!.spot).toEqual(step(k.spot!));
    await clean.close();

    // Three more opens: nothing moves again.
    let last = moved;
    for (let i = 0; i < 3; i++) {
      const again = await context.newPage();
      await openApp(again);
      const kv = await dumpKv(again);
      expect((kv.world as { diff: number[] }).diff).toEqual((last.world as { diff: number[] }).diff);
      expect((kv.dinos as { dinos: { stayX: number }[] }).dinos.map((d) => d.stayX)).toEqual(
        (moved.dinos as { dinos: { stayX: number }[] }).dinos.map((d) => d.stayX),
      );
      expect((kv.monsters as { knights: unknown }).knights).toEqual((moved.monsters as { knights: unknown }).knights);
      last = kv;
      await readState(again, 'simulateKill');
      await again.close();
    }
    await context.close();
  });
});

test.describe('the move of a 0.4.0 save (AC236)', () => {
  test('AC236: the hut and the change in oost are at the move, only the free villages are stamped', async ({ page }) => {
    const save = save040();
    await seedOldSave(page, save);
    await reopen(page);
    for (const [x, y, z, id] of save.changes) {
      expect(await readState<number>(page, 'blockAt', x + MOVE.x, y + MOVE.y, z + MOVE.z)).toBe(id);
    }
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
    const sites = await readState<Array<{ id: string; hasHouses: boolean }>>(page, 'villageSites');
    // The kid changed a cell in oost: no houses there, the other two villages are stamped.
    expect(sites.map((s) => [s.id, s.hasHouses])).toEqual([['noord', true], ['oost', false], ['west', true]]);
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(p.x).toBeCloseTo(save.player.x + MOVE.x, 0);
    expect(p.z).toBeCloseTo(save.player.z + MOVE.z, 0);
  });
});

test.describe('a new install (AC230)', () => {
  test('AC230: a new install has a version 3 world record, the start spot and no move later', async ({ page }) => {
    await openApp(page);
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
    const p = await readState<{ x: number; z: number }>(page, 'player');
    expect(p.x).toBeCloseTo(64.5, 0);
    expect(p.z).toBeCloseTo(64.5, 0);
    await reopen(page);
    expect(await readState<number>(page, 'terrainVersion')).toBe(3);
  });
});
