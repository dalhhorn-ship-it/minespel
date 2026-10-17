import { describe, expect, it } from 'vitest';
import { createCatalog, REKENEN_MODULE_ID, TAAL_MODULE_ID } from '../content/catalog';
import {
  setModuleLevels,
  setSkillOn,
  setTopicOn,
} from '../content/switches';
import { createRng } from '../core/rng';
import type { ProgressRecord } from '../storage/progress-store';
import { defaultKv } from '../storage/schema';
import { applyProgressUpdate } from './generated-items';
import { emptyRotation } from './rotation';
import { selectBreakItems } from './selection';
import { applyFirstTry } from './srs';

describe('selection (T38)', () => {
  it('with N = 5 and 4 due items (2 in box 1), picks 3 review items (both box 1 first) and 2 new items (AC43)', () => {
    const catalog = createCatalog();
    const switches = defaultKv('switches');
    const items = catalog.fixedItems(TAAL_MODULE_ID, 'ww-tegenwoordig', { levels: ['M6'] });

    const progress: ProgressRecord[] = [
      {
        moduleId: TAAL_MODULE_ID,
        itemId: items[0]!.id,
        topic: 'ww-tegenwoordig',
        skill: items[0]!.skill,
        level: 'M6',
        box: 3,
        due: '2026-10-15',
        seen: 2,
      },
      {
        moduleId: TAAL_MODULE_ID,
        itemId: items[1]!.id,
        topic: 'ww-tegenwoordig',
        skill: items[1]!.skill,
        level: 'M6',
        box: 2,
        due: '2026-10-10', // oldest non-box-1 due
        seen: 1,
      },
      {
        moduleId: TAAL_MODULE_ID,
        itemId: items[2]!.id,
        topic: 'ww-tegenwoordig',
        skill: items[2]!.skill,
        level: 'M6',
        box: 1,
        due: '2026-10-17',
        seen: 1,
      },
      {
        moduleId: TAAL_MODULE_ID,
        itemId: items[3]!.id,
        topic: 'ww-tegenwoordig',
        skill: items[3]!.skill,
        level: 'M6',
        box: 1,
        due: '2026-10-16',
        seen: 1,
      },
    ];

    const res = selectBreakItems({
      catalog,
      switches,
      rotation: emptyRotation(),
      progress,
      moduleId: TAAL_MODULE_ID,
      count: 5,
      today: '2026-10-17',
      rng: createRng(42),
      shuffleOrder: false,
    });

    expect(res.entries).toHaveLength(5);
    const reviews = res.entries.filter((e) => e.box > 0);
    const news = res.entries.filter((e) => e.box === 0);
    expect(reviews).toHaveLength(3);
    expect(news).toHaveLength(2);
    const reviewIds = reviews.map((e) => e.item.id);
    expect(reviewIds).toContain(items[2]!.id);
    expect(reviewIds).toContain(items[3]!.id);
    expect(reviewIds).toContain(items[1]!.id); // oldest due of the remaining
  });

  it('with N = 5 and 0 due items, picks 5 new items from one topic (AC44, AC119)', () => {
    const catalog = createCatalog();
    const res = selectBreakItems({
      catalog,
      switches: defaultKv('switches'),
      rotation: emptyRotation(),
      progress: [],
      moduleId: TAAL_MODULE_ID,
      count: 5,
      today: '2026-10-17',
      rng: createRng(7),
    });

    expect(res.entries).toHaveLength(5);
    expect(res.newTopicId).toBe('ww-tegenwoordig');
    expect(res.entries.every((e) => e.box === 0)).toBe(true);
    const uniqueIds = new Set(res.entries.map((e) => e.item.id));
    expect(uniqueIds.size).toBe(5);
    for (const e of res.entries) {
      expect(catalog.topicOfItem(TAAL_MODULE_ID, e.item.id)).toBe('ww-tegenwoordig');
    }
  });

  it('picks new items from M6 before E6 within a topic (AC45)', () => {
    const catalog = createCatalog();
    let switches = defaultKv('switches');
    switches = setModuleLevels(switches, catalog, TAAL_MODULE_ID, ['M6', 'E6']);
    const m6Items = catalog.fixedItems(TAAL_MODULE_ID, 'ww-tegenwoordig', { levels: ['M6'] });

    // Leave only 2 M6 items unseen, mark the rest as seen in box 4 (not due today).
    const progress: ProgressRecord[] = m6Items.slice(2).map((item) => ({
      moduleId: TAAL_MODULE_ID,
      itemId: item.id,
      topic: 'ww-tegenwoordig',
      skill: item.skill,
      level: item.level,
      box: 4,
      due: '2026-10-25',
      seen: 1,
    }));

    const res = selectBreakItems({
      catalog,
      switches,
      rotation: emptyRotation(),
      progress,
      moduleId: TAAL_MODULE_ID,
      count: 2,
      today: '2026-10-17',
      rng: createRng(11),
    });

    expect(res.entries).toHaveLength(2);
    expect(res.entries.every((e) => e.item.level === 'M6')).toBe(true);
  });

  it('rotates through switched on topics in teaching order across breaks (AC46)', () => {
    const catalog = createCatalog();
    const switches = defaultKv('switches');
    let rotation = emptyRotation();
    const chosenTopics: (string | null)[] = [];

    for (let i = 0; i < 4; i++) {
      const res = selectBreakItems({
        catalog,
        switches,
        rotation,
        progress: [],
        moduleId: TAAL_MODULE_ID,
        count: 5,
        today: '2026-10-17',
        rng: createRng(100 + i),
      });
      chosenTopics.push(res.newTopicId);
      rotation = res.rotation;
    }

    const expectedTopics = catalog
      .getModule(TAAL_MODULE_ID)!
      .topics.slice(0, 4)
      .map((t) => t.id);
    expect(chosenTopics).toEqual(expectedTopics);
  });

  it('only picks seen items when newLessonsEnabled is false, and respects switched off nodes (AC47, AC48)', () => {
    const catalog = createCatalog();
    let switches = defaultKv('switches');
    const kommaItems = catalog.fixedItems(TAAL_MODULE_ID, 'komma', { levels: ['M6'] });
    const apostrofItems = catalog.fixedItems(TAAL_MODULE_ID, 'apostrof', { levels: ['M6'] });

    const progress: ProgressRecord[] = [
      {
        moduleId: TAAL_MODULE_ID,
        itemId: kommaItems[0]!.id,
        topic: 'komma',
        skill: kommaItems[0]!.skill,
        level: 'M6',
        box: 2,
        due: '2026-10-20', // not due yet, but seen
        seen: 1,
      },
      {
        moduleId: TAAL_MODULE_ID,
        itemId: apostrofItems[0]!.id,
        topic: 'apostrof',
        skill: apostrofItems[0]!.skill,
        level: 'M6',
        box: 1,
        due: '2026-10-17', // due, but we will switch apostrof off
        seen: 1,
      },
    ];

    switches = setTopicOn(switches, TAAL_MODULE_ID, 'apostrof', false);

    const res = selectBreakItems({
      catalog,
      switches,
      rotation: emptyRotation(),
      progress,
      moduleId: TAAL_MODULE_ID,
      count: 5,
      today: '2026-10-17',
      newLessonsEnabled: false,
      rng: createRng(9),
    });

    expect(res.entries).toHaveLength(1);
    expect(res.entries[0]?.item.id).toBe(kommaItems[0]!.id);
    expect(res.newTopicId).toBeNull();
  });

  it('brings back wrong tafels facts and wrong generated plus sums in the next Rekenen break (AC41, AC62, AC63)', () => {
    const catalog = createCatalog();
    let switches = defaultKv('switches');
    switches = setSkillOn(switches, REKENEN_MODULE_ID, 'tafels', 'tafel-7', true);

    let progress: ProgressRecord[] = [];
    // Wrong tafels fact 7 x 8 on first try -> box 1, due today (AC62).
    const box1 = applyFirstTry(0, false, '2026-10-17');
    progress = applyProgressUpdate(progress, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'tafels:7x8',
      topic: 'tafels',
      skill: 'tafel-7',
      level: 'E6',
      box: box1.box,
      due: box1.due,
      firstTryRight: false,
      at: 1000,
    }).records;

    // Wrong generated plus sum 47 + 38 on first try -> box 1, due today (AC63).
    progress = applyProgressUpdate(progress, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'optellen:47+38',
      topic: 'optellen',
      skill: 'plus',
      level: 'M6',
      box: box1.box,
      due: box1.due,
      firstTryRight: false,
      at: 2000,
    }).records;

    const nextBreak = selectBreakItems({
      catalog,
      switches,
      rotation: emptyRotation(),
      progress,
      moduleId: REKENEN_MODULE_ID,
      count: 5,
      today: '2026-10-17',
      rng: createRng(19),
    });

    const ids = nextBreak.entries.map((e) => e.item.id);
    expect(ids).toContain('tafels:7x8');
    expect(ids).toContain('optellen:47+38');

    // Now optellen:47+38 is answered right on first try -> moves to box 2 (due tomorrow) and is never offered as a new sum today.
    const box2 = applyFirstTry(1, true, '2026-10-17');
    progress = applyProgressUpdate(progress, {
      moduleId: REKENEN_MODULE_ID,
      itemId: 'optellen:47+38',
      topic: 'optellen',
      skill: 'plus',
      level: 'M6',
      box: box2.box,
      due: box2.due,
      firstTryRight: true,
      at: 3000,
    }).records;

    // Force only new optellen sums today: optellen:47+38 is not due today and must not be drawn as a new sum.
    const optellenOnly = selectBreakItems({
      catalog,
      switches,
      rotation: emptyRotation(),
      progress: progress.filter((p) => p.topic === 'optellen'),
      moduleId: REKENEN_MODULE_ID,
      count: 10,
      today: '2026-10-17',
      rng: createRng(23),
    });
    const newEntries = optellenOnly.entries.filter((e) => e.box === 0);
    expect(newEntries.map((e) => e.item.id)).not.toContain('optellen:47+38');
  });
});
