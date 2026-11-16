import { describe, expect, it } from 'vitest';
import fxNone from '../../tests/fixtures/saves/v1-village-none.json';
import fxOneSite from '../../tests/fixtures/saves/v1-village-one-site.json';
import fxAllSites from '../../tests/fixtures/saves/v1-village-all-sites.json';
import fxStanding from '../../tests/fixtures/saves/v1-village-standing.json';
import fxRandom from '../../tests/fixtures/saves/v1-village-random-500.json';
import { type Change, hutChanges, save040, save070 } from '../../tests/fixtures/move/old-saves';
import { openDb, request, transact } from '../storage/db';
import type { DinosRecord, KnightRecord, MonstersRecord, PlayerRecord } from '../storage/schema';
import { moveOldSave } from '../storage/world-move-store';
import { AIR, SMARAGD, STEEN } from '../world/blocks';
import { mineBlock } from '../world/build';
import { LEGACY_CELL_COUNT, LEGACY_SEED, LEGACY_SIZE, LEGACY_START_SPOT, generateLegacyTerrain, legacyCellIndex } from '../world/terrain-legacy';
import { CELL_COUNT, START_SPOT, WORLD_SEED, cellIndex, generateTerrain } from '../world/terrain';
import { MOVE, startWorld } from '../world/terrain-v3';
import { LEGACY_VILLAGE_SITES, inRegion, siteHasHouses, siteRegion } from '../world/village-layout';
import { World } from '../world/world';
import {
  moveLegacyDiff, movePoint, moveRecords, siteBlocked, standingSpots, upgradeV1World,
} from './world-move';

/** Cell for cell equality. `toEqual` on 1.3 million cells is slow, and a failing `expect` would print them. */
function sameCells(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

let n = 0;
const fresh = () => openDb({ name: `world-move-${n++}` });
const START = startWorld(WORLD_SEED);

async function seed(db: IDBDatabase, kv: Record<string, unknown>): Promise<void> {
  await transact(db, 'kv', 'readwrite', async (tx) => {
    for (const [k, v] of Object.entries(kv)) await request(tx.objectStore('kv').put(v, k));
  });
}

/** Every kv record as stored, by key. */
async function dump(db: IDBDatabase): Promise<Map<string, unknown>> {
  return transact(db, 'kv', 'readonly', async (tx) => {
    const kv = tx.objectStore('kv');
    const keys = await request<IDBValidKey[]>(kv.getAllKeys());
    const out = new Map<string, unknown>();
    for (const k of keys) out.set(String(k), await request<unknown>(kv.get(k)));
    return out;
  });
}

function seedOf(s: ReturnType<typeof save070>): Record<string, unknown> {
  return {
    world: s.world, player: s.player, dinos: s.dinos, economy: s.economy, village: s.village, monsters: s.monsters, settings: s.settings,
  };
}

const step = (p: { x: number; y: number; z: number }) => ({ x: p.x + MOVE.x, y: p.y + MOVE.y, z: p.z + MOVE.z });

/** The 0.7.0 world of a save: legacy version 2 plus the changes, in legacy coordinates. */
function legacyReal(changes: readonly Change[]): Uint8Array {
  const real = generateLegacyTerrain(LEGACY_SEED, 2);
  for (const [x, y, z, id] of changes) real[legacyCellIndex(x, y, z)] = id;
  return real;
}

/** AC235: every legacy cell above the old oersteen layer is at the move with the same block. */
function expectMovedWorld(world: World, real: Uint8Array): void {
  let wrong = 0;
  for (let y = 1; y < 64; y++)
    for (let z = 0; z < LEGACY_SIZE; z++)
      for (let x = 0; x < LEGACY_SIZE; x++) {
        if (world.get(x + MOVE.x, y + MOVE.y, z + MOVE.z) !== real[legacyCellIndex(x, y, z)]) wrong++;
      }
  expect(wrong).toBe(0);
}

describe('moveLegacyDiff (AC235)', () => {
  it('AC235: each entry moves by (32, 10, 32) with the same block, sorted, equal cells dropped', () => {
    const i = legacyCellIndex(5, 30, 6);
    const j = legacyCellIndex(40, 12, 3);
    const out = moveLegacyDiff([j * 256 + SMARAGD, i * 256 + STEEN], START);
    const a = cellIndex(5 + 32, 30 + 10, 6 + 32);
    const b = cellIndex(40 + 32, 12 + 10, 3 + 32);
    expect(out).toEqual([a, b].sort((x, y) => x - y).map((c) => c * 256 + (c === a ? STEEN : SMARAGD)));
    // A cell whose block equals the start world at the new index is not a change.
    const same = cellIndex(40, 45, 40);
    const old = legacyCellIndex(8, 35, 8);
    expect(moveLegacyDiff([old * 256 + (START[cellIndex(40, 45, 40)] as number)], START)).toEqual([]);
    expect(same).toBeGreaterThan(0);
  });

  it('AC235: entries outside the legacy world are dropped', () => {
    expect(moveLegacyDiff([LEGACY_CELL_COUNT * 256 + 3, -5, 1.5], START)).toEqual([]);
  });

  it('movePoint adds the step and keeps other fields', () => {
    expect(movePoint({ x: 1.5, y: 2, z: 3.5, name: 'a' })).toEqual({ x: 33.5, y: 12, z: 35.5, name: 'a' });
  });
});

describe('moveRecords on the 0.7.0 builder save (AC235)', () => {
  const s = save070();
  const moved = moveRecords({ world: s.world, player: s.player, dinos: s.dinos, monsters: s.monsters });

  it('AC235: every kid changed cell is at the move with the same block, every other cell is the version 3 start world', () => {
    const w = new World();
    w.applyDiff(moved.world.diff);
    expect(moved.world.terrainVersion).toBe(3);
    expectMovedWorld(w, legacyReal(s.changes));
    // Cells outside the middle are untouched.
    const kidCells = new Set(moved.world.diff.map((e) => Math.floor(e / 256)));
    for (const e of moved.world.diff) {
      const x = Math.floor(e / 256) % 128;
      expect(x).toBeGreaterThanOrEqual(32);
      expect(x).toBeLessThan(96);
    }
    // Every diff entry really differs from the start world, and there are as many as the old ones.
    for (const e of moved.world.diff) expect(START[Math.floor(e / 256)]).not.toBe(e % 256);
    expect(moved.world.diff.length).toBe(s.world.diff.length);
    expect(kidCells.size).toBe(s.world.diff.length);
    expect(Array.from(moved.world.diff)).toEqual([...moved.world.diff].sort((a, b) => a - b));
  });

  it('AC235: the player is at the move and looks the same way, everything else about him is the same', () => {
    expect(moved.player).toEqual({ ...s.player, ...step(s.player) });
  });

  it('AC235: every dino, chicken and egg and every Vrij rondlopen spot is at the move', () => {
    const d = moved.dinos as DinosRecord;
    expect(d.dinos).toHaveLength(8);
    d.dinos.forEach((dino, k) => {
      const old = s.dinos.dinos[k] as Record<string, number>;
      expect(dino).toEqual({ ...old, x: old.x! + 32, y: old.y! + 10, z: old.z! + 32, stayX: old.stayX! + 32, stayZ: old.stayZ! + 32 });
    });
    d.eggs.forEach((egg, k) => {
      const old = s.dinos.eggs[k] as Record<string, number>;
      expect(egg).toEqual({ ...old, x: old.x! + 32, y: old.y! + 10, z: old.z! + 32 });
    });
    expect(d.staySwitched).toBe(true);
  });

  it('AC235: both knights have their spot at the move, nothing else changes', () => {
    const m = moved.monsters as MonstersRecord;
    expect(m.knights).toHaveLength(2);
    m.knights.forEach((k: KnightRecord, i) => {
      const old = s.monsters.knights[i] as KnightRecord;
      expect(k).toEqual({ ...old, spot: step(old.spot!) });
    });
    expect(m.bubbleClockMs).toBe(s.monsters.bubbleClockMs);
    expect(m.hintShown).toBe(true);
  });

  it('a follower knight (spot null) and records that are missing or odd are left as they are', () => {
    const r = moveRecords({
      world: { diff: new Uint32Array(0), terrainVersion: 2 },
      player: { x: 'a' },
      dinos: { dinos: [null, { x: 1, y: 2 }], eggs: 'kapot' },
      monsters: { knights: [{ id: 'k', mode: 'follow', spot: null, boughtFor: 30 }], bubbleClockMs: 5, hintShown: false },
    });
    expect(r.player).toEqual({ x: 'a' });
    expect((r.dinos as { dinos: unknown[] }).dinos).toEqual([null, { x: 33, y: 12 }]);
    expect((r.dinos as { eggs: unknown }).eggs).toBe('kapot');
    expect((r.monsters as MonstersRecord).knights[0]!.spot).toBeNull();
    expect(moveRecords({}).player).toBeUndefined();
  });

  it('the empty default player (y = 0) stays as it is', () => {
    const r = moveRecords({ world: { diff: new Uint32Array(0), terrainVersion: 2 }, player: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 } });
    expect(r.player).toEqual({ x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
  });
});

describe('moveRecords on the 0.4.0 builder save (AC236)', () => {
  const s = save040();

  it('AC236: only the free sites get houses, every kid cell is the same as in the 0.4.0 world, at the move', () => {
    const moved = moveRecords({ world: s.world, player: s.player, dinos: s.dinos, monsters: s.monsters });
    const w = new World();
    w.applyDiff(moved.world.diff);
    // Site oost holds a kid change: no houses there. The others are stamped (they are part of the start world).
    const sites = LEGACY_VILLAGE_SITES.map((site) => ({ ...site }));
    const has = sites.map((site, k) => siteHasHouses((x, y, z) => w.get(x + MOVE.x, y + MOVE.y, z + MOVE.z), site) ? sites[k]!.id : null);
    expect(has).toEqual(['noord', null, 'west']);
    // The real 0.4.0 world of the kid, with the stamp at the free sites.
    const v1 = generateLegacyTerrain(LEGACY_SEED, 1);
    for (const [x, y, z, id] of s.changes) v1[legacyCellIndex(x, y, z)] = id;
    const v2 = generateLegacyTerrain(LEGACY_SEED, 2);
    const stamped = [true, false, true];
    let wrong = 0;
    for (let y = 1; y < 64; y++)
      for (let z = 0; z < 64; z++)
        for (let x = 0; x < 64; x++) {
          const i = legacyCellIndex(x, y, z);
          const k = LEGACY_VILLAGE_SITES.findIndex((site) => inRegion(siteRegion(site), x, z));
          const want = k >= 0 && stamped[k] ? v2[i] : v1[i];
          if (w.get(x + 32, y + 10, z + 32) !== want) wrong++;
        }
    expect(wrong).toBe(0);
    for (const [x, y, z, id] of s.changes) expect(w.get(x + 32, y + 10, z + 32)).toBe(id);
    expect(moved.world.terrainVersion).toBe(3);
  });

  it('AC236: the player and the spots move after the stamp', () => {
    const moved = moveRecords({ world: s.world, player: s.player });
    expect(moved.player).toEqual({ ...s.player, ...step(s.player) });
  });
});

describe('the 0.4.0 village rules in legacy coordinates (AC179, moved from world-save.test.ts)', () => {
  interface FixtureKv {
    world: { diff: number[] };
    player: Record<string, unknown>;
    dinos: { dinos: Record<string, unknown>[]; eggs: Record<string, unknown>[] };
  }
  const V1 = generateLegacyTerrain(LEGACY_SEED, 1);
  const V2 = generateLegacyTerrain(LEGACY_SEED, 2);
  const snapshotOf = (w: World): Uint8Array => {
    const out = new Uint8Array(LEGACY_CELL_COUNT);
    for (let y = 1; y < 64; y++)
      for (let z = 0; z < 64; z++) for (let x = 0; x < 64; x++) out[legacyCellIndex(x, y, z)] = w.get(x + 32, y + 10, z + 32);
    return out;
  };
  const oldWorld = (diff: readonly number[]): Uint8Array => {
    const b = V1.slice();
    for (const e of diff) b[Math.floor(e / 256)] = e % 256;
    return b;
  };
  const siteIndexOf = (index: number): number => {
    const x = index % 64;
    const z = Math.floor(index / 64) % 64;
    return LEGACY_VILLAGE_SITES.findIndex((s) => inRegion(siteRegion(s), x, z));
  };

  const FIXTURES: { name: string; kv: FixtureKv; stamped: boolean[] }[] = [
    { name: 'no changes', kv: fxNone.kv as FixtureKv, stamped: [true, true, true] },
    { name: 'changes inside one site only (oost)', kv: fxOneSite.kv as FixtureKv, stamped: [true, false, true] },
    { name: 'changes in all three sites', kv: fxAllSites.kv as FixtureKv, stamped: [false, false, false] },
    ...fxStanding.variants.map((v) => ({
      name: `only a ${v.who} stands in ${v.site}`,
      kv: v.kv as FixtureKv,
      stamped: LEGACY_VILLAGE_SITES.map((s) => s.id !== v.site),
    })),
    { name: '500 random changes spread over the world', kv: fxRandom.kv as FixtureKv, stamped: [false, false, false] },
  ];

  it('AC179: the fixtures are real 0.4.0 saves (no terrainVersion, only real changes)', () => {
    expect(fxRandom.kv.world.diff).toHaveLength(500);
    for (const f of FIXTURES) {
      for (const e of f.kv.world.diff) expect(V1[Math.floor(e / 256)]).not.toBe(e % 256);
      expect((f.kv.world as { terrainVersion?: number }).terrainVersion).toBeUndefined();
    }
  });

  for (const f of FIXTURES) {
    it(`AC236: ${f.name}: kid cells stay, only free sites get houses, then everything moves`, async () => {
      const db = await fresh();
      await seed(db, { world: { diff: Uint32Array.from(f.kv.world.diff) }, player: f.kv.player, dinos: f.kv.dinos });
      expect(await moveOldSave(db)).toBe('moved');
      const stored = (await dump(db)).get('world') as { diff: Uint32Array; terrainVersion: number };
      expect(stored.terrainVersion).toBe(3);
      const w = new World();
      w.applyDiff(stored.diff);
      const now = snapshotOf(w);
      const old = oldWorld(f.kv.world.diff);
      let wrong = 0;
      for (let y = 1; y < 64; y++)
        for (let z = 0; z < 64; z++)
          for (let x = 0; x < 64; x++) {
            const i = legacyCellIndex(x, y, z);
            const k = siteIndexOf(i);
            if (now[i] !== (k >= 0 && f.stamped[k] ? V2[i] : old[i])) wrong++;
          }
      expect(wrong).toBe(0);
      for (const e of f.kv.world.diff) expect(now[Math.floor(e / 256)]).toBe(e % 256);
      expect(LEGACY_VILLAGE_SITES.map((s) => siteHasHouses((x, y, z) => w.get(x + 32, y + 10, z + 32), s))).toEqual(f.stamped);
      // The player is at the move.
      const p = (await dump(db)).get('player') as Record<string, number>;
      expect(p.x).toBe((f.kv.player.x as number) + 32);
      expect(p.y).toBe((f.kv.player.y as number) + 10);
    });
  }

  it('AC179: the skip test uses the old diff only, at any height, and the margin counts', () => {
    const oost = LEGACY_VILLAGE_SITES[1]!;
    const r = siteRegion(oost);
    const idx = (x: number, y: number, z: number) => legacyCellIndex(x, y, z);
    expect(siteBlocked(oost, [], [])).toBe(false);
    expect(siteBlocked(oost, [idx(r.x0, 1, r.z0) * 256], [])).toBe(true);
    expect(siteBlocked(oost, [idx(r.x1, 63, r.z1) * 256 + 3], [])).toBe(true);
    expect(siteBlocked(oost, [idx(r.x0 - 1, 10, r.z0) * 256 + 3], [])).toBe(false);
    expect(siteBlocked(oost, [], [{ x: r.x0 - 1.5, z: r.z0 + 1 }])).toBe(true);
    expect(siteBlocked(oost, [], [{ x: 32.5, z: 32.5 }])).toBe(false);
  });

  it('AC179: standing spots come from the player, dinos, chickens and eggs; broken entries are left out', () => {
    expect(standingSpots({ x: 1, y: 11, z: 2 }, { dinos: [{ x: 3, z: 4 }, { x: 'a' }], eggs: [{ x: 5, z: 6 }] })).toEqual([
      { x: 1, z: 2 }, { x: 3, z: 4 }, { x: 5, z: 6 },
    ]);
    expect(standingSpots({ x: 0, y: 0, z: 0 }, null)).toEqual([]);
  });

  it('AC179: upgradeV1World with no changes gives exactly the version 2 world', () => {
    expect(upgradeV1World([], [])).toEqual({ diff: [], stamped: [true, true, true] });
    const kept = upgradeV1World([], [], { stamp: false });
    expect(kept.stamped).toEqual([false, false, false]);
    expect(kept.diff.length).toBeGreaterThan(0);
  });
});

describe('moveOldSave: one transaction at boot (AC235, AC237)', () => {
  it('AC235: the 0.7.0 save moves, the rest of the records stay byte for byte', async () => {
    const db = await fresh();
    const s = save070();
    await seed(db, seedOf(s));
    expect(await moveOldSave(db)).toBe('moved');
    const after = await dump(db);
    const w = new World();
    w.applyDiff((after.get('world') as { diff: Uint32Array }).diff);
    expectMovedWorld(w, legacyReal(s.changes));
    expect((after.get('world') as { terrainVersion: number }).terrainVersion).toBe(3);
    const wanted = moveRecords({ world: s.world, player: s.player, dinos: s.dinos, monsters: s.monsters });
    expect(after.get('player')).toEqual(wanted.player);
    expect(after.get('dinos')).toEqual(wanted.dinos);
    expect(after.get('monsters')).toEqual(wanted.monsters);
    // Points, ledger, found blocks, hotbar, bubble clock, hint flag and settings are the same as before.
    expect(after.get('economy')).toEqual(s.economy);
    expect(after.get('village')).toEqual(s.village);
    expect(after.get('settings')).toEqual(s.settings);
    expect((after.get('player') as PlayerRecord).hotbar).toEqual(s.player.hotbar);
    expect((after.get('monsters') as MonstersRecord).bubbleClockMs).toBe(123456);
    expect((after.get('monsters') as MonstersRecord).hintShown).toBe(true);
  });

  it('AC236: the 0.4.0 save moves the same way, the hut and the change in oost included', async () => {
    const db = await fresh();
    const s = save040();
    await seed(db, seedOf(s));
    expect(await moveOldSave(db)).toBe('moved');
    const after = await dump(db);
    const w = new World();
    w.applyDiff((after.get('world') as { diff: Uint32Array }).diff);
    for (const [x, y, z, id] of s.changes) expect(w.get(x + 32, y + 10, z + 32)).toBe(id);
    expect((after.get('world') as { terrainVersion: number }).terrainVersion).toBe(3);
  });

  it('AC237: a kill halfway leaves every record byte for byte as before, and the next run equals a run never killed', async () => {
    const s = save070();
    const killedDb = await fresh();
    await seed(killedDb, seedOf(s));
    const before = await dump(killedDb);
    expect(await moveOldSave(killedDb, { afterPut: () => { throw new Error('kill'); } })).toBe('failed');
    expect(await dump(killedDb)).toEqual(before);
    expect((before.get('world') as { terrainVersion: number }).terrainVersion).toBe(2);
    expect(await moveOldSave(killedDb)).toBe('moved');

    const cleanDb = await fresh();
    await seed(cleanDb, seedOf(s));
    expect(await moveOldSave(cleanDb)).toBe('moved');
    expect(await dump(killedDb)).toEqual(await dump(cleanDb));
  });

  it('AC237: a kill of the 0.4.0 move halfway leaves the old world, the next run stamps and moves', async () => {
    const s = save040();
    const db = await fresh();
    await seed(db, seedOf(s));
    const before = await dump(db);
    expect(await moveOldSave(db, { afterPut: () => { throw new Error('kill'); } })).toBe('failed');
    expect(await dump(db)).toEqual(before);
    expect(await moveOldSave(db)).toBe('moved');
  });

  it('AC237: after a move, 3 more runs change nothing (nothing moves twice)', async () => {
    const db = await fresh();
    await seed(db, seedOf(save070()));
    expect(await moveOldSave(db)).toBe('moved');
    const once = await dump(db);
    for (let k = 0; k < 3; k++) {
      expect(await moveOldSave(db)).toBe('none');
      expect(await dump(db)).toEqual(once);
    }
  });

  it('AC235: a new install gets a version 3 world record and nothing else, and is never moved later', async () => {
    const db = await fresh();
    expect(await moveOldSave(db)).toBe('new');
    const after = await dump(db);
    expect([...after.keys()]).toEqual(['world']);
    expect(after.get('world')).toEqual({ diff: new Uint32Array(0), terrainVersion: 3 });
    // The kid plays: a player record appears. The next open must not take it for an old save.
    await seed(db, { player: { x: 70.5, y: 21, z: 70.5, yaw: 0, pitch: 0, hotbar: [], selectedSlot: 0, mode: 'build' } });
    expect(await moveOldSave(db)).toBe('none');
    expect(((await dump(db)).get('player') as { x: number }).x).toBe(70.5);
  });

  it('AC236: a 0.6.0 save with no world record but a player moves, and the villages are stamped', async () => {
    const db = await fresh();
    const s = save070();
    await seed(db, { player: s.player, economy: s.economy, settings: s.settings });
    expect(await moveOldSave(db)).toBe('moved');
    const after = await dump(db);
    expect((after.get('world') as { terrainVersion: number }).terrainVersion).toBe(3);
    expect(after.get('player')).toEqual({ ...s.player, ...step(s.player) });
    expect([...after.keys()].sort()).toEqual(['economy', 'player', 'settings', 'world']);
    const w = new World();
    w.applyDiff((after.get('world') as { diff: Uint32Array }).diff);
    // The start world already holds all three villages: nothing differs from it.
    expect(w.diff()).toHaveLength(0);
  });

  it('only records that existed are written', async () => {
    const db = await fresh();
    const s = save070();
    await seed(db, { world: s.world, economy: s.economy });
    expect(await moveOldSave(db)).toBe('moved');
    expect([...(await dump(db)).keys()].sort()).toEqual(['economy', 'world']);
  });

  it('a transaction that cannot run gives failed', async () => {
    const db = await fresh();
    db.close();
    expect(await moveOldSave(db)).toBe('failed');
  });
});

describe('the start spot and the digging (AC230)', () => {
  it('AC230: the start spot is (64.5, legacy y + 10, 64.5) and the ground is 10 layers higher than in 0.7.0', () => {
    expect(START_SPOT).toEqual({ x: 64.5, y: LEGACY_START_SPOT.y + 10, z: 64.5 });
    const old = generateLegacyTerrain(LEGACY_SEED, 2);
    const w = new World();
    const x = Math.floor(START_SPOT.x);
    const z = Math.floor(START_SPOT.z);
    for (let y = 1; y < 64; y++) {
      expect(w.get(x, y + 10, z)).toBe(old[legacyCellIndex(x - 32, y, z - 32)]);
    }
  });

  it('AC230: the kid digs straight down from the start spot and every layer works until oersteen at y 0', () => {
    const w = new World();
    const x = START_SPOT.x;
    const z = START_SPOT.z;
    // The kid drops into the hole after each block, so the eye is always just above the next one.
    let feet = START_SPOT.y;
    let mined = 0;
    for (;;) {
      const r = mineBlock(w, { ox: x, oy: feet + 1.6, oz: z, dx: 0, dy: -1, dz: 0 });
      if (!r.ok) {
        expect(r.reason).toBe('unminable');
        break;
      }
      mined++;
      feet = r.y;
      expect(mined).toBeLessThan(60);
    }
    // The ground top is the start spot's feet y minus 1: that many layers down to y 1, so oersteen at y 0 comes next.
    expect(mined).toBe(START_SPOT.y - 1);
    expect(mined).toBeGreaterThanOrEqual(18);
    expect(w.get(Math.floor(x), 0, Math.floor(z))).not.toBe(AIR);
  });

  it('generateTerrain stays a safe copy of the start world', () => {
    const t = generateTerrain();
    expect(t.length).toBe(CELL_COUNT);
    expect(sameCells(t, START)).toBe(true);
  });
});

describe('hutChanges at the move (fixture sanity)', () => {
  it('the legacy hut sits at the same place after the move', () => {
    const base = generateLegacyTerrain(LEGACY_SEED, 2);
    const hut = hutChanges(base, 38, 18);
    const moved = moveLegacyDiff(
      hut.map(([x, y, z, id]) => legacyCellIndex(x, y, z) * 256 + id),
      START,
    );
    expect(moved.length).toBeGreaterThan(40);
    for (const e of moved) {
      const i = Math.floor(e / 256);
      expect(i % 128).toBeGreaterThanOrEqual(38 + 32);
      expect(i % 128).toBeLessThanOrEqual(42 + 32);
    }
  });
});
