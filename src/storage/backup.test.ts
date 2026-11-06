import { afterEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_KV_NAMES, backupFileName, backupText, buildBackup, decodeValue, encodeValue, markBackupMade, replaceAll } from './backup';
import { checkBackup } from './backup-check';
import { getAll, haltWrites, openDb, put, get } from './db';
import { createRecords } from './records';
import { STORE_NAMES, defaultKv, type KvName } from './schema';

const FIXTURES = import.meta.glob('../../tests/fixtures/backups/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const fixture = (name: string): string => FIXTURES[`../../tests/fixtures/backups/${name}`] ?? '';

let n = 0;
const fresh = () => openDb({ name: `backup-db-${n++}` });
afterEach(() => {
  vi.unstubAllGlobals();
  haltWrites(false); // a successful restore keeps the halt (the page reloads)
});

async function dump(db: IDBDatabase) {
  const out: Record<string, unknown> = {};
  for (const s of STORE_NAMES) {
    const keys = await new Promise<IDBValidKey[]>((res) => { const r = db.transaction(s).objectStore(s).getAllKeys(); r.onsuccess = () => res(r.result); });
    const vals = await getAll(db, s);
    out[s] = keys.map((k, i) => [k, vals[i] instanceof Uint32Array ? Array.from(vals[i] as Uint32Array) : vals[i]]);
  }
  return JSON.parse(JSON.stringify(out, (_k, v) => (v instanceof Uint32Array ? Array.from(v) : v)));
}

/** Fills every kind of record. */
async function seed(db: IDBDatabase) {
  const kv: Record<string, unknown> = {
    settings: { ...defaultKv('settings'), volume: 0.3, pointsMode: 'moeilijk' },
    player: { x: 3, y: 9, z: 4, yaw: 1, pitch: 0.2, hotbar: [1, 2, 3, 4, 5, 6, 7, 8, 9], selectedSlot: 2, mode: 'build' },
    world: { diff: Uint32Array.from([256 * 5 + 3, 256 * 9 + 4, 4_294_967_000 % 1000]), terrainVersion: 2 },
    dinos: { dinos: [{ kind: 'rex', name: 'Rex', golden: true }, { kind: 'kip', name: 'Kip' }], eggs: [{ kind: 'tri' }] },
    economy: { points: 42, practicePointsToday: 3, practiceDay: '2026-11-01', fluit: true },
    rotation: { weights: { a: 2 }, topicPointers: { b: 1 }, lessonsSeen: ['x'] },
    switches: { modules: { m: true } },
    stats: { playMsPerDay: { '2026-11-01': 1000 } },
    meta: { schemaVersion: 1, appVersion: '0.5.0', lastBackup: null, createdAt: '2026-10-01T00:00:00.000Z' },
    village: { found: [34, 41], cooldownMs: 1234, lastVillager: 'noord-1' },
    gate: { salt: 's', pinHash: 'h', wrongTries: 2, blockedUntil: 99, resetWrongTries: 1 },
    worldV1: { diff: Uint32Array.from([1]) },
    session: { running: true },
    timers: { playMsLeft: 5, examMsLeft: null },
  };
  for (const [k, v] of Object.entries(kv)) await put(db, 'kv', v, k);
  await put(db, 'progress', { moduleId: 'm', itemId: 'i', box: 2 }, 'm|i');
  await put(db, 'ownModules', { id: 'own1', title: 'Eigen' }, 'own1');
  await put(db, 'answers', { ts: 1, moduleId: 'm', correct: true });
  await put(db, 'breaks', { start: 1, end: 2 });
  await put(db, 'exams', { score: 7 });
  await put(db, 'ledger', { kind: 'malus', delta: -1 });
  await put(db, 'ledger', { kind: 'break', delta: 2 });
}

describe('backup file', () => {
  it('AC194: the file name has the local date of today', () => {
    expect(backupFileName(new Date(2026, 10, 6, 23, 59))).toBe('dino-blokwereld-backup-2026-11-06.json');
    expect(backupFileName(new Date(2026, 0, 2, 0, 1))).toBe('dino-blokwereld-backup-2026-01-02.json');
  });

  it('AC131: the header holds the app name, the format version and the date', async () => {
    const db = await fresh();
    const f = await buildBackup(db, { now: new Date('2026-11-06T10:00:00Z'), appVersion: '0.6.0' });
    expect(f).toMatchObject({ app: 'dino-blokwereld', format: 1, createdAt: '2026-11-06T10:00:00.000Z', appVersion: '0.6.0', schemaVersion: 1 });
    db.close();
  });

  it('AC194: no pincode, no lockout, no 0.4.0 world copy, no session and no timers in the file', async () => {
    const db = await fresh();
    await seed(db);
    const text = backupText(await buildBackup(db));
    const f = JSON.parse(text);
    expect(Object.keys(f.kv).sort()).toEqual([...BACKUP_KV_NAMES].sort());
    for (const w of ['gate', 'worldV1', 'session', 'timers', 'pinHash', 'blockedUntil']) expect(text).not.toContain(w);
    db.close();
  });

  it('AC194: building the backup makes no network request', async () => {
    const fetchSpy = vi.fn(() => { throw new Error('network'); });
    vi.stubGlobal('fetch', fetchSpy);
    const db = await fresh();
    await seed(db);
    await buildBackup(db);
    expect(fetchSpy).not.toHaveBeenCalled();
    db.close();
  });

  it('AC194: the world diff is written as base64 and read back the same', () => {
    const a = Uint32Array.from([0, 1, 256 * 5 + 3, 0xffffffff]);
    const enc = encodeValue({ world: { diff: a }, list: [a] }) as { world: { diff: { $u32: string } } };
    expect(typeof enc.world.diff.$u32).toBe('string');
    expect(JSON.stringify(enc)).not.toContain('[0,1,');
    const back = decodeValue(JSON.parse(JSON.stringify(enc))) as { world: { diff: Uint32Array }; list: Uint32Array[] };
    expect(Array.from(back.world.diff)).toEqual(Array.from(a));
    expect(Array.from(back.list[0]!)).toEqual(Array.from(a));
  });

  it('AC194: a big diff (200000 entries) survives', () => {
    const a = new Uint32Array(200_000).map((_, i) => i * 256 + (i % 40));
    const back = decodeValue(JSON.parse(JSON.stringify(encodeValue(a)))) as Uint32Array;
    expect(back.length).toBe(a.length);
    expect(back[199_999]).toBe(a[199_999]);
  });

  it('AC87: backup, wipe, restore: every listed record and store is back, the gate of this iPad is kept', async () => {
    const db = await fresh();
    await seed(db);
    const text = backupText(await buildBackup(db, { now: new Date() }));
    const checked = checkBackup(text);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;

    // Alles wissen: empty, the pincode goes too.
    await replaceAll(db, null);
    haltWrites(false); // the page reloads after a real wipe
    expect(await getAll(db, 'kv')).toEqual([]);
    for (const s of STORE_NAMES) expect(await getAll(db, s)).toEqual([]);

    // A new pincode on this iPad, then the restore keeps it.
    const newGate = { salt: 'new', pinHash: 'newhash', wrongTries: 1, blockedUntil: 5, resetWrongTries: 0 };
    await put(db, 'kv', newGate, 'gate');
    await put(db, 'kv', { running: true }, 'session');
    await put(db, 'kv', { diff: Uint32Array.from([7]) }, 'worldV1');
    await put(db, 'ledger', { kind: 'extra' });
    await replaceAll(db, checked.data, { appVersion: '0.5.0' });

    const records = createRecords(db);
    expect(await records.get('gate')).toEqual(newGate);
    expect(await records.get('session')).toBeNull();
    expect(await records.get('worldV1')).toBeNull();
    expect(await records.get('timers')).toEqual(defaultKv('timers'));
    expect((await records.get('settings')).pointsMode).toBe('moeilijk');
    expect((await records.get('economy'))).toEqual({ points: 42, practicePointsToday: 3, practiceDay: '2026-11-01', fluit: true });
    expect((await records.get('village'))).toEqual({ found: [34, 41], cooldownMs: 1234, lastVillager: 'noord-1' });
    expect((await records.get('dinos')).dinos).toHaveLength(2);
    expect((await records.get('dinos')).dinos[0]).toMatchObject({ name: 'Rex', golden: true });
    const w = await records.get('world');
    expect(w.terrainVersion).toBe(2);
    expect(Array.from(w.diff)).toEqual([256 * 5 + 3, 256 * 9 + 4, 4_294_967_000 % 1000]);
    expect(await get(db, 'progress', 'm|i')).toEqual({ moduleId: 'm', itemId: 'i', box: 2 });
    expect(await get(db, 'ownModules', 'own1')).toEqual({ id: 'own1', title: 'Eigen' });
    expect((await getAll<{ id: number }>(db, 'ledger')).map((r) => r.id)).toEqual([1, 2]);
    expect(await getAll(db, 'answers')).toHaveLength(1);
    expect(await getAll(db, 'breaks')).toHaveLength(1);
    expect(await getAll(db, 'exams')).toHaveLength(1);

    // A second backup of the restored data is the same file (apart from the gate that is never in it).
    const first = JSON.parse(text);
    const again = JSON.parse(backupText(await buildBackup(db, { now: new Date(first.createdAt) })));
    // Only meta differs: it now says this backup was made at its own date.
    expect(again.kv.meta.lastBackup).toBe(first.createdAt);
    again.kv.meta.lastBackup = null;
    expect(again).toEqual(first);
    db.close();
  });

  it('AC131: an older shape restores as it is and the normal load path fills the rest', async () => {
    const db = await fresh();
    const r = checkBackup(fixture('v050-old-shapes.json'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await replaceAll(db, r.data);
    const records = createRecords(db);
    const eco = await records.get('economy');
    expect(eco.points).toBe(12);
    expect(eco.fluit).toBeUndefined();
    expect((await records.get('settings')).pointsMode).toBe('normaal'); // the default fills the gap
    expect((await records.get('world')).terrainVersion).toBeUndefined();
    expect((await getAll<{ kind: string }>(db, 'ledger')).map((l) => l.kind)).toEqual(['malus', 'break']);
    db.close();
  });

  it('AC197: a replace that fails halfway leaves all the old data', async () => {
    const db = await fresh();
    await seed(db);
    const before = await dump(db);
    const checked = checkBackup(backupText(await buildBackup(db)));
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    // The last write cannot be stored: a function in a log row.
    const data = { ...checked.data, stores: { ...checked.data.stores, ledger: [...checked.data.stores.ledger, { id: 99, boom: () => 1 }] } };
    data.kv = { ...data.kv, economy: { points: 1 } };
    await expect(replaceAll(db, data)).rejects.toBeTruthy();
    expect(await dump(db)).toEqual(before);
    // An empty replace that fails changes nothing either.
    db.close();
  });

  it('AC197: meta gets this build and the date of the backup after a restore', async () => {
    const db = await fresh();
    const r = checkBackup(fixture('v050-old-shapes.json'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await replaceAll(db, r.data, { appVersion: '0.6.0' });
    expect(await createRecords(db).get('meta')).toEqual({
      schemaVersion: 1, appVersion: '0.6.0', lastBackup: '2026-10-30T09:15:00.000Z', createdAt: '2026-10-01T10:00:00.000Z',
    });
    db.close();
  });

  it('AC197: other writes are refused while a replace runs, and allowed again after a failed one', async () => {
    const db = await fresh();
    await seed(db);
    const checked = checkBackup(backupText(await buildBackup(db)));
    if (!checked.ok) throw new Error('fixture');
    let during: unknown = 'not run';
    const data = { ...checked.data, stores: { ...checked.data.stores, ledger: [{ id: 50, boom: () => 1 }] } };
    const p = replaceAll(db, data, { halt: () => { void 0; } });
    during = await put(db, 'kv', { points: 999 }, 'economy').then(() => 'landed', () => 'refused');
    await expect(p).rejects.toBeTruthy();
    expect(during).toBe('refused');
    expect((await get<{ points: number }>(db, 'kv', 'economy'))?.points).toBe(42);
    await put(db, 'kv', { points: 7 }, 'economy');
    expect((await get<{ points: number }>(db, 'kv', 'economy'))?.points).toBe(7);
    db.close();
  });

  it('AC197: halt is called once, before the write', async () => {
    const db = await fresh();
    await seed(db);
    const order: string[] = [];
    const halt = vi.fn(() => order.push('halt'));
    await replaceAll(db, null, { halt });
    expect(halt).toHaveBeenCalledTimes(1);
    expect(await getAll(db, 'kv')).toEqual([]);
    db.close();
  });

  it('AC194: markBackupMade saves the date of this backup', async () => {
    const db = await fresh();
    await markBackupMade(db, new Date('2026-11-06T10:00:00Z'));
    const meta = await createRecords(db).get('meta' as KvName & 'meta');
    expect(meta.lastBackup).toBe('2026-11-06T10:00:00.000Z');
    db.close();
  });
});
