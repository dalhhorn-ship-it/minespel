import { describe, expect, it } from 'vitest';
import { get, openDb, put } from './db';
import { createRecords, getRecord, putRecord } from './records';
import { KV_NAMES, defaultKv, type KvName, type KvRecords } from './schema';

let n = 0;
const fresh = () => openDb({ name: `records-db-${n++}` });

const samples: { [K in KvName]: KvRecords[K] } = {
  settings: {
    breakEveryMinutes: 15,
    questionsPerBreak: 5,
    volume: 0.2,
    largeFont: true,
    newLessonsEnabled: false,
    breakWarningEnabled: false,
    soundEffectsEnabled: false,
    pointsMode: 'moeilijk',
  },
  player: {
    x: 1,
    y: 2,
    z: 3,
    yaw: 0.5,
    pitch: -0.2,
    hotbar: [1, 2, 3],
    selectedSlot: 2,
    mode: 'build',
  },
  world: { diff: new Uint32Array([256 + 1, 512 + 2]), terrainVersion: 2 },
  worldV1: { diff: new Uint32Array([256 + 3]) },
  dinos: {
    dinos: [{ kind: 'rex', name: 'Rex' }],
    eggs: [{ kind: 'tri', golden: true }],
  },
  economy: { points: 12, practicePointsToday: 3, practiceDay: '2026-10-17' },
  timers: { playMsLeft: 1000, examMsLeft: 2000 },
  rotation: { weights: { a: 2 }, topicPointers: { t: 4 }, lessonsSeen: ['s1'] },
  switches: { modules: { taal: { on: true } } },
  session: { kind: 'break', step: 2 },
  gate: {
    salt: 's',
    pinHash: 'h',
    wrongTries: 1,
    blockedUntil: 99,
    resetWrongTries: 0,
  },
  stats: { playMsPerDay: { '2026-10-17': 60000 } },
  meta: {
    schemaVersion: 1,
    appVersion: '0.1',
    lastBackup: '2026-10-17',
    createdAt: '2026-10-01',
  },
  village: { found: [35, 39], cooldownMs: 90_000, lastVillager: 'v3', stock: { '35': 2, '39': 0 } },
};

describe('records', () => {
  it('has a sample for every kv name', () => {
    expect(Object.keys(samples).sort()).toEqual([...KV_NAMES].sort());
  });

  for (const name of KV_NAMES) {
    it(`${name}: default when empty, round trip after put (AC172: pointsMode moeilijk stays)`, async () => {
      const db = await fresh();
      const records = createRecords(db);
      expect(await records.get(name)).toEqual(defaultKv(name));
      await records.put(name, samples[name] as never);
      const back = await records.get(name);
      if (name === 'world' || name === 'worldV1') {
        // fake-indexeddb clones in another realm in jsdom, so compare the numbers.
        const want = samples[name] as KvRecords['world'];
        expect(Array.from((back as KvRecords['world']).diff)).toEqual(Array.from(want.diff));
        expect((back as KvRecords['world']).terrainVersion).toBe(want.terrainVersion);
      } else {
        expect(back).toEqual(samples[name]);
      }
      db.close();
    });
  }

  it('keeps the world diff as a Uint32Array', async () => {
    const db = await fresh();
    await putRecord(db, 'world', samples.world);
    const w = await getRecord(db, 'world');
    expect(Object.prototype.toString.call(w.diff)).toBe('[object Uint32Array]');
    expect([...w.diff]).toEqual([257, 514]);
    db.close();
  });

  it('fills missing fields from the default for an older save', async () => {
    const db = await fresh();
    await put(db, 'kv', { points: 7 }, 'economy');
    expect(await getRecord(db, 'economy')).toEqual({
      points: 7,
      practicePointsToday: 0,
      practiceDay: '',
    });
    db.close();
  });

  it('fills the newer settings from the default for an old settings save', async () => {
    const db = await fresh();
    await put(
      db,
      'kv',
      {
        breakEveryMinutes: 12,
        questionsPerBreak: 4,
        volume: 0.3,
        largeFont: true,
      },
      'settings',
    );
    expect(await getRecord(db, 'settings')).toEqual({
      breakEveryMinutes: 12,
      questionsPerBreak: 4,
      volume: 0.3,
      largeFont: true,
      newLessonsEnabled: true,
      breakWarningEnabled: true,
      soundEffectsEnabled: true,
      pointsMode: 'normaal',
    });
    db.close();
  });

  it('meta has lastBackup, null by default', async () => {
    const db = await fresh();
    expect((await getRecord(db, 'meta')).lastBackup).toBeNull();
    db.close();
  });

  it('gives a fresh default each time', async () => {
    const db = await fresh();
    const a = await getRecord(db, 'dinos');
    a.dinos.push({});
    expect((await getRecord(db, 'dinos')).dinos).toEqual([]);
    db.close();
  });

  it('update changes and saves a record', async () => {
    const db = await fresh();
    const records = createRecords(db);
    await records.update('economy', (e) => ({ ...e, points: e.points + 5 }));
    await records.update('economy', (e) => ({ ...e, points: e.points + 5 }));
    expect((await records.get('economy')).points).toBe(10);
    expect(await get(db, 'kv', 'economy')).toMatchObject({ points: 10 });
    db.close();
  });
  it('AC193: a 0.5.0 village record (no stock) reads back without a stock, so the upgrade can see it', async () => {
    const db = await fresh();
    const records = createRecords(db);
    await records.put('village', { found: [36], cooldownMs: 5000, lastVillager: 'v2' });
    const back = await records.get('village');
    expect(back).toEqual({ found: [36], cooldownMs: 5000, lastVillager: 'v2' });
    expect(back.stock).toBeUndefined();
    db.close();
  });
});
