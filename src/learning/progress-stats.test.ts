import { describe, expect, it } from 'vitest';
import type { AnswerRecord, BreakRecord, ExamRecord, LedgerRecord } from '../storage/log-store';
import { computeProgress, weekStart, type ProgressInput } from './progress-stats';

let id = 1;
function answer(day: string, correct: boolean, over: Partial<AnswerRecord> = {}): AnswerRecord {
  return {
    id: id++, ts: Date.parse(`${day}T10:00:00`) + id, day, context: 'break', sessionId: 's', moduleId: 'taal',
    topic: 'dt', skill: 'x', level: 'E6', itemId: `i${id}`, try: 1, correct, given: 'fout', ms: 3000, ...over,
  };
}
function brk(day: string, minutes: number): BreakRecord {
  const start = Date.parse(`${day}T10:00:00`);
  return {
    id: id++, start, end: start + minutes * 60_000, day, sessionId: 's', moduleId: 'taal', n: 5, score: 4, points: 8,
    endedBy: 'done', firstAnswerMs: [3000], snelGeklikt: false,
  };
}
const ledger = (day: string, delta: number, reason: LedgerRecord['reason']): LedgerRecord => ({ id: id++, ts: 0, day, delta, reason });

function input(over: Partial<ProgressInput>): ProgressInput {
  return { answers: [], breaks: [], exams: [], ledger: [], stats: { playMsPerDay: {} }, today: '2026-10-28', ...over };
}

describe('progress stats (decision 115)', () => {
  it('weeks start on Monday', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // a Monday
    expect(weekStart('2026-10-28')).toBe('2026-10-26');
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // Sunday
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
  });

  it('counts this week and last week apart, with first tries only', () => {
    const s = computeProgress(
      input({
        answers: [
          answer('2026-10-26', true),
          answer('2026-10-27', false),
          answer('2026-10-27', true, { try: 2 }),
          answer('2026-10-28', true),
          answer('2026-10-20', false),
        ],
        breaks: [brk('2026-10-26', 4), brk('2026-10-20', 3)],
        ledger: [ledger('2026-10-26', 8, 'break'), ledger('2026-10-27', -40, 'shop'), ledger('2026-10-27', 20, 'tradein')],
        stats: { playMsPerDay: { '2026-10-26': 20 * 60_000, '2026-10-19': 5 * 60_000 } },
      }),
    );
    const w = s.report.thisWeek;
    expect(w.start).toBe('2026-10-26');
    expect(w.questions).toBe(3);
    expect(w.firstTryRight).toBe(2);
    expect(w.pct).toBe(67);
    expect(w.breaks).toBe(1);
    expect(w.learnMs).toBe(4 * 60_000);
    expect(w.playMs).toBe(20 * 60_000);
    expect(w.pointsEarned).toBe(8);
    expect(w.pointsSpent).toBe(40);
    expect(w.daysActive).toBe(3);
    expect(s.report.lastWeek).toMatchObject({ start: '2026-10-19', questions: 1, pct: 0, playMs: 5 * 60_000 });
    expect(s.report.lines[0]).toContain('3 vragen');
    expect(s.weeks).toHaveLength(12);
    expect(s.weeks[11]?.start).toBe('2026-10-26');
    expect(s.days).toHaveLength(14);
    expect(s.days[13]).toMatchObject({ day: '2026-10-28' });
    expect(s.totalQuestions).toBe(4);
  });

  it('counts Extra oefenen answer time and whole exams as learning time', () => {
    const exam: ExamRecord = {
      id: 1, start: 0, end: 10 * 60_000, day: '2026-10-27', moduleId: 'taal', examId: 'e', questions: [], score: 8,
      passed: true, status: 'done',
    };
    const s = computeProgress(input({ exams: [exam], answers: [answer('2026-10-27', true, { context: 'practice', ms: 30_000 })] }));
    expect(s.report.thisWeek.learnMs).toBe(10 * 60_000 + 30_000);
    expect(s.report.thisWeek).toMatchObject({ exams: 1, examsPassed: 1 });
  });

  it('marks a topic better, lower or the same by the last 2 weeks against the 2 before', () => {
    const answers: AnswerRecord[] = [];
    for (let i = 0; i < 6; i++) answers.push(answer('2026-10-05', i < 2, { topic: 'dt' })); // 33%
    for (let i = 0; i < 6; i++) answers.push(answer('2026-10-25', i < 5, { topic: 'dt' })); // 83%
    for (let i = 0; i < 6; i++) answers.push(answer('2026-10-05', true, { topic: 'komma' }));
    for (let i = 0; i < 6; i++) answers.push(answer('2026-10-25', i < 3, { topic: 'komma' }));
    for (let i = 0; i < 2; i++) answers.push(answer('2026-10-25', true, { topic: 'nieuw' }));
    const s = computeProgress(input({ answers, topicLabel: (m, t) => `${m}: ${t}` }));
    const by = Object.fromEntries(s.topics.map((t) => [t.topic, t]));
    expect(by.dt?.trend).toBe('beter');
    expect(by.komma?.trend).toBe('lager');
    expect(by.nieuw?.trend).toBeNull();
    expect(by.dt?.pctAll).toBe(58);
    expect(by.dt?.label).toBe('taal: dt');
  });

  it('names the strongest and weakest topic of the week', () => {
    const answers: AnswerRecord[] = [];
    for (let i = 0; i < 5; i++) answers.push(answer('2026-10-27', true, { topic: 'dt' }));
    for (let i = 0; i < 5; i++) answers.push(answer('2026-10-27', i < 2, { topic: 'komma' }));
    const s = computeProgress(input({ answers }));
    expect(s.report.strongest?.topic).toBe('dt');
    expect(s.report.weakest?.topic).toBe('komma');
    expect(s.report.lines.join(' ')).toContain('Kan nog wat oefening gebruiken');
  });

  it('lists the hardest questions, most wrong first, with the last wrong answer and the explanation', () => {
    const answers = [
      answer('2026-10-20', false, { itemId: 'a', given: 'word' }),
      answer('2026-10-21', false, { itemId: 'a', given: 'wort' }),
      answer('2026-10-22', false, { itemId: 'b' }),
      answer('2026-10-22', true, { itemId: 'c' }),
      answer('2026-08-01', false, { itemId: 'old' }),
    ];
    const s = computeProgress(
      input({ answers, itemText: (_m, item) => (item === 'a' ? { prompt: 'Hij ... naar huis', explain: 'Hij wordt: stam + t' } : null) }),
    );
    expect(s.hard.map((h) => h.itemId)).toEqual(['a', 'b']);
    expect(s.hard[0]).toMatchObject({ wrong: 2, lastGiven: 'wort', prompt: 'Hij ... naar huis', explain: 'Hij wordt: stam + t' });
    expect(s.hard[1]?.prompt).toBe('b');
  });

  it('says so when nothing happened this week', () => {
    expect(computeProgress(input({})).report.lines).toEqual(['Deze week is er nog niet gespeeld of geleerd.']);
  });
});
