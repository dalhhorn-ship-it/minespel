import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../tests/fixtures/saves/v1-world.json';
import { openDb, transact, request } from '../storage/db';
import { createRecords } from '../storage/records';
import { createSaveQueue } from '../storage/save-queue';
import { createNullRenderer } from '../render/renderer';
import { AIR, STEEN } from '../world/blocks';
import { START_SPOT } from '../world/terrain';
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
    p.x = 30.5; p.y = 15; p.z = 31.5;
    a.player.yaw = 0.7;
    a.player.pitch = 0.2;
    queue.markDirty('world');
    queue.markDirty('player');
    await queue.flushNow();
    stop();

    const b = makeGame();
    await createWorldSave({ game: b, queue, records }).restore();
    expect(b.world.get(5, 20, 5)).toBe(STEEN);
    expect(b.player.player.x).toBe(30.5);
    expect(b.player.player.y).toBe(15);
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

  it('restores the v1 fixture (an old M1 save)', async () => {
    const { db, records, queue } = await setupDb();
    await transact(db, 'kv', 'readwrite', async (tx) => {
      const store = tx.objectStore('kv');
      await request(store.put({ diff: Uint32Array.from(fixture.kv.world.diff) }, 'world'));
      await request(store.put(fixture.kv.player, 'player'));
    });
    const game = makeGame();
    await createWorldSave({ game, queue, records }).restore();
    expect(game.world.get(32, 28, 32)).toBe(STEEN);
    expect(game.world.get(10, 5, 10)).toBe(AIR);
    expect(game.player.player.x).toBe(20.5);
    expect(game.player.yaw).toBe(1.25);
    expect(game.getBuildState()).toEqual({ mode: 'bouwen', hotbar: fixture.kv.player.hotbar, selected: 3 });
  });

  it('ignores a corrupt save and still boots', async () => {
    const { db, records, queue } = await setupDb();
    await transact(db, 'kv', 'readwrite', async (tx) => {
      const store = tx.objectStore('kv');
      await request(store.put({ diff: 'kapot' }, 'world'));
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

  it('cleanDiff drops bad entries', () => {
    expect(cleanDiff(Uint32Array.from([256 + 1, 5]))).toEqual([257, 5]);
    expect(cleanDiff([-1, 1.5, 1e12, 256 * 3 + 2])).toEqual([770]);
    expect(cleanDiff('x')).toEqual([]);
    expect(cleanDiff(null)).toEqual([]);
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
      const result = await bootSave({
        game,
        timeoutMs: 20,
        create: async () => ({
          ...inner,
          start,
          restore: async () => {
            await gate;
            await inner.restore();
          },
        }),
      });
      expect(result).toBe('not-saving');
      expect(game.isRunning()).toBe(true);
      expect(start).not.toHaveBeenCalled();
      release();
      await new Promise((r) => setTimeout(r, 10));
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
