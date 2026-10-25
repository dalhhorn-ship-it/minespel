import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import {
  pickModuleForVillager,
  emptyRotation,
  hasSeenLesson,
  markLessonSeen,
  pickModule,
  pickTopic,
  type ModuleCandidate,
  type RotationState,
} from './rotation';

const roundTrip = (s: RotationState): RotationState => JSON.parse(JSON.stringify(s));

function run(cands: ModuleCandidate[], n: number, restart = false) {
  let s = emptyRotation();
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = pickModule(s, cands);
    s = restart ? roundTrip(r.state) : r.state;
    const id = r.moduleId as string;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

describe('pickModule', () => {
  const a = { id: 'a', weight: 1, usable: true };
  const b = { id: 'b', weight: 1, usable: true };

  it('gives 5 and 5 of 10 for equal weights', () => {
    expect(run([a, b], 10)).toEqual({ a: 5, b: 5 });
  });

  it('gives 6 and 3 of 9 for weights 2 and 1, also with a restart between breaks', () => {
    const cands = [{ ...a, weight: 2 }, b];
    expect(run(cands, 9)).toEqual({ a: 6, b: 3 });
    expect(run(cands, 9, true)).toEqual({ a: 6, b: 3 });
  });

  it('spreads turns smoothly', () => {
    let s = emptyRotation();
    const order: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = pickModule(s, [{ ...a, weight: 2 }, b]);
      s = r.state;
      order.push(r.moduleId as string);
    }
    expect(order).toEqual(['a', 'b', 'a', 'a', 'b', 'a']);
  });

  it('skips a module with no usable items', () => {
    expect(run([{ ...a, usable: false }, b], 4)).toEqual({ b: 4 });
  });

  it('skips a module with weight 0', () => {
    expect(run([{ ...a, weight: 0 }, b], 3)).toEqual({ b: 3 });
  });

  it('returns null when nothing is usable', () => {
    const r = pickModule(emptyRotation(), [{ ...a, usable: false }]);
    expect(r.moduleId).toBeNull();
    expect(pickModule(emptyRotation(), []).moduleId).toBeNull();
  });

  it('does not change the input state', () => {
    const s = emptyRotation();
    pickModule(s, [a, b]);
    expect(s).toEqual(emptyRotation());
  });

  it('does not build a debt for a module that was skipped', () => {
    let s = emptyRotation();
    for (let i = 0; i < 5; i++) s = pickModule(s, [{ ...a, usable: false }, b]).state;
    const counts: Record<string, number> = {};
    for (let i = 0; i < 10; i++) {
      const r = pickModule(s, [a, b]);
      s = r.state;
      counts[r.moduleId as string] = (counts[r.moduleId as string] ?? 0) + 1;
    }
    expect(counts).toEqual({ a: 5, b: 5 });
  });
});

describe('pickTopic', () => {
  const topics = (flags: boolean[]) => flags.map((hasNew, i) => ({ id: `t${i}`, hasNew }));

  it('uses the first three topics in order, then goes on, also after a restart', () => {
    let s = emptyRotation();
    const got: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const r = pickTopic(s, 'm', topics([true, true, true, true, true]));
      s = roundTrip(r.state);
      got.push(r.topicId);
    }
    expect(got).toEqual(['t0', 't1', 't2', 't3']);
  });

  it('skips topics without new items and wraps around', () => {
    let s = emptyRotation();
    const list = topics([true, false, true]);
    const got: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const r = pickTopic(s, 'm', list);
      s = r.state;
      got.push(r.topicId);
    }
    expect(got).toEqual(['t0', 't2', 't0', 't2']);
  });

  it('keeps a pointer per module', () => {
    let s = pickTopic(emptyRotation(), 'm1', topics([true, true])).state;
    expect(pickTopic(s, 'm2', topics([true, true])).topicId).toBe('t0');
    s = pickTopic(s, 'm2', topics([true, true])).state;
    expect(pickTopic(s, 'm1', topics([true, true])).topicId).toBe('t1');
  });

  it('returns null when no topic has new items or the list is empty', () => {
    expect(pickTopic(emptyRotation(), 'm', topics([false, false])).topicId).toBeNull();
    expect(pickTopic(emptyRotation(), 'm', []).topicId).toBeNull();
  });

  it('copes with a pointer past the end after topics were removed', () => {
    const s: RotationState = { ...emptyRotation(), topicPointers: { m: 9 } };
    expect(pickTopic(s, 'm', topics([true, true])).topicId).toBe('t1');
  });
});

describe('lessons seen', () => {
  it('marks once and survives a save and load', () => {
    let s = emptyRotation();
    expect(hasSeenLesson(s, 'm', 't')).toBe(false);
    s = markLessonSeen(s, 'm', 't');
    s = markLessonSeen(s, 'm', 't');
    expect(s.lessonsSeen).toEqual(['m/t']);
    s = roundTrip(s);
    expect(hasSeenLesson(s, 'm', 't')).toBe(true);
    expect(hasSeenLesson(s, 'm', 'other')).toBe(false);
  });
});

describe('pickModuleForVillager (V11d, AC183)', () => {
  const cands = [
    { id: 'a', weight: 3, usable: true },
    { id: 'b', weight: 1, usable: true },
    { id: 'c', weight: 5, usable: false },
  ];
  it('AC183: follows the weights, skips unusable modules, and has no state to move', () => {
    const rng = createRng(7);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 400; i++) counts[pickModuleForVillager(cands, rng) as string]!++;
    expect(counts.a! / 400).toBeGreaterThan(0.65);
    expect(counts.a! / 400).toBeLessThan(0.85);
    expect(counts.b!).toBeGreaterThan(0);
  });
  it('AC182: returns null when nothing is usable', () => {
    expect(pickModuleForVillager([{ id: 'c', weight: 5, usable: false }], createRng(1))).toBeNull();
    expect(pickModuleForVillager([], createRng(1))).toBeNull();
  });
});
