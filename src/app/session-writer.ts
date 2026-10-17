// Session writer (T43c, decision 47): saves one learning step in ONE IndexedDB transaction.
// The session (or its removal), the points, the rotation, the answer log, the ledger, the Leitner boxes,
// the saved sum trimming and the break log all land together or not at all. A kill can therefore never lose
// or double a log line, a box, a ledger line or points. Points are the absolute economy of the step state,
// so a repeat can never pay twice.
//
// Breaks use it with context 'break' and ledger reason 'break'. Extra oefenen uses it unchanged with
// 'practice' and 'practice'. The save queue never writes `session`, `economy` or `rotation` (it only writes
// the records that were registered with it: timers, stats, world, player, dinos), so it can not put an
// older copy over a committed one.
import type { Item } from '../content/format';
import { sumsToForget } from '../learning/generated-items';
import type { Response } from '../learning/answer-check';
import type { SessionEffect, SessionState as StepState } from '../learning/break-session';
import { request, transact } from '../storage/db';
import {
  isSnelGeklikt,
  type AnswerContext,
  type AnswerInput,
  type BreakEnd,
  type BreakInput,
  type LedgerInput,
} from '../storage/log-store';
import { progressKey, type ProgressRecord } from '../storage/progress-store';
import type { EconomyRecord, RotationRecord } from '../storage/schema';
import type { SessionState } from '../storage/session-store';

/** One box change. `seen` and `added` are worked out inside the transaction from the old record. */
export interface BoxChange {
  record: Omit<ProgressRecord, 'seen'>;
  /** Trim the saved sums of this topic to the cap after the save (AC126). */
  trim: boolean;
}

/** Everything one step writes. A missing field leaves that record alone. */
export interface StepWrite {
  /** The session to keep, or null to clear it. Missing leaves the saved session as it is. */
  session?: SessionState | null;
  economy?: EconomyRecord;
  rotation?: RotationRecord;
  answers?: AnswerInput[];
  ledger?: LedgerInput[];
  boxes?: BoxChange[];
  breakLog?: BreakInput;
}

const STORES = ['kv', 'answers', 'breaks', 'ledger', 'progress'] as const;

/** The key range of one module in the `progress` store. Same as the progress store. */
const moduleRange = (moduleId: string): IDBKeyRange => IDBKeyRange.bound(`${moduleId}|`, `${moduleId}|￿`);

/** Writes the whole step in one transaction. If anything throws, nothing is written. */
export function commitStep(db: IDBDatabase, write: StepWrite): Promise<void> {
  // The JSON round trip makes sure what we keep is what a reload gives back. It runs before the transaction.
  const session = write.session === undefined || write.session === null ? write.session : (JSON.parse(JSON.stringify(write.session)) as SessionState);
  return transact(db, [...STORES], 'readwrite', async (tx) => {
    const kv = tx.objectStore('kv');
    if (session !== undefined) await request(kv.put(session, 'session'));
    if (write.economy) await request(kv.put({ ...write.economy }, 'economy'));
    if (write.rotation) await request(kv.put({ ...write.rotation }, 'rotation'));
    for (const a of write.answers ?? []) await request(tx.objectStore('answers').add({ ...a }));
    for (const l of write.ledger ?? []) await request(tx.objectStore('ledger').add({ ...l }));
    if (write.boxes?.length) {
      const progress = tx.objectStore('progress');
      for (const change of write.boxes) {
        const { moduleId, itemId, topic } = change.record;
        const key = progressKey(moduleId, itemId);
        const old = await request<ProgressRecord | undefined>(progress.get(key));
        const next: ProgressRecord = { ...change.record, seen: (old?.seen ?? 0) + 1 };
        if (old) {
          if (old.added === undefined) delete next.added;
          else next.added = old.added; // the first save time stays
        }
        await request(progress.put(next, key));
        if (change.trim) {
          const all = await request<ProgressRecord[]>(progress.getAll(moduleRange(moduleId)));
          for (const gone of sumsToForget(all, moduleId, topic)) {
            await request(progress.delete(progressKey(gone.moduleId, gone.itemId)));
          }
        }
      }
    }
    if (write.breakLog) {
      await request(tx.objectStore('breaks').add({ ...write.breakLog, snelGeklikt: isSnelGeklikt(write.breakLog.firstAnswerMs) }));
    }
  });
}

export function givenText(item: Item, r: Response): string {
  switch (r.type) {
    case 'choice':
      return item.type === 'choice' ? (item.options[r.index] ?? String(r.index)) : String(r.index);
    case 'find-error':
      return r.index < 0 ? 'Geen fout' : item.type === 'find-error' ? (item.words[r.index] ?? String(r.index)) : String(r.index);
    case 'type':
      return r.text;
    case 'punctuate':
      return [...r.gaps].sort((a, b) => a - b).join(',');
  }
}

export interface StepInput {
  /** The state after the step and the effects the step produced. */
  state: StepState;
  effects: SessionEffect[];
  context: AnswerContext;
  ledgerReason: 'break' | 'practice';
  sessionId: string;
  moduleId: string;
  /** Topic id of an item. */
  topicOf: (item: Item) => string;
  /** True when the topic makes generated sums (they are kept only after a wrong first try). */
  isOpen: (topic: string) => boolean;
  /** Now, in ms since 1970. */
  now: number;
  /** The session to keep, or null to clear it (the step ended the session). */
  session: SessionState | null;
  /** Written with the step (the start of a break). */
  rotation?: RotationRecord;
  /** The break log, written in the commit that ends the session. */
  breakLog?: BreakInput;
  /** Hand over the typed answer log text. Defaults to `givenText`. */
  given?: (item: Item, r: Response) => string;
}

/** Turns the effects of one reducer step into the writes of its commit. */
export function stepWrite(input: StepInput): StepWrite {
  const { state, effects, context, moduleId, sessionId } = input;
  const entryOf = (itemId: string) => state.entries.find((x) => x.item.id === itemId);
  const given = input.given ?? givenText;
  const write: StepWrite = { session: input.session, answers: [], ledger: [], boxes: [] };
  if (input.rotation) write.rotation = input.rotation;
  if (input.breakLog) write.breakLog = input.breakLog;
  for (const e of effects) {
    switch (e.type) {
      case 'answer': {
        const entry = entryOf(e.itemId);
        if (!entry) break;
        write.answers!.push({
          ts: e.at,
          day: state.day,
          context,
          sessionId,
          moduleId,
          topic: input.topicOf(entry.item),
          skill: entry.item.skill,
          level: entry.item.level,
          itemId: e.itemId,
          try: e.try,
          correct: e.correct,
          given: given(entry.item, e.response),
          ms: e.ms,
        });
        break;
      }
      case 'unanswered': {
        const entry = entryOf(e.itemId);
        if (!entry) break;
        write.answers!.push({
          ts: input.now,
          day: state.day,
          context,
          sessionId,
          moduleId,
          topic: input.topicOf(entry.item),
          skill: entry.item.skill,
          level: entry.item.level,
          itemId: e.itemId,
          try: 1,
          correct: false,
          given: 'niet beantwoord',
          ms: 0,
        });
        break;
      }
      case 'box': {
        const entry = entryOf(e.itemId);
        if (!entry) break;
        const topic = input.topicOf(entry.item);
        const open = input.isOpen(topic);
        if (open && entry.box === 0 && e.box > 1) break; // a new sum answered right is not kept
        write.boxes!.push({
          record: {
            moduleId,
            itemId: e.itemId,
            box: e.box,
            due: e.due,
            level: entry.item.level,
            topic,
            skill: entry.item.skill,
            added: input.now,
          },
          trim: open,
        });
        break;
      }
      case 'points':
        write.economy = { ...state.economy };
        if (e.applied !== 0) {
          write.ledger!.push({ ts: input.now, day: state.day, delta: e.applied, reason: e.applied < 0 ? 'malus' : input.ledgerReason });
        }
        break;
      case 'end':
        break;
    }
  }
  return write;
}

/** The break log of a finished break, or undefined when nothing is logged (empty break, no questions). */
export function breakLogOf(args: {
  state: StepState;
  sessionId: string;
  moduleId: string;
  start: number;
  end: number;
  firstAnswerMs: number[];
}): BreakInput | undefined {
  const { state } = args;
  if (state.endReason === 'empty' || state.entries.length === 0) return undefined;
  const endedBy: BreakEnd = state.endReason === 'parent' ? 'stopped' : 'done';
  return {
    start: args.start,
    end: args.end,
    day: state.day,
    sessionId: args.sessionId,
    moduleId: args.moduleId,
    n: state.entries.length,
    score: state.results.filter((x) => x === 'first' || x === 'retry').length,
    points: state.earned,
    endedBy,
    firstAnswerMs: [...args.firstAnswerMs],
  };
}
