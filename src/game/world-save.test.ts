// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../tests/fixtures/saves/v1-world.json';
import { openDb, transact, request } from '../storage/db';
import { moveOldSave } from '../storage/world-move-store';
import { createRecords } from '../storage/records';
import { createSaveQueue } from '../storage/save-queue';
import { createNullRenderer } from '../render/renderer';
import { AIR, STEEN } from '../world/blocks';
import { START_SPOT } from '../world/terrain';
import { VILLAGE_SITES } from '../world/village-layout';
import { createGame, type Game } from './game';
import { bootSave, createWorldSave, cleanDiff } from './world-save';

let n = 0;
const games: Game[] = [];

function makeGame(): Game {
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const container = document.createElement('div');
  document.body.append(container);
  const game = createGame({
    container,
    rendererFactory: createNullRenderer,
    guard: { subscribe: (l) => (l({ portrait: false, tooSmall: false }), () => {}) },
  });
  games.push(game);
  return game;
}

async function setupDb() {
  const db = await openDb({ name: `world-save-${n++}` });
  const records = createRecords(db);
  const queue = createSaveQueue({ db });
  // What boot does first: a new install gets its terrain version 3 world record at once.
  await moveOldSave(db);
  return { db, records, queue };
}

afterEach(() => {
  while (games.length) games.pop()?.dispose();
  vi.unstubAllGlobals();
  document.body.textContent = '';
});

describe('world save', () => {
  it('boots with no save: start world, start spot, default hotbar', async () => {
    const { records, queue } = await setupDb();
    const game = makeGame();
    const before = game.getBuildState();
    await createWorldSave({ game, queue, records }).restore();
    expect(game.world.diff().length).toBe(0);
    expect(game.player.player.x).toBe(START_SPOT.x);
    expect(game.player.player.y).toBe(START_SPOT.y);
    expect(game.getBuildState()).toEqual(before);
  });

  it('saves blocks, spot, look, hotbar and mode, and a new game restores them (AC96, AC7)', async () => {
    const { records, queue } = await setupDb();
    const a = makeGame();
    const stop = createWorldSave({ game: a, queue, records }).start();
    a.world.set(5, 20, 5, STEEN);
    a.setBuildState({ mode: 'bouwen', hotbar: [12, 9, 10, 3, 1, 2, 7, 6], selected: 4 });
    const p = a.player.player;
    p.x = 60.5; p.y = 70; p.z = 61.5;
    a.player.yaw = 0.7;
    a.player.pitch = 0.2;
    queue.markDirty('world');
    queue.markDirty('player');
    await queue.flushNow();
    stop();

    const b = makeGame();
    await createWorldSave({ game: b, queue, records }).restore();
    expect(b.world.get(5, 20, 5)).toBe(STEEN);
    expect(b.player.player.x).toBe(60.5);
    expect(b.player.player.y).toBe(70);
    expect(b.player.yaw).toBe(0.7);
    expect(b.player.pitch).toBeCloseTo(0.2);
    expect(b.getBuildState()).toEqual({ mode: 'bouwen', hotbar: [12, 9, 10, 3, 1, 2, 7, 6], selected: 4 });
  });

  it('marks the world dirty when a block changes through the game', async () => {
    const { records, queue } = await setupDb();
    const game = makeGame();
    const stop = createWorldSave({ game, queue, records }).start();
    expect(queue.pendingCount()).toBe(0);
    game.resetWorld();
    expect(queue.pendingCount()).toBeGreaterThan(0);
    stop();
  });

  it('resetWorld puts the start world and the start spot back and saves that', async () => {
    const { records, queue } = await setupDb();
    const game = makeGame();
    createWorldSave({ game, queue, records }).start();
    game.world.set(5, 20, 5, STEEN);
    game.resetWorld();
    expect(game.world.diff().length).toBe(0);
    await queue.flushNow();
    expect(Array.from((await records.get('world')).diff)).toEqual([]);
  });

  it('restores the v1 fixture (an old M1 save) once the boot move has run: everything is at the move (AC235)', async () => {
    const { db, records, queue } = await setupDb();
    await transact(db, 'kv', 'readwrite', async (tx) => {
      const store = tx.objectStore('kv');
      await request(store.put({ diff: Uint32Array.from(fixture.kv.world.diff) }, 'world'));
      // The fixture spot (20.5, 12, 18.5) is inside the 0.7.0 hill; the same spot in the air above it is used here.
      await request(store.put({ ...fixture.kv.player, y: 40 }, 'player'));
    });
    expect(await moveOldSave(db)).toBe('moved');
    const game = makeGame();
    await createWorldSave({ game, queue, records }).restore();
    // The 0.7.0 spots (32, 28, 32) and (10, 5, 10) are at the move (32, 10, 32).
    expect(game.world.get(64, 38, 64)).toBe(STEEN);
    expect(game.world.get(42, 15, 42)).toBe(AIR);
    expect(game.player.player.x).toBe(52.5);
    expect(game.player.player.y).toBe(50);
    expect(game.player.player.z).toBe(50.5);
    expect(game.player.yaw).toBe(1.25);
    expect(game.getBuildState()).toEqual({ mode: 'bouwen', hotbar: fixture.kv.player.hotbar, selected: 3 });
  });

  it('ignores a corrupt save and still boots', async () => {
    const { db, records, queue } = await setupDb();
    await transact(db, 'kv', 'readwrite', async (tx) => {
      const store = tx.objectStore('kv');
      await request(store.put({ diff: 'kapot', terrainVersion: 3 }, 'world'));
      await request(store.put({ x: 'a', y: -5, z: null, hotbar: [999, 1], selectedSlot: 99, mode: 'zzz' }, 'player'));
    });
    const game = makeGame();
    const before = game.getBuildState();
    await createWorldSave({ game, queue, records }).restore();
    expect(game.world.diff().length).toBe(0);
    expect(game.player.player.x).toBe(START_SPOT.x);
    expect(game.getBuildState()).toEqual(before);
  });

  it('a save that is cut off halfway leaves the previous save (AC136)', async () => {
    const { db, records, queue } = await setupDb();
    const a = makeGame();
    a.world.set(5, 20, 5, STEEN);
    createWorldSave({ game: a, queue, records }).start();
    queue.markDirty('world');
    await queue.flushNow();
    // A second save writes the world, then is cut off before the player is written.
    await expect(
      transact(db, 'kv', 'readwrite', async (tx) => {
        await request(tx.objectStore('kv').put({ diff: Uint32Array.from([1 * 256 + 3]) }, 'world'));
        throw new Error('cut off');
      }),
    ).rejects.toThrow('cut off');
    const b = makeGame();
    await createWorldSave({ game: b, queue, records }).restore();
    expect(b.world.get(5, 20, 5)).toBe(STEEN);
  });

  it('AC237: a failed move: restore throws at once, nothing is loaded and nothing is saved over the old records', async () => {
    const { db, records, queue } = await setupDb();
    await records.put('world', { diff: Uint32Array.from([256 * 5 + 3]) });
    const game = makeGame();
    await expect(createWorldSave({ game, queue, records, moved: false }).restore()).rejects.toThrow();
    expect(game.world.diff()).toHaveLength(0);
    expect(game.player.player.x).toBe(START_SPOT.x);
    const result = await bootSave({ game, create: async () => createWorldSave({ game, queue, records, moved: false }) });
    expect(result).toBe('not-saving');
    expect(Array.from((await records.get('world')).diff)).toEqual([256 * 5 + 3]);
    void db;
  });

  it('AC237: a world record that is not terrain version 3 is never read into the big world', async () => {
    const { records, queue } = await setupDb();
    for (const terrainVersion of [undefined, 1, 2]) {
      await records.put('world', { diff: Uint32Array.from([256 * 5 + 3]), ...(terrainVersion ? { terrainVersion } : {}) });
      const game = makeGame();
      await expect(createWorldSave({ game, queue, records }).restore()).rejects.toThrow();
      expect(game.world.diff()).toHaveLength(0);
    }
  });

  it('AC237: a saved spot inside a solid block is not used, the start spot is', async () => {
    const { records, queue } = await setupDb();
    // Deep in the ground (steen) at the middle.
    await records.put('player', { ...(await records.get('player')), x: 64.5, y: 3, z: 64.5, yaw: 1, pitch: 0 });
    const game = makeGame();
    await createWorldSave({ game, queue, records }).restore();
    expect(game.player.player.x).toBe(START_SPOT.x);
    expect(game.player.player.y).toBe(START_SPOT.y);
    // The same spot a little higher up, in the air: used.
    await records.put('player', { ...(await records.get('player')), x: 64.5, y: 72, z: 64.5 });
    const g2 = makeGame();
    await createWorldSave({ game: g2, queue, records }).restore();
    expect(g2.player.player.y).toBe(72);
    // A spot outside the 128 x 128 world is not used either.
    await records.put('player', { ...(await records.get('player')), x: 128.5, y: 72, z: 64.5 });
    const g3 = makeGame();
    await createWorldSave({ game: g3, queue, records }).restore();
    expect(g3.player.player.x).toBe(START_SPOT.x);
  });

  it('AC194: a kept copy of the old world record is deleted when the save opens', async () => {
    const { records, queue } = await setupDb();
    await records.put('worldV1', { diff: Uint32Array.from([256 + 3]) });
    await createWorldSave({ game: makeGame(), queue, records }).restore();
    expect(await records.get('worldV1')).toBeNull();
  });

  it('AC230: a world saved by 0.8.0 has terrainVersion 3 and comes back whole, villages included', async () => {
    const { records, queue } = await setupDb();
    const a = makeGame();
    const ws = createWorldSave({ game: a, queue, records });
    await ws.restore();
    const off = ws.start();
    // The kid mines a house block of noord.
    const site = VILLAGE_SITES[0]!;
    const cell = { x: site.houses[0]!.x, y: site.padY + 1, z: site.houses[0]!.z };
    a.world.set(cell.x, cell.y, cell.z, AIR);
    queue.markDirty('world');
    await queue.flushNow();
    off();
    expect((await records.get('world')).terrainVersion).toBe(3);
    const b = makeGame();
    await createWorldSave({ game: b, queue, records }).restore();
    expect(b.world.get(cell.x, cell.y, cell.z)).toBe(AIR);
    expect(Array.from(b.world.diff())).toEqual(Array.from(a.world.diff()));
  });

  it('a cancelled restore does not touch the game', async () => {
    const { records, queue } = await setupDb();
    await records.put('world', { diff: Uint32Array.from([256 * 5 + 3]), terrainVersion: 3 });
    const g = makeGame();
    const ws = createWorldSave({ game: g, queue, records });
    const p = ws.restore();
    ws.cancel();
    await p;
    expect(g.world.diff()).toHaveLength(0);
  });

  it('cleanDiff drops bad entries', () => {
    expect(cleanDiff(Uint32Array.from([256 + 1, 5]))).toEqual([257, 5]);
    expect(cleanDiff([-1, 1.5, 1e12, 256 * 3 + 2])).toEqual([770]);
    expect(cleanDiff('x')).toEqual([]);
    expect(cleanDiff(null)).toEqual([]);
    // A cell count: the legacy world has 64 x 64 x 64 cells.
    expect(cleanDiff([256 * 262143 + 1, 256 * 262144 + 1], 64 * 64 * 64)).toEqual([256 * 262143 + 1]);
  });

  describe('bootSave', () => {
    it('keeps the game paused until the restore is done, then resumes and saves', async () => {
      const { records, queue } = await setupDb();
      queue.markDirty('world');
      const seed = makeGame();
      seed.world.set(5, 20, 5, STEEN);
      createWorldSave({ game: seed, queue, records }).start();
      queue.markDirty('world');
      await queue.flushNow();

      const game = makeGame();
      const inner = createWorldSave({ game, queue, records });
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      const running: boolean[] = [];
      const booting = bootSave({
        game,
        create: async () => ({
          ...inner,
          restore: async () => {
            await gate;
            running.push(game.isRunning());
            await inner.restore();
          },
        }),
      });
      await Promise.resolve();
      expect(game.isRunning()).toBe(false);
      release();
      expect(await booting).toBe('saving');
      expect(running).toEqual([false]);
      expect(game.world.get(5, 20, 5)).toBe(STEEN);
      expect(game.isRunning()).toBe(true);
    });

    it('does not resume when someone paused meanwhile', async () => {
      const { records, queue } = await setupDb();
      const game = makeGame();
      let paused = false;
      await bootSave({
        game,
        wantsPause: () => paused,
        create: async () => {
          paused = true;
          return createWorldSave({ game, queue, records });
        },
      });
      expect(game.isRunning()).toBe(false);
    });

    it('after the timeout the kid plays without saving, and a late restore changes nothing', async () => {
      const { records, queue } = await setupDb();
      const game = makeGame();
      const inner = createWorldSave({ game, queue, records });
      const start = vi.fn(inner.start);
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      let lateRestoreDone!: () => void;
      const lateRestore = new Promise<void>((r) => (lateRestoreDone = r));
      const result = await bootSave({
        game,
        timeoutMs: 20,
        create: async () => ({
          ...inner,
          start,
          restore: async () => {
            await gate;
            await inner.restore();
            lateRestoreDone();
          },
        }),
      });
      expect(result).toBe('not-saving');
      expect(game.isRunning()).toBe(true);
      expect(start).not.toHaveBeenCalled();
      release();
      await lateRestore;
      expect(queue.pendingCount()).toBe(0);
    });

    it('a storage that never opens still lets the kid play', async () => {
      const game = makeGame();
      const result = await bootSave({ game, timeoutMs: 20, create: () => new Promise(() => {}) });
      expect(result).toBe('not-saving');
      expect(game.isRunning()).toBe(true);
    });

    it('a storage that fails to open still lets the kid play', async () => {
      const game = makeGame();
      const result = await bootSave({ game, create: () => Promise.reject(new Error('no idb')) });
      expect(result).toBe('not-saving');
      expect(game.isRunning()).toBe(true);
    });
  });
});

