import { describe, expect, it } from 'vitest';
import { APP_NAME, FORMAT_VERSION, type ModuleBundle } from './format';
import { createCatalog, REKENEN_MODULE_ID, subjectLabel, TAAL_MODULE_ID } from './catalog';

const customModule: ModuleBundle = {
  app: APP_NAME,
  kind: 'module',
  formatVersion: FORMAT_VERSION,
  createdAt: '2026-10-17T00:00:00.000Z',
  module: {
    id: 'own-engels',
    title: 'Engels woorden',
    subject: 'engels',
    version: 1,
    language: 'nl',
    levels: ['M6', 'E6'],
    topics: ['dieren'],
    exams: [],
  },
  topics: [
    {
      id: 'dieren',
      title: 'Dieren',
      groups: [6],
      lesson: { pages: [] },
      items: [
        {
          id: 'own-item-1',
          type: 'type',
          level: 'M6',
          skill: 'vertalen',
          prompt: 'hond = ?',
          explain: 'dog',
          answer: ['dog'],
        },
        {
          id: 'own-item-2',
          type: 'choice',
          level: 'E6',
          skill: 'kiezen',
          prompt: 'Kies kat',
          options: ['cat', 'cow'],
          answer: 0,
          explain: 'cat',
        },
      ],
    },
  ],
};

describe('catalog (T35)', () => {
  it('includes the built in modules and any own modules', () => {
    const catalog = createCatalog([customModule]);
    expect(catalog.modules().map((m) => m.module.id)).toEqual([
      REKENEN_MODULE_ID,
      TAAL_MODULE_ID,
      'taal-e6',
      'own-engels',
    ]);
    expect(catalog.isBuiltIn(REKENEN_MODULE_ID)).toBe(true);
    expect(catalog.isBuiltIn(TAAL_MODULE_ID)).toBe(true);
    expect(catalog.isBuiltIn('own-engels')).toBe(false);
    expect(catalog.subjects()).toEqual(['rekenen', 'taal', 'engels']);
    expect(subjectLabel('rekenen')).toBe('Rekenen');
    expect(subjectLabel('taal')).toBe('Taal');
    expect(subjectLabel('engels')).toBe('Engels');
  });

  it('looks up JSON items and generated Rekenen items with their saved level', () => {
    const catalog = createCatalog([customModule]);
    const own = catalog.getItem('own-engels', 'own-item-1');
    expect(own?.prompt).toBe('hond = ?');

    const fact = catalog.getItem(REKENEN_MODULE_ID, 'tafels:7x8');
    expect(fact?.level).toBe('E6');
    expect(fact?.skill).toBe('tafel-7');

    // A small plus sum saved at E6 or M7 keeps its saved level when passed to getItem.
    const plusM6 = catalog.getItem(REKENEN_MODULE_ID, 'optellen:47+38', 'M6');
    const plusE6 = catalog.getItem(REKENEN_MODULE_ID, 'optellen:47+38', 'E6');
    expect(plusM6?.level).toBe('M6');
    expect(plusE6?.level).toBe('E6');
    expect(catalog.topicOfItem(REKENEN_MODULE_ID, 'optellen:47+38')).toBe('optellen');
    expect(catalog.topicOfItem('own-engels', 'own-item-2')).toBe('dieren');
  });

  it('lists skills and fixed items per topic and level', () => {
    const catalog = createCatalog([customModule]);
    expect(catalog.skillsOfTopic('own-engels', 'dieren')).toEqual(['vertalen', 'kiezen']);
    expect(catalog.skillsOfTopicAtLevel('own-engels', 'dieren', 'M6')).toEqual(['vertalen']);
    expect(catalog.fixedItems('own-engels', 'dieren', { levels: ['M6'] })).toHaveLength(1);

    // Rekenen tafels at M6 has 6 tables (1..5, 10) * 10 facts = 60 items.
    const tafelsM6 = catalog.fixedItems(REKENEN_MODULE_ID, 'tafels', { levels: ['M6'] });
    expect(tafelsM6).toHaveLength(60);
    const tafel3Only = catalog.fixedItems(REKENEN_MODULE_ID, 'tafels', {
      levels: ['M6'],
      skills: ['tafel-3'],
    });
    expect(tafel3Only).toHaveLength(10);

    // Open Rekenen topics have no fixed item list.
    expect(catalog.isOpenTopic(REKENEN_MODULE_ID, 'optellen')).toBe(true);
    expect(catalog.isOpenTopic(REKENEN_MODULE_ID, 'tafels')).toBe(false);
    expect(catalog.fixedItems(REKENEN_MODULE_ID, 'optellen')).toEqual([]);
  });
});
