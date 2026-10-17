import { describe, expect, it } from 'vitest';
import { BUILT_IN_IDS, BUILT_IN_TAAL_ID, createCatalog, loadCatalog } from './catalog';
import type { ModuleBundle } from './format';
import { TAAL_MODULE_ID } from './taal';
import { REKENEN_MODULE_ID } from './rekenen/module';

function ownBundle(id = 'own-abc'): ModuleBundle {
  const item = (n: number, level: string, skill: string) => ({
    id: `${id}-i${n}`, type: 'type' as const, level, skill, prompt: 'p', explain: 'e', answer: ['x'],
  });
  return {
    app: 'Dino Blokwereld', kind: 'module', formatVersion: 1, createdAt: '2026-01-01T00:00:00.000Z',
    module: { id, title: 'Engels', subject: 'engels', version: 1, language: 'en', levels: ['M6', 'E6'], topics: ['t1'], exams: [] },
    topics: [{ id: 't1', title: 'T1', groups: [6], lesson: { pages: [] }, items: [item(1, 'M6', 'a'), item(2, 'M6', 'b'), item(3, 'E6', 'a')] }],
  };
}

describe('catalog', () => {
  it('keeps the Taal id in step with taal.ts', () => {
    expect(BUILT_IN_TAAL_ID).toBe(TAAL_MODULE_ID);
    expect(BUILT_IN_IDS).toContain(REKENEN_MODULE_ID);
  });

  it('merges built in and own modules, built in wins on a clash', async () => {
    const cat = await loadCatalog([ownBundle(), ownBundle(REKENEN_MODULE_ID)]);
    expect(cat.modules().map((m) => m.id)).toEqual([REKENEN_MODULE_ID, TAAL_MODULE_ID, 'own-abc']);
    expect(cat.module('own-abc')?.builtIn).toBe(false);
    expect(cat.module(REKENEN_MODULE_ID)?.generated).toBe(true);
    expect(cat.module(REKENEN_MODULE_ID)?.title).toBe('Rekenen basis');
  });

  it('finds stored items, generated facts and generated sums with the saved level', async () => {
    const cat = await loadCatalog([ownBundle()]);
    expect(cat.item('own-abc', 'own-abc-i2')?.skill).toBe('b');
    expect(cat.item('own-abc', 'nope')).toBeNull();
    expect(cat.item(REKENEN_MODULE_ID, 'tafels:7x8')?.level).toBe('E6');
    expect(cat.item(REKENEN_MODULE_ID, 'optellen:470+380', 'E6')?.level).toBe('E6');
    expect(cat.item(REKENEN_MODULE_ID, 'optellen:470+380', 'M6')).toBeNull();
    expect(cat.item(REKENEN_MODULE_ID, 'optellen:d34+57', 'E7')?.level).toBe('E7');
    expect(cat.item('missing', 'x')).toBeNull();
    const taalItem = cat.topics(TAAL_MODULE_ID)[0]?.items[0];
    expect(cat.item(TAAL_MODULE_ID, taalItem?.id as string)).toBe(taalItem);
  });

  it('lists topics, levels, skills and cells', async () => {
    const cat = await loadCatalog([ownBundle()]);
    expect(cat.levels('own-abc')).toEqual(['M6', 'E6']);
    expect(cat.skills('own-abc', 't1')).toEqual(['a', 'b']);
    expect(cat.cells('own-abc', 't1')).toContainEqual({ level: 'M6', skill: 'a', count: 1 });
    expect(cat.isOpen(REKENEN_MODULE_ID, 'optellen')).toBe(true);
    expect(cat.isOpen(REKENEN_MODULE_ID, 'tafels')).toBe(false);
    expect(cat.items(REKENEN_MODULE_ID, 'optellen')).toEqual([]);
    expect(cat.cells(REKENEN_MODULE_ID, 'optellen')).toContainEqual({ level: 'E7', skill: 'plus', count: null });
    expect(cat.skills(REKENEN_MODULE_ID, 'tafels')).toContain('tafel-7');
    const tafel7 = cat.cells(REKENEN_MODULE_ID, 'tafels').find((c) => c.skill === 'tafel-7');
    expect(tafel7).toEqual({ level: 'E6', skill: 'tafel-7', count: 10 });
    expect(cat.items(REKENEN_MODULE_ID, 'delen').every((m) => cat.item(REKENEN_MODULE_ID, m.id, m.level) !== null)).toBe(true);
  });

  it('works with only a custom list of bundles', () => {
    expect(createCatalog([]).modules()).toEqual([]);
    expect(createCatalog([]).topics('x')).toEqual([]);
  });
});
