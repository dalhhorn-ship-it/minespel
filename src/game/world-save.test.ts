// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../../tests/fixtures/saves/v1-world.json';
import fxNone from '../../tests/fixtures/saves/v1-village-none.json';
import fxOneSite from '../../tests/fixtures/saves/v1-village-one-site.json';
import fxAllSites from '../../tests/fixtures/saves/v1-village-all-sites.json';
import fxStanding from '../../tests/fixtures/saves/v1-village-standing.json';
import fxRandom from '../../tests/fixtures/saves/v1-village-random-500.json';
import type { Records } from '../storage/records';
import type { WorldRecord } from '../storage/schema';
import { openDb, transact, request } from '../storage/db';
import { createRecords } from '../storage/records';
import { createSaveQueue } from '../storage/save-queue';
import { createNullRenderer } from '../render/renderer';
import { AIR, STEEN } from '../world/blocks';
import { CELL_COUNT, START_SPOT, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain } from '../world/terrain';
import { VILLAGE_SITES, inRegion, siteHasHouses, siteRegion } from '../world/village-layout';
import type { World } from '../world/world';
import { createGame, type Game } from './game';
import { bootSave, createWorldSave, cleanDiff, siteBlocked, standingSpots, upgradeV1World } from './world-save';

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

// ---- v11: villages in old saves (AC179) ----

interface FixtureKv {
  world: { diff: number[] };
  player: Record<string, unknown>;
  dinos: { dinos: Record<string, unknown>[]; eggs: Record<string, unknown>[] };
}

const V1 = generateTerrain(WORLD_SEED, 1);
const V2 = generateTerrain(WORLD_SEED, 2);

function snapshot(w: World): Uint8Array {
  const out = new Uint8Array(CELL_COUNT);
  for (let y = 0; y < WORLD_HEIGHT; y++)
    for (let z = 0; z < WORLD_SIZE; z++)
      for (let x = 0; x < WORLD_SIZE; x++) out[cellIndex(x, y, z)] = w.get(x, y, z);
  return out;
}

/** The kid's world in 0.4.0: version 1 terrain plus the old diff. */
function oldWorld(diff: readonly number[]): Uint8Array {
  const b = V1.slice();
  for (const e of diff) b[Math.floor(e / 256)] = e % 256;
  return b;
}

async function seedKv(records: Records, kv: FixtureKv): Promise<void> {
  // A 0.4.0 world record: only a diff, no terrainVersion.
  await records.put('world', { diff: Uint32Array.from(kv.world.diff) });
  await records.put('player', kv.player as never);
  await records.put('dinos', kv.dinos as never);
}

function siteIndexOf(index: number): number {
  const x = index % WORLD_SIZE;
  const z = Math.floor(index / WORLD_SIZE) % WORLD_SIZE;
  return VILLAGE_SITES.findIndex((s) => inRegion(siteRegion(s), x, z));
}

/** Checks every cell: a stamped site holds version 2, every other cell holds the kid's old world. */
function expectUpgraded(game: Game, kv: FixtureKv, stamped: boolean[]): void {
  const now = snapshot(game.world);
  const old = oldWorld(kv.world.diff);
  let wrong = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    const k = siteIndexOf(i);
    const want = k >= 0 && stamped[k] ? V2[i] : old[i];
    if (now[i] !== want) wrong++;
  }
  expect(wrong).toBe(0);
  // Every cell the kid changed holds exactly the same block as before.
  for (const e of kv.world.diff) expect(now[Math.floor(e / 256)]).toBe(e % 256);
  // The player stands where they stood.
  expect(game.player.player.x).toBe(kv.player.x);
  expect(game.player.player.y).toBe(kv.player.y);
  expect(game.player.player.z).toBe(kv.player.z);
  expect(VILLAGE_SITES.map((s) => siteHasHouses((x, y, z) => game.world.get(x, y, z), s))).toEqual(stamped);
}

async function expectStored(records: Records, kv: FixtureKv): Promise<void> {
  const world = await records.get('world');
  expect(world.terrainVersion).toBe(2);
  const copy = (await records.get('worldV1')) as WorldRecord;
  expect(copy).not.toBeNull();
  expect(Array.from(copy.diff)).toEqual(kv.world.diff);
  expect(copy.terrainVersion).toBeUndefined();
}

const FIXTURES: { name: string; kv: FixtureKv; stamped: boolean[] }[] = [
  { name: 'no changes', kv: fxNone.kv as FixtureKv, stamped: [true, true, true] },
  { name: 'changes inside one site only (oost)', kv: fxOneSite.kv as FixtureKv, stamped: [true, false, true] },
  { name: 'changes in all three sites', kv: fxAllSites.kv as FixtureKv, stamped: [false, false, false] },
  ...fxStanding.variants.map((v) => ({
    name: `only a ${v.who} stands in ${v.site}`,
    kv: v.kv as FixtureKv,
    stamped: VILLAGE_SITES.map((s) => s.id !== v.site),
  })),
  { name: '500 random changes spread over the world', kv: fxRandom.kv as FixtureKv, stamped: [false, false, false] },
];

describe('villages in a 0.4.0 save (AC179)', () => {
  it('AC179: the fixtures are real 0.4.0 saves (no terrainVersion, only real changes)', () => {
    expect(fxRandom.kv.world.diff).toHaveLength(500);
    for (const f of FIXTURES) {
      for (const e of f.kv.world.diff) expect(V1[Math.floor(e / 256)]).not.toBe(e % 256);
      expect((f.kv.world as { terrainVersion?: number }).terrainVersion).toBeUndefined();
    }
    expect(fxStanding.variants.map((v) => v.who)).toEqual(['player', 'dino', 'egg', 'chicken']);
  });

  for (const f of FIXTURES) {
    it(`AC179: ${f.name}: kid cells and the player spot stay, only free sites get houses, a second open changes nothing`, async () => {
      const { records, queue } = await setupDb();
      await seedKv(records, f.kv);
      const a = makeGame();
      await createWorldSave({ game: a, queue, records }).restore();
      expectUpgraded(a, f.kv, f.stamped);
      await expectStored(records, f.kv);
      const first = snapshot(a.world);
      const storedDiff = Array.from((await records.get('world')).diff);

      const b = makeGame();
      await createWorldSave({ game: b, queue, records }).restore();
      expect(snapshot(b.world)).toEqual(first);
      expect(Array.from((await records.get('world')).diff)).toEqual(storedDiff);
      await expectStored(records, f.kv);
    });
  }

  it('AC179: the old world record is copied unchanged and a second open does not touch the copy', async () => {
    const { records, queue } = await setupDb();
    await seedKv(records, fxOneSite.kv as FixtureKv);
    await createWorldSave({ game: makeGame(), queue, records }).restore();
    // The kid plays on and saves: the copy stays the old record.
    const g = makeGame();
    const stop = createWorldSave({ game: g, queue, records });
    await stop.restore();
    const off = stop.start();
    g.world.set(1, 30, 1, STEEN);
    queue.markDirty('world');
    await queue.flushNow();
    off();
    const copy = (await records.get('worldV1')) as WorldRecord;
    expect(Array.from(copy.diff)).toEqual(fxOneSite.kv.world.diff);
    const world = await records.get('world');
    expect(world.terrainVersion).toBe(2);
    expect(Array.from(world.diff)).toContain(cellIndex(1, 30, 1) * 256 + STEEN);
  });

  it('AC179: killed after the copy was written and before the new world: the old world is stored whole and the next start stamps the same', async () => {
    const clean = await setupDb();
    await seedKv(clean.records, fxOneSite.kv as FixtureKv);
    const ref = makeGame();
    await createWorldSave({ game: ref, queue: clean.queue, records: clean.records }).restore();
    const expected = snapshot(ref.world);

    const { records, queue } = await setupDb();
    await seedKv(records, fxOneSite.kv as FixtureKv);
    const killed: Records = {
      ...records,
      put: async (name, value) => {
        if (name === 'world') throw new Error('killed');
        await records.put(name, value);
      },
    };
    await createWorldSave({ game: makeGame(), queue, records: killed }).restore();
    // The stored world is the whole old world: the old record, untouched.
    const stored = await records.get('world');
    expect(stored.terrainVersion).toBeUndefined();
    expect(Array.from(stored.diff)).toEqual(fxOneSite.kv.world.diff);

    const next = makeGame();
    await createWorldSave({ game: next, queue, records }).restore();
    expect(snapshot(next.world)).toEqual(expected);
    expectUpgraded(next, fxOneSite.kv as FixtureKv, [true, false, true]);
    await expectStored(records, fxOneSite.kv as FixtureKv);
  });

  it('AC179: killed before anything was written: the next start does the stamp', async () => {
    const { records, queue } = await setupDb();
    await seedKv(records, fxAllSites.kv as FixtureKv);
    const dead: Records = { ...records, put: async () => { throw new Error('killed'); } };
    const shown = makeGame();
    await createWorldSave({ game: shown, queue, records: dead }).restore();
    // Nothing could be written: the kid sees the whole old world, no new houses.
    expect(snapshot(shown.world)).toEqual(oldWorld(fxAllSites.kv.world.diff));
    expect(await records.get('worldV1')).toBeNull();
    expect((await records.get('world')).terrainVersion).toBeUndefined();

    const next = makeGame();
    await createWorldSave({ game: next, queue, records }).restore();
    expectUpgraded(next, fxAllSites.kv as FixtureKv, [false, false, false]);
    await expectStored(records, fxAllSites.kv as FixtureKv);
  });

  it('AC179: a world saved after the update has terrainVersion 2 and is never stamped again', async () => {
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
    expect((await records.get('world')).terrainVersion).toBe(2);
    const b = makeGame();
    await createWorldSave({ game: b, queue, records }).restore();
    expect(b.world.get(cell.x, cell.y, cell.z)).toBe(AIR);
    expect(snapshot(b.world)).toEqual(snapshot(a.world));
  });

  it('AC179: a cancelled restore writes nothing and does not touch the game', async () => {
    const { records, queue } = await setupDb();
    await seedKv(records, fxNone.kv as FixtureKv);
    const g = makeGame();
    const before = snapshot(g.world);
    const ws = createWorldSave({ game: g, queue, records });
    const p = ws.restore();
    ws.cancel();
    await p;
    expect(await records.get('worldV1')).toBeNull();
    expect(snapshot(g.world)).toEqual(before);
  });

  it('AC179: the skip test uses the old diff only, at any height, and the margin counts', () => {
    const oost = VILLAGE_SITES[1]!;
    const r = siteRegion(oost);
    expect(siteBlocked(oost, [], [])).toBe(false);
    expect(siteBlocked(oost, [cellIndex(r.x0, 1, r.z0) * 256], [])).toBe(true);
    expect(siteBlocked(oost, [cellIndex(r.x1, WORLD_HEIGHT - 1, r.z1) * 256 + 3], [])).toBe(true);
    expect(siteBlocked(oost, [cellIndex(r.x0 - 1, 10, r.z0) * 256 + 3], [])).toBe(false);
    expect(siteBlocked(oost, [], [{ x: r.x0 - 1.5, z: r.z0 + 1 }])).toBe(true);
    expect(siteBlocked(oost, [], [{ x: 32.5, z: 32.5 }])).toBe(false);
  });

  it('AC179: standing spots come from the player, dinos, chickens and eggs; broken entries are left out', () => {
    expect(standingSpots({ x: 1, y: 11, z: 2 }, { dinos: [{ x: 3, z: 4 }, { x: 'a' }], eggs: [{ x: 5, z: 6 }] })).toEqual([
      { x: 1, z: 2 }, { x: 3, z: 4 }, { x: 5, z: 6 },
    ]);
    // The empty default player (y = 0) is not a saved spot.
    expect(standingSpots({ x: 0, y: 0, z: 0 }, null)).toEqual([]);
  });

  it('AC179: upgradeV1World with no changes gives exactly the version 2 world', () => {
    expect(upgradeV1World([], [])).toEqual({ diff: [], stamped: [true, true, true] });
    const kept = upgradeV1World([], [], { stamp: false });
    expect(kept.stamped).toEqual([false, false, false]);
    expect(kept.diff.length).toBeGreaterThan(0);
  });
});

