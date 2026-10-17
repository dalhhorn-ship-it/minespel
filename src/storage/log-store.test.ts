import { describe, expect, it } from 'vitest';
import { openDb } from './db';
import {
  createLogStore,
  isSnelGeklikt,
  type AnswerInput,
  type BreakInput,
  type ExamInput,
} from './log-store';

let n = 0;
const fresh = () => openDb({ name: `log-db-${n++}` });

const answer = (over: Partial<AnswerInput> = {}): AnswerInput => ({
  ts: 1000,
  day: '2026-10-17',
  context: 'break',
  sessionId: 's1',
  moduleId: 'taal',
  topic: 'komma',
  skill: 'k1',
  level: 'E6',
  itemId: 'i1',
  try: 1,
  correct: true,
  given: 'ja',
  ms: 1500,
  ...over,
});

const brk = (firstAnswerMs: number[]): BreakInput => ({
  start: 1,
  end: 2,
  day: '2026-10-17',
  sessionId: 's1',
  moduleId: 'taal',
  n: firstAnswerMs.length,
  score: 3,
  points: 6,
  endedBy: 'done',
  firstAnswerMs,
});

const exam = (over: Partial<ExamInput> = {}): ExamInput => ({
  start: 10,
  end: 20,
  day: '2026-10-17',
  moduleId: 'rekenen',
  examId: 'M6',
  questions: [{ itemId: 'q1', prompt: '2+2', given: '5', right: '4', correct: false }],
  score: 0,
  passed: false,
  status: 'done',
  ...over,
});

describe('isSnelGeklikt (AC92)', () => {
  it('is true when every first answer is under 2 seconds', () => {
    expect(isSnelGeklikt([100, 1999, 1500])).toBe(true);
  });
  it('is false when one first answer takes exactly 2 seconds', () => {
    expect(isSnelGeklikt([100, 2000, 500])).toBe(false);
  });
  it('is false with no first answers', () => {
    expect(isSnelGeklikt([])).toBe(false);
  });
});

describe('log store', () => {
  it('appends answers with growing ids and lists them', async () => {
    const db = await fresh();
    const log = createLogStore(db);
    const a = await log.appendAnswer(answer());
    const b = await log.appendAnswer(answer({ try: 2, correct: false, given: 'nee' }));
    expect(b).toBeGreaterThan(a);
    const all = await log.listAnswers();
    expect(all.map((r) => r.id)).toEqual([a, b]);
    expect(all[1]).toMatchObject({ try: 2, correct: false, given: 'nee', moduleId: 'taal' });
    db.close();
  });

  it('saveBreak sets snelGeklikt for all quick first answers', async () => {
    const db = await fresh();
    const log = createLogStore(db);
    const saved = await log.saveBreak(brk([500, 1999, 800]));
    expect(saved.snelGeklikt).toBe(true);
    expect(saved.id).toBeGreaterThan(0);
    expect((await log.listBreaks())[0]).toEqual(saved);
    db.close();
  });

  it('saveBreak does not set snelGeklikt when one first answer is 2 s or more', async () => {
    const db = await fresh();
    const log = createLogStore(db);
    const saved = await log.saveBreak(brk([500, 2000, 800]));
    expect(saved.snelGeklikt).toBe(false);
    expect((await log.listBreaks())[0]?.snelGeklikt).toBe(false);
    db.close();
  });

  it('saves exams and lists them oldest first (AC69)', async () => {
    const db = await fresh();
    const log = createLogStore(db);
    await log.saveExam(exam());
    await log.saveExam(exam({ examId: 'E6', passed: true, score: 1, status: 'gestopt' }));
    const list = await log.listExams();
    expect(list.map((e) => e.examId)).toEqual(['M6', 'E6']);
    expect(list[0]?.questions[0]).toEqual({ itemId: 'q1', prompt: '2+2', given: '5', right: '4', correct: false });
    expect(list[1]).toMatchObject({ passed: true, status: 'gestopt' });
    db.close();
  });

  it('appends ledger entries', async () => {
    const db = await fresh();
    const log = createLogStore(db);
    await log.appendLedger({ ts: 5, day: '2026-10-17', delta: 6, reason: 'break' });
    await log.appendLedger({ ts: 6, day: '2026-10-17', delta: -3, reason: 'malus' });
    const all = await log.listLedger();
    expect(all.map((l) => l.delta)).toEqual([6, -3]);
    expect(all[1]?.reason).toBe('malus');
    db.close();
  });

  it('keeps logs after the database is reopened', async () => {
    const name = `log-db-${n++}`;
    const db = await openDb({ name });
    await createLogStore(db).saveExam(exam());
    db.close();
    const db2 = await openDb({ name });
    expect(await createLogStore(db2).listExams()).toHaveLength(1);
    db2.close();
  });
});
