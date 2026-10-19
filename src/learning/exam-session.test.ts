import { describe, expect, it } from 'vitest';
import { createCatalog, TAAL_MODULE_ID, REKENEN_MODULE_ID } from '../content/catalog';
import { APP_NAME, FORMAT_VERSION, type ChoiceItem, type Item, type ModuleBundle } from '../content/format';
import {
  answerCurrent,
  beginExam,
  createExamSession,
  examResult,
  largestRemainder,
  planExam,
  reviewPages,
  stopByParent,
  timeOut,
  toExamInput,
  type ExamState,
} from './exam-session';

const DAY = '2026-10-19';
const catalog = createCatalog([]);

function taal(seed = 1, boxes?: Record<string, number>): ExamState {
  const s = createExamSession({ catalog, moduleId: TAAL_MODULE_ID, examId: 'examen-m6', seed, day: DAY, at: 0, boxes });
  if (!s) throw new Error('no exam');
  return s;
}

const choice = (i: number): ChoiceItem => ({
  id: `c${i}`,
  type: 'choice',
  level: 'M6',
  skill: 's',
  prompt: `Vraag ${i}`,
  explain: `Uitleg ${i}`,
  options: ['goed', 'fout'],
  answer: 0,
});
const RIGHT = { type: 'choice', index: 0 } as const;
const WRONG = { type: 'choice', index: 1 } as const;

function fixtureBundle(items: Item[], count: number): ModuleBundle {
  return {
    app: APP_NAME,
    kind: 'module',
    formatVersion: FORMAT_VERSION,
    createdAt: '2026-10-19T00:00:00.000Z',
    module: {
      id: 'fix',
      title: 'Fix',
      subject: 'taal',
      version: 1,
      language: 'nl',
      levels: ['M6'],
      topics: ['a', 'b'],
      exams: [
        { id: 'ex', title: 'Fix examen', levels: ['M6'], questionCount: count, timeLimitMinutes: null, passPercent: 70, mix: { a: 1, b: 1 } },
      ],
    },
    topics: [
      { id: 'a', title: 'A', groups: [6], lesson: { pages: [] }, items: items.slice(0, 3) },
      { id: 'b', title: 'B', groups: [6], lesson: { pages: [] }, items: items.slice(3) },
    ],
  };
}

/** Small exam: 4 choice questions, all right is index 0. */
function small(n = 4): ExamState {
  const items = Array.from({ length: 8 }, (_, i) => choice(i));
  const cat = createCatalog([fixtureBundle(items, n)]);
  const s = createExamSession({ catalog: cat, moduleId: 'fix', examId: 'ex', seed: 3, day: DAY, at: 0 });
  if (!s) throw new Error('no exam');
  return beginExam(s, 1000).state;
}

describe('planExam and item picking (AC64)', () => {
  it('rounds with largest remainder', () => {
    expect(largestRemainder([3, 3, 2, 1, 2, 1, 1], 30)).toEqual([7, 7, 5, 2, 5, 2, 2]);
    expect(largestRemainder([1, 1, 1], 10)).toEqual([4, 3, 3]);
    expect(largestRemainder([1, 1, 1, 1], 20)).toEqual([5, 5, 5, 5]);
  });

  it('plans 30 questions at M6 with per topic counts from the mix', () => {
    const plan = planExam(catalog, TAAL_MODULE_ID, 'examen-m6');
    expect(plan?.real).toBe(30);
    expect(plan?.short).toBe(false);
    expect(Object.fromEntries((plan?.topics ?? []).map((t) => [t.topicId, t.wanted]))).toEqual({
      'ww-tegenwoordig': 7,
      klanken: 7,
      woordvormen: 5,
      hoofdletters: 2,
      komma: 5,
      apostrof: 2,
      leestekens: 2,
    });
  });

  it('gives 30 items at level M6 with those counts, whatever the switches (not an input)', () => {
    const s = taal(7);
    expect(s.entries).toHaveLength(30);
    expect(s.timeLimitMinutes).toBe(30);
    expect(s.entries.every((e) => e.item.level === 'M6')).toBe(true);
    const topics = s.entries.map((e) => catalog.topicOfItem(TAAL_MODULE_ID, e.item.id));
    const count = (t: string) => topics.filter((x) => x === t).length;
    expect(count('ww-tegenwoordig')).toBe(7);
    expect(count('komma')).toBe(5);
    expect(count('leestekens')).toBe(2);
    expect(new Set(s.entries.map((e) => e.item.id)).size).toBe(30);
  });

  it('is the same for the same seed and differs for another', () => {
    const ids = (s: ExamState) => s.entries.map((e) => e.item.id);
    expect(ids(taal(5))).toEqual(ids(taal(5)));
    expect(ids(taal(5))).not.toEqual(ids(taal(6)));
  });

  it('remembers the boxes of items', () => {
    const first = taal(5).entries[0]!.item.id;
    expect(taal(5, { [first]: 3 }).entries[0]!.box).toBe(3);
  });

  it('returns null for an unknown exam', () => {
    expect(planExam(catalog, TAAL_MODULE_ID, 'nope')).toBeNull();
    expect(createExamSession({ catalog, moduleId: 'nope', examId: 'x', seed: 1, day: DAY, at: 0 })).toBeNull();
  });
});

describe('too few items (AC72)', () => {
  it('gives the real count, no refill from other topics', () => {
    // wanted 10 -> 5 per topic, topic a has 3 and b has 5 items: real = 3 + 5 = 8
    const items = Array.from({ length: 8 }, (_, i) => choice(i));
    const cat = createCatalog([fixtureBundle(items, 10)]);
    const plan = planExam(cat, 'fix', 'ex');
    expect(plan).toMatchObject({ wanted: 10, real: 8, short: true });
    const s = createExamSession({ catalog: cat, moduleId: 'fix', examId: 'ex', seed: 1, day: DAY, at: 0 });
    expect(s?.entries).toHaveLength(8);
    expect(s?.wanted).toBe(10);
  });
});

describe('Rekentoets (AC125 exam part)', () => {
  const rek = (seed: number) =>
    createExamSession({ catalog, moduleId: REKENEN_MODULE_ID, examId: planExamId(), seed, day: DAY, at: 0 });
  function planExamId(): string {
    return catalog.getModule(REKENEN_MODULE_ID)!.module.exams[0]!.id;
  }

  it('has 20 questions without repeats and typed numeric answers', () => {
    const s = rek(11)!;
    expect(s.entries).toHaveLength(20);
    expect(new Set(s.entries.map((e) => e.item.id)).size).toBe(20);
    expect(s.entries.every((e) => e.numeric === true)).toBe(true);
    expect(s.timeLimitMinutes).toBe(20);
  });

  it('gives the same items for the same seed', () => {
    expect(rek(11)!.entries.map((e) => e.item.id)).toEqual(rek(11)!.entries.map((e) => e.item.id));
    expect(rek(11)!.entries.map((e) => e.item.id)).not.toEqual(rek(12)!.entries.map((e) => e.item.id));
  });
});

describe('questions and effects (AC65)', () => {
  it('starts in phase start and begins on beginExam', () => {
    const s = taal();
    expect(s.phase).toBe('start');
    expect(answerCurrent(s, RIGHT, 5).state).toBe(s);
    const b = beginExam(s, 1000);
    expect(b.state).toMatchObject({ phase: 'questions', index: 0, startedAt: 1000 });
  });

  it('moves on after one try with answer and box effects, no points, no feedback state', () => {
    const s = small();
    const r1 = answerCurrent(s, WRONG, 3000);
    expect(r1.state.index).toBe(1);
    expect(r1.state.phase).toBe('questions');
    expect(r1.effects.map((e) => e.type)).toEqual(['answer', 'box']);
    expect(r1.effects[0]).toMatchObject({ try: 1, correct: false, ms: 2000, at: 3000 });
    expect(r1.effects[1]).toMatchObject({ box: 1 });
    expect(r1.effects.some((e) => (e as { type: string }).type === 'points')).toBe(false);
    const r2 = answerCurrent(r1.state, RIGHT, 4000);
    expect(r2.effects[1]).toMatchObject({ box: 2, due: '2026-10-20' });
    expect(Object.keys(r2.state)).not.toContain('try');
  });

  it('ignores a repeated tap on an old question (q guard) and answers after the end', () => {
    const s = small();
    const r1 = answerCurrent(s, RIGHT, 2000, 0);
    expect(answerCurrent(r1.state, RIGHT, 2100, 0).effects).toEqual([]);
    let st = r1.state;
    for (let i = 1; i < 4; i++) st = answerCurrent(st, RIGHT, 3000 + i).state;
    expect(st.phase).toBe('end');
    expect(answerCurrent(st, RIGHT, 9000).effects).toEqual([]);
  });

  it('ends with the last answer', () => {
    let st = small();
    let last = { state: st, effects: [] as ReturnType<typeof answerCurrent>['effects'] };
    for (let i = 0; i < 4; i++) {
      last = answerCurrent(last.state, RIGHT, 2000 + i);
      st = last.state;
    }
    expect(st).toMatchObject({ phase: 'end', endReason: 'complete', endedAt: 2003 });
    expect(last.effects.at(-1)).toEqual({ type: 'end', reason: 'complete', at: 2003 });
    expect(examResult(st)).toMatchObject({ right: 4, percent: 100, passed: true, status: 'done' });
  });
});

describe('time out (AC67)', () => {
  it('checks the open draft as given and marks the rest not answered', () => {
    const s = small(6);
    const a = answerCurrent(s, WRONG, 2000).state; // q0 wrong, now on q1
    const t = timeOut(a, RIGHT, 5000);
    expect(t.state).toMatchObject({ phase: 'end', endReason: 'time', endedAt: 5000 });
    expect(t.effects.map((e) => e.type)).toEqual(['answer', 'box', 'end']);
    expect(t.effects[0]).toMatchObject({ correct: true });
    const res = examResult(t.state);
    expect(res).toMatchObject({ total: 6, right: 1, wrong: 1, unanswered: 4, status: 'done' });
  });

  it('a wrong draft counts wrong, no draft gives no answer or box effect (decision 67)', () => {
    const s = small(4);
    expect(timeOut(s, WRONG, 2000).effects[0]).toMatchObject({ correct: false });
    const none = timeOut(s, null, 2000);
    expect(none.effects).toEqual([{ type: 'end', reason: 'time', at: 2000 }]);
    expect(examResult(none.state)).toMatchObject({ right: 0, unanswered: 4 });
    const empty = timeOut(s, { type: 'type', text: '  ' }, 2000);
    expect(empty.effects.map((e) => e.type)).toEqual(['end']);
  });

  it('does nothing outside the questions phase', () => {
    const s = taal();
    expect(timeOut(s, null, 5).effects).toEqual([]);
  });
});

describe('parent stop (AC70)', () => {
  it('saves gestopt, never passes, keeps given answers', () => {
    let st = small(4);
    for (let i = 0; i < 2; i++) st = answerCurrent(st, RIGHT, 2000 + i).state;
    const stopped = stopByParent(st, 9000);
    expect(stopped.effects).toEqual([{ type: 'end', reason: 'parent', at: 9000 }]);
    const res = examResult(stopped.state);
    expect(res).toMatchObject({ status: 'gestopt', passed: false, right: 2, unanswered: 2 });
    expect(toExamInput(stopped.state)).toMatchObject({ status: 'gestopt', passed: false, end: 9000 });
    expect(stopByParent(stopped.state, 9500).state).toBe(stopped.state);
  });

  it('even an all right exam stopped on the last question does not pass', () => {
    let st = small(4);
    for (let i = 0; i < 3; i++) st = answerCurrent(st, RIGHT, 2000 + i).state;
    expect(examResult(stopByParent(st, 5000).state).passed).toBe(false);
  });
});

describe('score and pass', () => {
  it('passes at exactly passPercent', () => {
    const run = (rightCount: number, passPercent: number) => {
      let st = { ...small(4), passPercent };
      for (let i = 0; i < 4; i++) st = answerCurrent(st, i < rightCount ? RIGHT : WRONG, 2000 + i).state;
      return examResult(st);
    };
    expect(run(3, 75)).toMatchObject({ right: 3, percent: 75, passed: true });
    expect(run(2, 75)).toMatchObject({ right: 2, passed: false });
    expect(run(2, 50)).toMatchObject({ passed: true });
  });
});

describe('record (AC69)', () => {
  it('has the exam record shape with every question', () => {
    let st = small(4);
    st = answerCurrent(st, WRONG, 2000).state;
    st = answerCurrent(st, RIGHT, 3000).state;
    st = timeOut(st, null, 4000).state;
    const rec = toExamInput(st);
    expect(rec).toMatchObject({
      start: 1000,
      end: 4000,
      day: DAY,
      moduleId: 'fix',
      examId: 'ex',
      score: 1,
      passed: false,
      status: 'done',
    });
    expect(rec.questions).toHaveLength(4);
    expect(rec.questions[0]).toMatchObject({ given: 'fout', right: 'goed', correct: false });
    expect(rec.questions[1]).toMatchObject({ given: 'goed', correct: true });
    expect(rec.questions[2]).toMatchObject({ given: 'niet beantwoord', correct: false });
    expect(Object.keys(rec.questions[0]!).sort()).toEqual(['correct', 'given', 'itemId', 'prompt', 'right']);
  });
});

describe('review pages (AC153)', () => {
  it('has 4 pages for 3 wrong and 1 open', () => {
    let st = small(6);
    st = answerCurrent(st, RIGHT, 2000).state;
    st = answerCurrent(st, WRONG, 2001).state;
    st = answerCurrent(st, WRONG, 2002).state;
    st = answerCurrent(st, WRONG, 2003).state;
    st = answerCurrent(st, RIGHT, 2004).state;
    st = timeOut(st, null, 3000).state; // last one open
    const pages = reviewPages(st);
    expect(pages).toHaveLength(4);
    expect(pages.map((p) => p.unanswered)).toEqual([false, false, false, true]);
    expect(pages[0]).toMatchObject({ given: 'fout', right: 'goed' });
    expect(pages[0]!.explain).toMatch(/^Uitleg /);
    expect(pages[3]).toMatchObject({ given: 'niet beantwoord' });
  });

  it('has no pages with no mistakes', () => {
    let st = small(4);
    for (let i = 0; i < 4; i++) st = answerCurrent(st, RIGHT, 2000 + i).state;
    expect(reviewPages(st)).toEqual([]);
  });

  it('shows punctuate and find-error answers as text', () => {
    const items: Item[] = [
      { id: 'p1', type: 'punctuate', level: 'M6', skill: 's', prompt: 'Komma?', explain: 'e', mark: ',', words: ['Ik', 'ren', 'en', 'jij'], answer: [1] },
      { id: 'f1', type: 'find-error', level: 'M6', skill: 's', prompt: 'Fout?', explain: 'e', words: ['Ik', 'loopt'], answer: 1, correction: 'loop' },
    ];
    const cat = createCatalog([
      {
        ...fixtureBundle([], 2),
        topics: [
          { id: 'a', title: 'A', groups: [6], lesson: { pages: [] }, items: [items[0]!] },
          { id: 'b', title: 'B', groups: [6], lesson: { pages: [] }, items: [items[1]!] },
        ],
      },
    ]);
    let st = beginExam(createExamSession({ catalog: cat, moduleId: 'fix', examId: 'ex', seed: 1, day: DAY, at: 0 })!, 1).state;
    const byId = (id: string) => st.entries[st.index]!.item.id === id;
    for (let i = 0; i < 2; i++) {
      st = answerCurrent(st, byId('p1') ? { type: 'punctuate', gaps: [0] } : { type: 'find-error', index: -1 }, 10 + i).state;
    }
    const pages = reviewPages(st);
    const p = pages.find((x) => x.itemId === 'p1')!;
    expect(p).toMatchObject({ given: 'Ik, ren en jij', right: 'Ik ren, en jij' });
    expect(pages.find((x) => x.itemId === 'f1')).toMatchObject({ given: 'geen fout', right: 'loopt' });
  });
});

describe('JSON round trip', () => {
  it('survives in every phase', () => {
    const s0 = taal(9);
    const s1 = beginExam(s0, 100).state;
    const s2 = answerCurrent(s1, { type: 'choice', index: 0 }, 200).state;
    const s3 = timeOut(s2, null, 300).state;
    for (const s of [s0, s1, s2, s3]) {
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    }
    const back = JSON.parse(JSON.stringify(s2)) as ExamState;
    expect(answerCurrent(back, WRONG, 400).state.index).toBe(2);
    expect(examResult(JSON.parse(JSON.stringify(s3)) as ExamState)).toEqual(examResult(s3));
  });
});
