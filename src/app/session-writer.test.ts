import { describe, expect, it } from 'vitest';
import type { Item } from '../content/format';
import type { SessionEffect, SessionState } from '../learning/break-session';
import { openDb } from '../storage/db';
import { createLogStore, type BreakInput } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords } from '../storage/records';
import { createSessionStore } from '../storage/session-store';
import { breakLogOf, commitStep, stepWrite, type StepWrite } from './session-writer';

let n = 0;
const fresh = () => openDb({ name: `session-writer-${n++}` });

const breakLog: BreakInput = {
  start: 1, end: 2, day: '2026-10-17', sessionId: 's1', moduleId: 'm', n: 5, score: 4, points: 6, endedBy: 'done', firstAnswerMs: [500, 900],
};
const answer = (itemId: string) => ({
  ts: 1, day: '2026-10-17', context: 'break' as const, sessionId: 's1', moduleId: 'm', topic: 't', skill: 'sk', level: 'M6', itemId, try: 1, correct: true, given: '5', ms: 100,
});
const rec = (itemId: string, box = 1) => ({ moduleId: 'm', itemId, box, due: '2026-10-18', level: 'M6', topic: 't', skill: 'sk', added: 50 });

async function snapshot(db: IDBDatabase) {
  const logs = createLogStore(db);
  const records = createRecords(db);
  return {
    session: await createSessionStore(db).load(),
    economy: await records.get('economy'),
    rotation: await records.get('rotation'),
    answers: await logs.listAnswers(),
    breaks: await logs.listBreaks(),
    ledger: await logs.listLedger(),
    progress: await createProgressStore(db).list(),
  };
}

describe('commitStep', () => {
  it('writes session, economy, rotation, logs, ledger, boxes and the break log together', async () => {
    const db = await fresh();
    await commitStep(db, {
      session: { kind: 'break', x: 1 },
      economy: { points: 7, practicePointsToday: 0, practiceDay: '' },
      rotation: { weights: {}, topicPointers: {}, lessonsSeen: ['m/t'] },
      answers: [answer('a')],
      ledger: [{ ts: 1, day: '2026-10-17', delta: 2, reason: 'break' }],
      boxes: [{ record: rec('a'), trim: false }],
      breakLog,
    });
    const s = await snapshot(db);
    expect(s.session).toEqual({ kind: 'break', x: 1 });
    expect(s.economy.points).toBe(7);
    expect(s.rotation.lessonsSeen).toEqual(['m/t']);
    expect(s.answers).toHaveLength(1);
    expect(s.ledger.map((l) => l.delta)).toEqual([2]);
    expect(s.progress[0]).toMatchObject({ itemId: 'a', seen: 1, added: 50 });
    expect(s.breaks[0]).toMatchObject({ points: 6, snelGeklikt: true });
  });

  it('a commit where one write throws leaves every store exactly as before', async () => {
    const db = await fresh();
    await commitStep(db, {
      session: { kind: 'break', x: 1 },
      economy: { points: 3, practicePointsToday: 0, practiceDay: '' },
      answers: [answer('old')],
      ledger: [{ ts: 1, day: '2026-10-17', delta: 3, reason: 'break' }],
      boxes: [{ record: rec('old'), trim: false }],
    });
    const before = await snapshot(db);
    const bad: StepWrite = {
      session: null,
      economy: { points: 99, practicePointsToday: 0, practiceDay: '' },
      rotation: { weights: {}, topicPointers: {}, lessonsSeen: ['x'] },
      answers: [answer('new')],
      ledger: [{ ts: 2, day: '2026-10-17', delta: 96, reason: 'break' }],
      boxes: [{ record: rec('old', 4), trim: false }],
      // A function can not be stored: the last write of the transaction throws.
      breakLog: { ...breakLog, firstAnswerMs: [() => 1] as unknown as number[] },
    };
    await expect(commitStep(db, bad)).rejects.toBeDefined();
    expect(await snapshot(db)).toEqual(before);
  });

  it('a repeated step never doubles points: the economy is an absolute value', async () => {
    const db = await fresh();
    const w: StepWrite = { economy: { points: 4, practicePointsToday: 0, practiceDay: '' } };
    await commitStep(db, w);
    await commitStep(db, w);
    expect((await createRecords(db).get('economy')).points).toBe(4);
  });

  it('keeps the first added time, counts seen and trims the saved sums to the cap', async () => {
    const db = await fresh();
    const progress = createProgressStore(db);
    for (let i = 1; i <= 200; i++) await progress.put({ ...rec(`optellen:1+${i}`), seen: 1, added: 1000 + i });
    await commitStep(db, { boxes: [{ record: { ...rec('optellen:9+9'), added: 5000 }, trim: true }] });
    const all = await progress.list('m');
    expect(all).toHaveLength(200);
    expect(all.some((p) => p.itemId === 'optellen:1+1')).toBe(false); // the oldest is gone
    await commitStep(db, { boxes: [{ record: { ...rec('optellen:9+9', 3), added: 9999 }, trim: false }] });
    expect(await progress.get('m', 'optellen:9+9')).toMatchObject({ box: 3, seen: 2, added: 5000 });
  });

  it('session undefined leaves the saved session alone, null clears it', async () => {
    const db = await fresh();
    await commitStep(db, { session: { kind: 'break', y: 2 } });
    await commitStep(db, { economy: { points: 1, practicePointsToday: 0, practiceDay: '' } });
    expect(await createSessionStore(db).load()).toEqual({ kind: 'break', y: 2 });
    await commitStep(db, { session: null });
    expect(await createSessionStore(db).load()).toBeNull();
  });
});

describe('stepWrite', () => {
  const item = { id: 'i1', type: 'type', skill: 'sk', level: 'M6' } as unknown as Item;
  const state = {
    day: '2026-10-17',
    entries: [{ item, box: 0 }],
    results: ['first'],
    economy: { points: 5, practicePointsToday: 0, practiceDay: '' },
    earned: 2,
    endReason: 'complete',
  } as unknown as SessionState;
  const effects: SessionEffect[] = [
    { type: 'answer', itemId: 'i1', try: 1, correct: true, response: { type: 'type', text: '12' }, ms: 700, at: 10 },
    { type: 'box', itemId: 'i1', box: 2, due: '2026-10-19' },
    { type: 'points', delta: 2, applied: 2, total: 5, reason: 'answer', message: null },
    { type: 'points', delta: -1, applied: -1, total: 4, reason: 'answer', message: null },
  ];
  const input = {
    state, effects, sessionId: 's', moduleId: 'm', topicOf: () => 't', isOpen: () => false, now: 99, session: null,
    context: 'practice' as const, ledgerReason: 'practice' as const,
  };

  it('carries the answer context and the ledger reason, and turns negative points into a malus', () => {
    const w = stepWrite(input);
    expect(w.answers?.[0]).toMatchObject({ context: 'practice', given: '12', topic: 't' });
    expect(w.ledger?.map((l) => [l.delta, l.reason])).toEqual([[2, 'practice'], [-1, 'malus']]);
    expect(w.economy).toEqual(state.economy);
    expect(w.boxes?.[0]?.record).toMatchObject({ box: 2, added: 99 });
  });

  it('does not keep a new generated sum that was answered right', () => {
    expect(stepWrite({ ...input, isOpen: () => true }).boxes).toEqual([]);
  });

  it('writes no break log for an empty break', () => {
    const args = { sessionId: 's', moduleId: 'm', start: 1, end: 2, firstAnswerMs: [] };
    expect(breakLogOf({ ...args, state: { ...state, endReason: 'empty' } as unknown as SessionState })).toBeUndefined();
    expect(breakLogOf({ ...args, state })).toMatchObject({ n: 1, score: 1, points: 2, endedBy: 'done' });
  });
});
