// Logs: one record per try (answers), per break, per exam, and per point change (ledger).
// Ids are auto numbers from IndexedDB. Records are never changed after they are written.
import { request, transact } from './db';
import type { StoreName } from './schema';

export type AnswerContext = 'break' | 'practice' | 'exam';

export interface AnswerInput {
  /** Milliseconds since 1970. */
  ts: number;
  /** Local calendar day, "2026-10-17". */
  day: string;
  context: AnswerContext;
  sessionId: string;
  moduleId: string;
  topic: string;
  skill: string;
  level: string; // level name, for example M6
  itemId: string;
  /** 1 or 2. */
  try: number;
  correct: boolean;
  /** What the kid gave, as text. */
  given: string;
  /** Milliseconds from showing the question to the answer. */
  ms: number;
}
export type AnswerRecord = AnswerInput & { id: number };

/** A first answer faster than this (in ms) counts as a quick click (AC92). */
export const SNEL_GEKLIKT_MS = 2000;

export type BreakEnd = 'done' | 'stopped' | 'stuck';

export interface BreakInput {
  start: number;
  end: number;
  day: string;
  sessionId: string;
  moduleId: string;
  /** Number of questions. */
  n: number;
  score: number;
  points: number;
  endedBy: BreakEnd;
  /** Time to answer of every first try of the break. Decides the "snel geklikt" flag. */
  firstAnswerMs: number[];
}
export type BreakRecord = BreakInput & { id: number; snelGeklikt: boolean };

export interface ExamQuestionLog {
  itemId: string;
  prompt: string;
  given: string;
  right: string;
  correct: boolean;
}

export interface ExamInput {
  start: number;
  end: number;
  day: string;
  moduleId: string;
  examId: string;
  questions: ExamQuestionLog[];
  score: number;
  passed: boolean;
  status: 'done' | 'gestopt';
}
export type ExamRecord = ExamInput & { id: number };

export type LedgerReason = 'break' | 'practice' | 'shop' | 'malus';

export interface LedgerInput {
  ts: number;
  day: string;
  delta: number;
  reason: LedgerReason;
}
export type LedgerRecord = LedgerInput & { id: number };

/** True when there is at least one first answer and every one took under 2 seconds (AC92). */
export function isSnelGeklikt(firstAnswerMs: readonly number[]): boolean {
  return firstAnswerMs.length > 0 && firstAnswerMs.every((ms) => ms < SNEL_GEKLIKT_MS);
}

export interface LogStore {
  appendAnswer(answer: AnswerInput): Promise<number>;
  /** Sets `snelGeklikt` from `firstAnswerMs`. Returns the stored record. */
  saveBreak(input: BreakInput): Promise<BreakRecord>;
  saveExam(input: ExamInput): Promise<ExamRecord>;
  appendLedger(entry: LedgerInput): Promise<number>;
  listAnswers(): Promise<AnswerRecord[]>;
  /** Oldest first. */
  listBreaks(): Promise<BreakRecord[]>;
  /** Oldest first (AC69). */
  listExams(): Promise<ExamRecord[]>;
  listLedger(): Promise<LedgerRecord[]>;
}

export function createLogStore(db: IDBDatabase): LogStore {
  async function add<T extends object>(store: StoreName, value: T): Promise<T & { id: number }> {
    // The key path "id" is filled in by IndexedDB, so the value goes in without one.
    const id = await transact(db, store, 'readwrite', (tx) => request(tx.objectStore(store).add({ ...value })));
    return { ...value, id: id as number };
  }
  const list = <T>(store: StoreName): Promise<T[]> =>
    transact(db, store, 'readonly', (tx) => request<T[]>(tx.objectStore(store).getAll()));

  return {
    async appendAnswer(answer) {
      return (await add('answers', answer)).id;
    },
    saveBreak: (input) => add('breaks', { ...input, snelGeklikt: isSnelGeklikt(input.firstAnswerMs) }),
    saveExam: (input) => add('exams', input),
    async appendLedger(entry) {
      return (await add('ledger', entry)).id;
    },
    listAnswers: () => list<AnswerRecord>('answers'),
    listBreaks: () => list<BreakRecord>('breaks'),
    listExams: () => list<ExamRecord>('exams'),
    listLedger: () => list<LedgerRecord>('ledger'),
  };
}
