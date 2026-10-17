import { beforeAll, describe, expect, it } from 'vitest';
import { loadCatalog, type Catalog } from '../content/catalog';
import { REKENEN_MODULE_ID } from '../content/rekenen/module';
import { TAAL_MODULE_ID } from '../content/taal';
import { readSwitches, setModuleLevels, setSkillOn, setTopicOn, usableItems, type Switches } from '../content/switches';
import { createRng } from '../core/rng';
import type { ProgressRecord } from '../storage/progress-store';
import { startSession } from './break-session';
import { emptyRotation } from './rotation';
import { selectQuestions, type SelectionInput } from './selection';

let cat: Catalog;
beforeAll(async () => {
  cat = await loadCatalog();
});
const R = REKENEN_MODULE_ID;
const T = TAAL_MODULE_ID;
const TODAY = '2026-10-17';
const fresh = (): Switches => readSwitches(undefined);

function rec(moduleId: string, itemId: string, box: number, due: string, level: string, topic: string, skill = 's'): ProgressRecord {
  return { moduleId, itemId, box, due, level, topic, skill, seen: 1 };
}

function input(over: Partial<SelectionInput> = {}): SelectionInput {
  return {
    catalog: cat,
    switches: fresh(),
    moduleId: R,
    count: 5,
    progress: [],
    rotation: emptyRotation(),
    today: TODAY,
    newAllowed: true,
    rng: createRng(1),
    ...over,
  };
}

const ids = (r: { entries: { item: { id: string } }[] }): string[] => r.entries.map((e) => e.item.id);

/** Tafels facts as seen records, with the skill the catalog gives them. */
function tafelsSeen(n: number, box: number, due: string): ProgressRecord[] {
  return usableItems(fresh(), cat, R, 'tafels')
    .filter((m) => m.level === 'M6')
    .slice(0, n)
    .map((m) => rec(R, m.id, box, due, 'M6', 'tafels', m.skill));
}

describe('selectQuestions', () => {
  it('AC43: 4 due (2 in box 1) with N=5 gives 3 review, box 1 first, and 2 new', () => {
    const seen = tafelsSeen(4, 2, '2026-10-10');
    seen[0] = { ...seen[0] as ProgressRecord, box: 1 };
    seen[1] = { ...seen[1] as ProgressRecord, box: 1, due: '2026-10-16' };
    const r = selectQuestions(input({ progress: seen }));
    expect(r.entries).toHaveLength(5);
    const old = r.entries.filter((e) => e.box > 0);
    expect(old).toHaveLength(3);
    expect(old.filter((e) => e.box === 1).map((e) => e.item.id).sort()).toEqual(
      [seen[0]?.itemId, seen[1]?.itemId].sort(),
    );
    expect(r.entries.filter((e) => e.box === 0)).toHaveLength(2);
    expect(r.newCount).toBe(2);
  });

  it('AC44: nothing due gives 5 new items from one topic', () => {
    const r = selectQuestions(input());
    expect(r.entries).toHaveLength(5);
    expect(r.entries.every((e) => e.box === 0)).toBe(true);
    const topics = new Set(r.entries.map((e) => e.item.id.split(':')[0]));
    expect(topics.size).toBe(1);
    expect(r.newTopicId).toBe([...topics][0]);
  });

  it('marks Rekenen type items numeric and Taal not', () => {
    expect(selectQuestions(input()).entries.every((e) => e.numeric === true)).toBe(true);
    const taal = selectQuestions(input({ moduleId: T }));
    expect(taal.entries.length).toBe(5);
    expect(taal.entries.every((e) => e.numeric === undefined)).toBe(true);
  });

  it('AC45: new items come from M6 until none is new, then E6', () => {
    const sw = setModuleLevels(setTopicOn(setTopicOn(setTopicOn(fresh(), R, 'optellen', false), R, 'aftrekken', false), R, 'delen', false), R, ['M6', 'E6']);
    const m6 = usableItems(sw, cat, R, 'tafels').filter((m) => m.level === 'M6');
    const first = selectQuestions(input({ switches: sw, count: 6 }));
    expect(first.entries.every((e) => (e.item as { level: string }).level === 'M6')).toBe(true);
    // all but 3 of the M6 facts are seen: 3 new M6 first, rest from E6
    const seen = m6.slice(3).map((m) => rec(R, m.id, 5, '2030-01-01', 'M6', 'tafels', m.skill));
    const r = selectQuestions(input({ switches: sw, count: 6, progress: seen, rotation: first.rotation }));
    const lv = r.entries.map((e) => (e.item as { level: string }).level);
    expect(lv.filter((l) => l === 'M6')).toHaveLength(3);
    expect(lv.filter((l) => l === 'E6')).toHaveLength(3);
  });

  it('AC46: breaks use the topics in teaching order, also after a restart', () => {
    const topics: (string | null)[] = [];
    let rotation = emptyRotation();
    for (let i = 0; i < 5; i++) {
      const r = selectQuestions(input({ rotation, rng: createRng(i) }));
      topics.push(r.newTopicId);
      rotation = JSON.parse(JSON.stringify(r.rotation));
    }
    const order = cat.topics(R).map((t) => t.id);
    expect(topics).toEqual([...order, order[0]]);
  });

  it('AC46: skips a topic that is off', () => {
    const sw = setTopicOn(fresh(), R, 'optellen', false);
    const t = selectQuestions(input({ switches: sw })).newTopicId;
    expect(t).toBe('aftrekken');
  });

  it('AC47: with new off only seen items come, and nothing else when none are seen', () => {
    expect(selectQuestions(input({ newAllowed: false })).entries).toEqual([]);
    const seen = tafelsSeen(3, 2, '2030-01-01'); // not due
    const r = selectQuestions(input({ newAllowed: false, progress: seen }));
    expect(r.entries).toHaveLength(3);
    expect(r.entries.every((e) => e.box === 2)).toBe(true);
    expect(r.newTopicId).toBeNull();
  });

  it('step 3: fills with more due items, then not due items with the lowest box', () => {
    const dueSeen = tafelsSeen(2, 2, '2026-10-01');
    const rest = usableItems(fresh(), cat, R, 'tafels').filter((m) => m.level === 'M6').slice(2, 5);
    const later = [
      rec(R, rest[0]?.id as string, 4, '2030-01-01', 'M6', 'tafels', rest[0]?.skill),
      rec(R, rest[1]?.id as string, 2, '2030-01-01', 'M6', 'tafels', rest[1]?.skill),
      rec(R, rest[2]?.id as string, 3, '2030-01-01', 'M6', 'tafels', rest[2]?.skill),
    ];
    const r = selectQuestions(input({ newAllowed: false, progress: [...dueSeen, ...later] }));
    expect(r.entries).toHaveLength(5);
    const boxes = r.entries.map((e) => e.box).sort();
    expect(boxes).toEqual([2, 2, 2, 3, 4]);
    const r4 = selectQuestions(input({ newAllowed: false, count: 4, progress: [...dueSeen, ...later] }));
    expect(r4.entries.map((e) => e.box).sort()).toEqual([2, 2, 2, 3]);
  });

  it('AC48: switched off skills and levels are never asked, also when due', () => {
    const seen = tafelsSeen(3, 1, '2026-10-01');
    const skill = seen[0]?.skill as string;
    const sw = setSkillOn(fresh(), R, 'tafels', skill, false);
    for (let s = 0; s < 20; s++) {
      const r = selectQuestions(input({ switches: sw, progress: seen, rng: createRng(s) }));
      expect(r.entries.every((e) => e.item.skill !== skill)).toBe(true);
    }
    const sw2 = setModuleLevels(fresh(), R, ['E6']);
    const r2 = selectQuestions(input({ switches: sw2, progress: seen }));
    expect(r2.entries.length).toBe(5);
    expect(r2.entries.every((e) => e.box === 0 && (e.item as { level: string }).level === 'E6')).toBe(true);
  });

  it('AC41 and AC119: leaves out asked items and never repeats one', () => {
    const seen = tafelsSeen(4, 1, TODAY);
    const asked = [seen[0]?.itemId as string];
    for (let s = 0; s < 20; s++) {
      const r = selectQuestions(input({ progress: seen, asked, rng: createRng(s) }));
      const got = ids(r);
      expect(new Set(got).size).toBe(got.length);
      expect(got).not.toContain(asked[0]);
    }
  });

  it('AC62: a wrong tafels fact (box 1) comes back in the next break', () => {
    const seen = tafelsSeen(1, 1, TODAY);
    const r = selectQuestions(input({ progress: seen }));
    expect(ids(r)).toContain(seen[0]?.itemId);
  });

  it('AC63: a saved wrong sum comes back, is never new, and uses the saved level', () => {
    const wrong = rec(R, 'optellen:47+38', 1, TODAY, 'M6', 'optellen', 'x');
    const item = cat.item(R, wrong.itemId, 'M6');
    expect(item).not.toBeNull();
    const sw = setTopicOn(setTopicOn(setTopicOn(fresh(), R, 'tafels', false), R, 'delen', false), R, 'aftrekken', false);
    const r = selectQuestions(input({ switches: sw, progress: [{ ...wrong, skill: item?.skill as string }], count: 6 }));
    const found = r.entries.filter((e) => e.item.id === wrong.itemId);
    expect(found).toHaveLength(1);
    expect(found[0]?.box).toBe(1);
    // never offered as new again, over many seeds with it excluded from due by being asked
    for (let s = 0; s < 30; s++) {
      const r2 = selectQuestions(input({ switches: sw, progress: [{ ...wrong, skill: item?.skill as string, due: '2030-01-01' }], newAllowed: true, count: 6, rng: createRng(s) }));
      const hits = r2.entries.filter((e) => e.item.id === wrong.itemId);
      expect(hits.every((e) => e.box === 1)).toBe(true);
    }
  });

  it('keeps due items due when the clock went back (AC118)', () => {
    const seen = tafelsSeen(2, 2, '2026-10-17');
    const r = selectQuestions(input({ progress: seen, today: '2026-10-10', lastSeenDay: '2026-10-17', newAllowed: false, count: 2 }));
    expect(r.entries).toHaveLength(2);
  });

  it('is deterministic for a seed and ignores progress of other modules', () => {
    const other = rec(T, 'x', 1, TODAY, 'M6', 'tafels');
    const a = selectQuestions(input({ rng: createRng(9), progress: [other] }));
    const b = selectQuestions(input({ rng: createRng(9) }));
    expect(ids(a)).toEqual(ids(b));
  });

  it('returns nothing when nothing is on, and the result starts a session', () => {
    const none = selectQuestions(input({ switches: setModuleLevels(fresh(), R, []) }));
    expect(none.entries).toEqual([]);
    const ok = selectQuestions(input());
    const s = startSession({
      mode: 'break',
      entries: ok.entries,
      economy: { points: 0, practicePointsToday: 0, practiceDay: '' },
      day: TODAY,
      at: 0,
    });
    expect(s.state.entries).toHaveLength(5);
  });
});
