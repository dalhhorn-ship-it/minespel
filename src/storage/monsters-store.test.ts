import { describe, expect, it } from 'vitest';
import { get, openDb, put } from './db';
import { creatureSwitches, prepareMonsters, updateMonsters } from './monsters-store';
import { createRecords } from './records';
import { defaultKv, type KnightRecord } from './schema';

let n = 0;
const fresh = () => openDb({ name: `monsters-db-${n++}` });
const knight = (id: string): KnightRecord => ({ id, mode: 'follow', spot: null, boughtFor: 30 });

describe('prepareMonsters: the first start rule (decision 135)', () => {
  it('AC226: no records at all is a new install: bubble Aan and the default monsters record', async () => {
    const db = await fresh();
    expect((await prepareMonsters(db))?.bubbleEnabled).toBe(true);
    const records = createRecords(db);
    expect((await records.get('settings')).bubbleEnabled).toBe(true);
    expect(await get(db, 'kv', 'monsters')).toEqual({ knights: [], bubbleClockMs: 0, hintShown: false });
    db.close();
  });

  it('AC209 AC226: a 0.6.0 save gives bubble Uit and nothing else changes', async () => {
    const db = await fresh();
    const settings = { breakEveryMinutes: 8, questionsPerBreak: 3, volume: 0.2, largeFont: true, newLessonsEnabled: false, breakWarningEnabled: false, soundEffectsEnabled: false, pointsMode: 'moeilijk' };
    const economy = { points: 77, practicePointsToday: 2, practiceDay: '2026-11-01', fluit: true };
    await put(db, 'kv', settings, 'settings');
    await put(db, 'kv', economy, 'economy');
    await put(db, 'kv', defaultKv('player'), 'player');
    expect((await prepareMonsters(db))?.bubbleEnabled).toBe(false);
    expect(await get(db, 'kv', 'settings')).toEqual({ ...settings, bubbleEnabled: false });
    expect(await get(db, 'kv', 'economy')).toEqual(economy);
    expect(await get(db, 'kv', 'monsters')).toEqual(defaultKv('monsters'));
    const read = await createRecords(db).get('settings');
    expect([read.monstersEnabled, read.knightsEnabled, read.bubbleEnabled]).toEqual([true, true, false]);
    db.close();
  });

  it('any one of world, player, economy or dinos makes it an existing install', async () => {
    for (const name of ['world', 'player', 'economy', 'dinos'] as const) {
      const db = await fresh();
      await put(db, 'kv', defaultKv(name), name);
      await prepareMonsters(db);
      expect((await createRecords(db).get('settings')).bubbleEnabled).toBe(false);
      db.close();
    }
  });

  it('runs once: an existing monsters record and the switches are left alone', async () => {
    const db = await fresh();
    await put(db, 'kv', { knights: [knight('a')], bubbleClockMs: 5, hintShown: true }, 'monsters');
    await put(db, 'kv', { ...defaultKv('settings'), bubbleEnabled: true }, 'settings');
    expect(await prepareMonsters(db)).toBeNull();
    expect((await get<{ knights: unknown[] }>(db, 'kv', 'monsters'))?.knights).toHaveLength(1);
    expect((await createRecords(db).get('settings')).bubbleEnabled).toBe(true);
    db.close();
  });
});

describe('updateMonsters: one transaction per write', () => {
  it('AC209: two writers in a row both land', async () => {
    const db = await fresh();
    await prepareMonsters(db);
    await Promise.all([
      updateMonsters(db, (m) => ({ ...m, knights: [...m.knights, knight('a')] })),
      updateMonsters(db, (m) => ({ ...m, bubbleClockMs: 9000 })),
      updateMonsters(db, (m) => ({ ...m, knights: [...m.knights, knight('b')] })),
    ]);
    const m = await createRecords(db).get('monsters');
    expect(m.knights.map((k) => k.id)).toEqual(['a', 'b']);
    expect(m.bubbleClockMs).toBe(9000);
    db.close();
  });

  it('a change that throws writes nothing and the next call still works', async () => {
    const db = await fresh();
    await prepareMonsters(db);
    await expect(updateMonsters(db, () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await updateMonsters(db, (m) => ({ ...m, hintShown: true }));
    expect((await createRecords(db).get('monsters')).hintShown).toBe(true);
    db.close();
  });

  it('a missing record starts from the default', async () => {
    const db = await fresh();
    const next = await updateMonsters(db, (m) => ({ ...m, knights: [knight('z')] }));
    expect(next).toEqual({ knights: [knight('z')], bubbleClockMs: 0, hintShown: false });
    db.close();
  });
});

describe('creatureSwitches', () => {
  it('AC226: missing master and Ridders read as Aan, a missing bubble as Uit', () => {
    expect(creatureSwitches({})).toEqual({ knights: true, bubble: false });
  });
  it('the master off turns everything off', () => {
    expect(creatureSwitches({ monstersEnabled: false, knightsEnabled: true, bubbleEnabled: true })).toEqual({ knights: false, bubble: false });
  });
  it('Ridders off turns the bubble off too', () => {
    expect(creatureSwitches({ monstersEnabled: true, knightsEnabled: false, bubbleEnabled: true })).toEqual({ knights: false, bubble: false });
  });
  it('all three on gives knights and bubble', () => {
    expect(creatureSwitches({ monstersEnabled: true, knightsEnabled: true, bubbleEnabled: true })).toEqual({ knights: true, bubble: true });
  });
  it('bubble off with the others on gives knights only', () => {
    expect(creatureSwitches({ monstersEnabled: true, knightsEnabled: true, bubbleEnabled: false })).toEqual({ knights: true, bubble: false });
  });
});
