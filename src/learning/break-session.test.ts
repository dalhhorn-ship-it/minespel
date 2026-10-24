import { describe, expect, it } from 'vitest';
import type { ChoiceItem } from '../content/format';
import {
  doneCount,
  reduce,
  startSession,
  type SessionConfig,
  type SessionEffect,
  type SessionEvent,
  type SessionState,
} from './break-session';

const DAY = '2026-10-17';

function item(i: number): ChoiceItem {
  return {
    id: `t${i}`,
    type: 'choice',
    level: 'M6',
    skill: 's',
    prompt: 'p',
    explain: 'e',
    options: ['a', 'b'],
    answer: 0,
  };
}
const right = { type: 'choice', index: 0 } as const;
const wrong = { type: 'choice', index: 1 } as const;

function config(n: number, over: Partial<SessionConfig> = {}): SessionConfig {
  return {
    mode: 'break',
    entries: Array.from({ length: n }, (_, i) => ({ item: item(i), box: 0 })),
    economy: { points: 10, practicePointsToday: 0, practiceDay: '' },
    day: DAY,
    at: 1000,
    ...over,
  };
}

/** Run events, collecting effects. */
function run(state: SessionState, events: SessionEvent[]): { state: SessionState; effects: SessionEffect[] } {
  const effects: SessionEffect[] = [];
  let s = state;
  for (const ev of events) {
    const r = reduce(s, ev);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
}
const ans = (at: number, response: SessionEvent extends never ? never : typeof right | typeof wrong): SessionEvent => ({
  type: 'answer',
  at,
  response,
});

describe('break-session', () => {
  it('AC28: starts on question 1 with N entries, no timer', () => {
    const { state } = startSession(config(5));
    expect(state.phase).toBe('question');
    expect(state.entries).toHaveLength(5);
    expect(doneCount(state)).toBe(0);
  });

  it('AC29: right first try gives +2, a box change and a feedback phase', () => {
    const { state } = startSession(config(2));
    const r = reduce(state, ans(3000, right));
    expect(r.state.phase).toBe('feedback');
    expect(r.state.economy.points).toBe(12);
    expect(r.effects).toEqual([
      { type: 'answer', itemId: 't0', try: 1, correct: true, response: right, ms: 2000, at: 3000 },
      { type: 'box', itemId: 't0', box: 2, due: '2026-10-18' },
      { type: 'points', delta: 2, applied: 2, total: 12, reason: 'answer' },
    ]);
  });

  it('AC30: wrong first try gives a retry of the same question, no points, box 1', () => {
    const { state } = startSession(config(2));
    const r = reduce(state, ans(2000, wrong));
    expect(r.state.phase).toBe('question');
    expect(r.state.try).toBe(2);
    expect(r.state.index).toBe(0);
    expect(r.state.economy.points).toBe(10);
    expect(r.effects.map((e) => e.type)).toEqual(['answer', 'box']);
    expect(r.effects[1]).toMatchObject({ box: 1, due: DAY });
  });

  it('AC145: right retry gives +1 and no second box change', () => {
    const { state } = startSession(config(2));
    const r = run(state, [ans(2000, wrong), ans(3000, right)]);
    expect(r.state.phase).toBe('feedback');
    expect(r.state.economy.points).toBe(11);
    expect(r.effects.filter((e) => e.type === 'box')).toHaveLength(1);
    expect(r.effects.filter((e) => e.type === 'answer')).toHaveLength(2);
  });

  it('AC146: wrong retry goes to the teach moment (Normaal takes 1), Ik snap het moves on', () => {
    const { state } = startSession(config(2));
    const r = run(state, [ans(2000, wrong), ans(3000, wrong)]);
    expect(r.state.phase).toBe('teach');
    expect(r.state.economy.points).toBe(9);
    expect(r.state.lastApplied).toBe(-1);
    expect(r.effects.filter((e) => e.type === 'box')).toHaveLength(1);
    const n = reduce(r.state, { type: 'understood', at: 4000 });
    expect(n.state.phase).toBe('question');
    expect(n.state.index).toBe(1);
    expect(n.state.try).toBe(1);
  });

  it('AC147 and AC174: teach at 0 points stays 0 and nothing is shown as taken', () => {
    const { state } = startSession(config(1, { economy: { points: 0, practicePointsToday: 0, practiceDay: '' } }));
    const r = run(state, [ans(1, wrong), ans(2, wrong)]);
    expect(r.state.economy.points).toBe(0);
    expect(r.state.lastApplied).toBe(0);
    expect(r.effects.filter((e) => e.type === 'points')).toEqual([]);
  });

  it('AC31: no time limit, 30 fake minutes later the question is still open and nothing is unanswered', () => {
    const { state } = startSession(config(3));
    const r = run(state, [
      { type: 'tick', at: 1000 + 30 * 60_000 },
      { type: 'tick', at: 1000 + 60 * 60_000 },
    ]);
    expect(r.state).toEqual(state);
    expect(r.effects).toEqual([]);
    const a = reduce(r.state, ans(1000 + 30 * 60_000, right));
    expect(a.effects[0]).toMatchObject({ ms: 30 * 60_000 });
  });

  it('AC35: five first try rights give 13 points, summary K van N', () => {
    const { state } = startSession(config(5, { economy: { points: 0, practicePointsToday: 0, practiceDay: '' } }));
    const events: SessionEvent[] = [];
    for (let i = 0; i < 5; i++) events.push(ans(10 + i * 2, right), { type: 'next', at: 11 + i * 2 });
    const r = run(state, events);
    expect(r.state.phase).toBe('summary');
    expect(r.state.economy.points).toBe(13);
    expect(r.state.summary).toMatchObject({ total: 5, right: 5, firstTryRight: 5, bonus: 3, earned: 13, pointsTotal: 13, hard: false });
    expect(r.effects.some((e) => e.type === 'points' && e.reason === 'bonus' && e.applied === 3)).toBe(true);
  });

  it('AC34: K right counts first try and retry, no bonus when a retry was needed', () => {
    const { state } = startSession(config(2));
    const r = run(state, [ans(1, wrong), ans(2, right), { type: 'next', at: 3 }, ans(4, wrong), ans(5, wrong), { type: 'understood', at: 6 }]);
    expect(r.state.phase).toBe('summary');
    expect(r.state.summary).toMatchObject({ total: 2, right: 1, bonus: 0, earned: 0, pointsTotal: 10, hard: false });
  });

  it('AC116: zero right gives hard summary, no plus points, no bonus', () => {
    const { state } = startSession(config(1));
    const r = run(state, [ans(1, wrong), ans(2, wrong), { type: 'understood', at: 3 }]);
    expect(r.state.summary).toMatchObject({ right: 0, hard: true, bonus: 0 });
    expect(r.effects.some((e) => e.type === 'points' && e.delta > 0)).toBe(false);
  });

  it('AC36: finish ends the session once', () => {
    const { state } = startSession(config(1));
    const s = run(state, [ans(1, right), { type: 'next', at: 2 }]).state;
    const r = run(s, [{ type: 'finish', at: 3 }, { type: 'finish', at: 3 }]);
    expect(r.state.phase).toBe('done');
    expect(r.state.endReason).toBe('complete');
    expect(r.effects).toEqual([{ type: 'end', reason: 'complete', at: 3 }]);
  });

  it('AC117: double tap, two fingers and input in the wrong phase are ignored', () => {
    const { state } = startSession(config(2));
    const r = run(state, [ans(1, right), ans(1, right), ans(1, wrong)]);
    expect(r.effects.filter((e) => e.type === 'answer')).toHaveLength(1);
    expect(r.state.economy.points).toBe(12);
    const n = run(r.state, [{ type: 'next', at: 2 }, { type: 'next', at: 2 }, { type: 'understood', at: 2 }, { type: 'finish', at: 2 }]);
    expect(n.state.index).toBe(1);
    expect(n.state.phase).toBe('question');
    // A stale tap for an old question is ignored too.
    expect(reduce(n.state, { type: 'answer', at: 3, response: right, q: 0 }).effects).toEqual([]);
    // Next while on a question does nothing.
    expect(reduce(n.state, { type: 'next', at: 3 }).state).toBe(n.state);
  });

  it('AC39: empty break shows for 10 seconds, no points, then ends', () => {
    const { state } = startSession(config(0));
    expect(state.phase).toBe('empty');
    expect(reduce(state, { type: 'tick', at: 1000 + 9999 }).state.phase).toBe('empty');
    const r = reduce(state, { type: 'tick', at: 1000 + 10_000 });
    expect(r.state.phase).toBe('done');
    expect(r.state.endReason).toBe('empty');
    expect(r.state.economy.points).toBe(10);
    expect(r.effects).toEqual([{ type: 'end', reason: 'empty', at: 11_000 }]);
  });

  it('AC95: parent end keeps points, logs open questions as niet beantwoord with no box change', () => {
    const { state } = startSession(config(4));
    const r = run(state, [ans(1, right), { type: 'next', at: 2 }, { type: 'parentEnd', at: 3 }]);
    expect(r.state.phase).toBe('done');
    expect(r.state.endReason).toBe('parent');
    expect(r.state.economy.points).toBe(12);
    const un = r.effects.filter((e) => e.type === 'unanswered');
    expect(un).toEqual([
      { type: 'unanswered', itemId: 't1' },
      { type: 'unanswered', itemId: 't2' },
      { type: 'unanswered', itemId: 't3' },
    ]);
    expect(r.effects.filter((e) => e.type === 'box')).toHaveLength(1);
    expect(r.effects.at(-1)).toEqual({ type: 'end', reason: 'parent', at: 3 });
    // Second parent end does nothing.
    expect(reduce(r.state, { type: 'parentEnd', at: 4 }).effects).toEqual([]);
  });

  it('AC95: parent end on a retry does not log that question twice', () => {
    const { state } = startSession(config(2));
    const r = run(state, [ans(1, wrong), { type: 'parentEnd', at: 2 }]);
    expect(r.effects.filter((e) => e.type === 'unanswered')).toEqual([{ type: 'unanswered', itemId: 't1' }]);
  });

  it('AC52: practice has no bonus and no day cap, and follows the Punten setting', () => {
    const eco = { points: 5, practicePointsToday: 0, practiceDay: '' };
    const { state } = startSession(config(1, { mode: 'practice', economy: eco }));
    const t = run(state, [ans(1, wrong), ans(2, wrong)]);
    expect(t.state.economy.points).toBe(4);
    const s2 = startSession(config(1, { mode: 'practice', economy: eco })).state;
    const b = run(s2, [ans(1, right), { type: 'next', at: 2 }]);
    expect(b.state.summary).toMatchObject({ bonus: 0, earned: 2 });

    const capped = { points: 5, practicePointsToday: 10, practiceDay: DAY };
    const c = run(startSession(config(1, { mode: 'practice', economy: capped })).state, [ans(1, right)]);
    expect(c.state.economy.points).toBe(7);
  });

  it('preview changes nothing: no points, boxes, logs', () => {
    const { state } = startSession(config(2, { mode: 'preview' }));
    const r = run(state, [ans(1, wrong), ans(2, right), { type: 'next', at: 3 }, ans(4, right), { type: 'next', at: 5 }]);
    expect(r.effects).toEqual([]);
    expect(r.state.phase).toBe('summary');
    expect(r.state.economy.points).toBe(10);
    expect(r.state.summary).toMatchObject({ right: 2, bonus: 0, earned: 0 });
    const p = run(startSession(config(2, { mode: 'preview' })).state, [{ type: 'parentEnd', at: 1 }]);
    expect(p.effects).toEqual([{ type: 'end', reason: 'parent', at: 1 }]);
  });

  it('lesson first: answers are ignored until lessonDone', () => {
    const { state } = startSession(config(1, { lessonFirst: true }));
    expect(state.phase).toBe('lesson');
    expect(reduce(state, ans(2, right)).effects).toEqual([]);
    const r = reduce(state, { type: 'lessonDone', at: 5000 });
    expect(r.state.phase).toBe('question');
    expect(r.state.shownAt).toBe(5000);
  });

  it('rekenen entries compare typed answers as numbers', () => {
    const typed = { id: 'r1', type: 'type', level: 'M6', skill: 's', prompt: 'p', explain: 'e', answer: ['0,3'] } as const;
    const { state } = startSession(config(1, { entries: [{ item: { ...typed, answer: ['0,3'] }, box: 0, numeric: true }] }));
    const r = reduce(state, { type: 'answer', at: 2, response: { type: 'type', text: '0,30' } });
    expect(r.state.results[0]).toBe('first');
  });

  it('AC37: state survives a JSON round trip at any step, also on a retry', () => {
    const { state } = startSession(config(3));
    const mid = run(state, [ans(1, right), { type: 'next', at: 2 }, ans(3, wrong)]).state;
    expect(mid.try).toBe(2);
    const back = JSON.parse(JSON.stringify(mid)) as SessionState;
    expect(back).toEqual(mid);
    const a = reduce(back, ans(4, right));
    const b = reduce(mid, ans(4, right));
    expect(a).toEqual(b);
    expect(a.state.economy.points).toBe(13);
  });

  it('does not change the state it is given', () => {
    const { state } = startSession(config(2));
    const copy = JSON.stringify(state);
    run(state, [ans(1, wrong), ans(2, wrong), { type: 'parentEnd', at: 3 }]);
    expect(JSON.stringify(state)).toBe(copy);
  });
});

describe('Punten setting and no day limit (v10)', () => {
  const eco = (points: number, used = 0) => ({ points, practicePointsToday: used, practiceDay: DAY });
  const allFirst = (n: number): SessionEvent[] => {
    const ev: SessionEvent[] = [];
    for (let i = 0; i < n; i++) ev.push(ans(2000 + i * 10, right), { type: 'next', at: 2001 + i * 10 });
    return ev;
  };
  const one = (mode: 'makkelijk' | 'normaal' | 'moeilijk', events: SessionEvent[], points = 10) =>
    run(startSession(config(1, { pointsMode: mode, economy: eco(points) })).state, events);

  it('AC173: Makkelijk, a wrong first try and a wrong retry leave the total at 10', () => {
    const r = one('makkelijk', [ans(1, wrong)]);
    expect(r.state.economy.points).toBe(10);
    expect(r.state.lastApplied).toBe(0);
    expect(run(r.state, [ans(2, wrong)]).state.economy.points).toBe(10);
  });

  it('AC173: Normaal, a wrong first try leaves 10 and a wrong retry gives 9', () => {
    const r = one('normaal', [ans(1, wrong)]);
    expect(r.state.economy.points).toBe(10);
    expect(r.state.lastApplied).toBe(0);
    const t = run(r.state, [ans(2, wrong)]);
    expect(t.state.economy.points).toBe(9);
    expect(t.state.lastApplied).toBe(-1);
  });

  it('AC173: Moeilijk, a wrong first try takes 1; a right retry gives it back, a wrong retry takes 1 more', () => {
    const r = one('moeilijk', [ans(1, wrong)]);
    expect(r.state.economy.points).toBe(9);
    expect(r.state.lastApplied).toBe(-1);
    const ok = run(r.state, [ans(2, right)]);
    expect(ok.state.economy.points).toBe(10);
    expect(ok.state.lastApplied).toBe(1);
    expect(run(r.state, [ans(2, wrong)]).state.economy.points).toBe(8);
  });

  it('AC173: 4 right on the first try plus 1 teach moment gives 8, 7 and 6', () => {
    for (const [mode, expected] of [['makkelijk', 8], ['normaal', 7], ['moeilijk', 6]] as const) {
      const { state } = startSession(config(5, { pointsMode: mode, economy: eco(0) }));
      const events: SessionEvent[] = [];
      for (let i = 0; i < 4; i++) events.push(ans(10 + i * 2, right), { type: 'next', at: 11 + i * 2 });
      events.push(ans(100, wrong), ans(101, wrong), { type: 'understood', at: 102 });
      const r = run(state, events);
      expect(r.state.phase).toBe('summary');
      expect(r.state.summary?.earned).toBe(expected);
      expect(r.state.economy.points).toBe(expected);
    }
  });

  it('AC173: a session without pointsMode (old save) reads as Normaal', () => {
    const { state } = startSession(config(1, { economy: eco(10) }));
    const old = JSON.parse(JSON.stringify({ ...state, pointsMode: undefined })) as SessionState;
    expect(run(old, [ans(1, wrong), ans(2, wrong)]).state.economy.points).toBe(9);
  });

  it('AC174: Moeilijk at 1 point: first wrong takes it, the teach moment shows no minus', () => {
    const r = one('moeilijk', [ans(1, wrong)], 1);
    expect(r.state.economy.points).toBe(0);
    expect(r.state.lastApplied).toBe(-1);
    const t = run(r.state, [ans(2, wrong)]);
    expect(t.state.economy.points).toBe(0);
    expect(t.state.lastApplied).toBe(0);
  });

  it('AC174: a stale minus from the last question is not shown on the next wrong first try (Normaal)', () => {
    const { state } = startSession(config(2, { pointsMode: 'normaal', economy: eco(10) }));
    const r = run(state, [ans(1, wrong), ans(2, wrong), { type: 'understood', at: 3 }, ans(4, wrong)]);
    expect(r.state.lastApplied).toBe(0);
  });

  it('AC175: 50 points earned today do not matter, every right answer pays and the bonus comes', () => {
    const { state } = startSession(config(5, { early: true, economy: eco(10, 50) }));
    const r = run(state, allFirst(5));
    expect(r.state.summary).toMatchObject({ earned: 13, bonus: 3 });
    expect(r.state.economy.points).toBe(23);
    // Extra oefenen: pays +2, no bonus
    const p = run(startSession(config(1, { mode: 'practice', economy: eco(10, 99) })).state, [ans(1, right)]);
    expect(p.state.lastApplied).toBe(2);
  });

  it('AC176: +2, +1, -1 and -1 on Moeilijk adds up to the change in the total', () => {
    const { state } = startSession(config(4, { pointsMode: 'moeilijk', economy: eco(10) }));
    const r = run(state, [
      ans(1, right), { type: 'next', at: 2 }, // +2
      ans(3, wrong), ans(4, right), { type: 'next', at: 5 }, // -1 then +1
      ans(6, wrong), ans(7, wrong), { type: 'understood', at: 8 }, // -1 and -1
      ans(9, wrong), ans(10, right), { type: 'next', at: 11 }, // -1 then +1
    ]);
    expect(r.state.summary?.earned).toBe(r.state.economy.points - 10);
    expect(r.state.summary?.earned).toBe(0);
    const net = r.effects.filter((e) => e.type === 'points').reduce((n, e) => n + (e.type === 'points' ? e.applied : 0), 0);
    expect(net).toBe(r.state.summary?.earned);
  });

  it('AC176: a round of only mistakes shows a negative sum equal to the change', () => {
    const { state } = startSession(config(1, { pointsMode: 'moeilijk', economy: eco(10) }));
    const r = run(state, [ans(1, wrong), ans(2, wrong), { type: 'understood', at: 3 }]);
    expect(r.state.summary).toMatchObject({ earned: -2, pointsTotal: 8, hard: true });
  });

  it('AC174: the saved session survives a JSON round trip with a minus', () => {
    const r = one('moeilijk', [ans(1, wrong)]);
    const back = JSON.parse(JSON.stringify(r.state)) as SessionState;
    expect(back).toEqual(r.state);
  });
});
