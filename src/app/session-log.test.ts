import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createRecords } from '../storage/records';
import { formatGivenResponse, writeEffects } from './session-log';

async function setup(points = 10) {
  const db = await openDb({ name: `session-log-${Math.random()}` });
  const records = createRecords(db);
  await records.put('economy', { points, practicePointsToday: 0, practiceDay: '' });
  return { db, records, logStore: createLogStore(db) };
}

const base = { ts: 5, day: '2026-10-26', reason: 'break' as const };
const eco = (points: number, practicePointsToday = 0, practiceDay = '') => ({ points, practicePointsToday, practiceDay });

describe('session-log writeEffects (R2b, AC166 to AC170)', () => {
  it('R2b: a delta and its ledger row land together', async () => {
    const { db, records, logStore } = await setup(10);
    const total = await writeEffects(db, { ...base, applied: 2, sessionEconomy: eco(12, 2, '2026-10-26') });
    expect(total).toBe(12);
    expect(await records.get('economy')).toEqual(eco(12, 2, '2026-10-26'));
    expect(await logStore.listLedger()).toEqual([{ id: 1, ts: 5, day: '2026-10-26', delta: 2, reason: 'break' }]);
    db.close();
  });

  it('R2b: a loss is written as malus', async () => {
    const { db, logStore } = await setup(10);
    await writeEffects(db, { ...base, applied: -1, sessionEconomy: eco(9) });
    expect((await logStore.listLedger())[0]).toMatchObject({ delta: -1, reason: 'malus' });
    db.close();
  });

  it('R2b: a zero delta writes no ledger row (V9c)', async () => {
    const { db, records, logStore } = await setup(10);
    await writeEffects(db, { ...base, applied: 0, sessionEconomy: eco(10) });
    expect(await logStore.listLedger()).toEqual([]);
    expect((await records.get('economy')).points).toBe(10);
    db.close();
  });

  it('R2b: a write that throws leaves both economy and ledger unchanged', async () => {
    const { db, records, logStore } = await setup(10);
    // A function cannot be cloned into IndexedDB, so the ledger add throws inside the transaction,
    // after the economy put.
    await expect(
      writeEffects(db, {
        ...base,
        applied: 3,
        sessionEconomy: eco(13),
        day: (() => undefined) as unknown as string,
      }),
    ).rejects.toBeDefined();
    expect((await records.get('economy')).points).toBe(10);
    expect(await logStore.listLedger()).toEqual([]);
    db.close();
  });

  it('R2b: a points change by another writer between two answers is kept', async () => {
    const { db, records } = await setup(10);
    await writeEffects(db, { ...base, applied: 2, sessionEconomy: eco(12) });
    // A golden egg or a restore changes the total behind the session's back.
    await records.update('economy', (e) => ({ ...e, points: e.points + 50 }));
    // The session still thinks the total is 12 and now earns 2 more.
    const total = await writeEffects(db, { ...base, applied: 2, sessionEconomy: eco(14) });
    expect(total).toBe(64);
    expect((await records.get('economy')).points).toBe(64);
    db.close();
  });

  it('R2b: the total never goes below zero', async () => {
    const { db } = await setup(0);
    expect(await writeEffects(db, { ...base, applied: -1, sessionEconomy: eco(0) })).toBe(0);
    db.close();
  });

  it('R2b: formatGivenResponse gives the text the kid saw', () => {
    const choice = { id: 'a', type: 'choice', options: ['x', 'y'] } as never;
    expect(formatGivenResponse(choice, { type: 'choice', index: 1 })).toBe('y');
    expect(formatGivenResponse(choice, { type: 'find-error', index: -1 })).toBe('geen fout');
    expect(formatGivenResponse(choice, { type: 'type', text: '42' })).toBe('42');
    expect(formatGivenResponse(choice, { type: 'punctuate', gaps: ['.', '!'] as never })).toBe('.,!');
  });
});
