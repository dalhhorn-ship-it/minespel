import { describe, expect, it } from 'vitest';
import type { ProgressRecord } from '../storage/progress-store';
import { defaultKv } from '../storage/schema';
import { createCatalog, REKENEN_MODULE_ID, TAAL_MODULE_ID } from './catalog';
import {
  applyPreset,
  effectiveLevels,
  hasAnyUsableItems,
  isItemSwitchedOn,
  isModuleOn,
  isModuleUsable,
  isSkillOn,
  isSubjectOn,
  isTopicOn,
  moduleCounts,
  moduleLevels,
  moduleWeight,
  setModuleLevels,
  setModuleOn,
  setModuleWeight,
  setSkillOn,
  setSubjectOn,
  setTopicLevelOverride,
  setTopicOn,
  topicCounts,
} from './switches';

describe('switches (T35)', () => {
  it('defaults to everything on with all levels and weight 1', () => {
    const catalog = createCatalog();
    const s = defaultKv('switches');
    expect(isSubjectOn(s, 'taal')).toBe(true);
    expect(isModuleOn(s, catalog, TAAL_MODULE_ID)).toBe(true);
    expect(isTopicOn(s, catalog, TAAL_MODULE_ID, 'komma')).toBe(true);
    expect(moduleLevels(s, catalog, TAAL_MODULE_ID)).toEqual(['M6', 'E6', 'M7', 'E7']);
    expect(moduleWeight(s, TAAL_MODULE_ID)).toBe(1);
    expect(hasAnyUsableItems(s, catalog)).toBe(true);
  });

  it('switching off a topic switches off all its skills and updates the switched on count (AC78)', () => {
    const catalog = createCatalog();
    let s = defaultKv('switches');
    const beforeModule = moduleCounts(s, catalog, TAAL_MODULE_ID);
    const kommaCounts = topicCounts(s, catalog, TAAL_MODULE_ID, 'komma');
    expect(kommaCounts.switchedOn).toBeGreaterThan(0);

    const kommaSkills = catalog.skillsOfTopic(TAAL_MODULE_ID, 'komma');
    expect(kommaSkills.length).toBeGreaterThan(0);
    for (const sk of kommaSkills) {
      expect(isSkillOn(s, catalog, TAAL_MODULE_ID, 'komma', sk)).toBe(true);
    }

    s = setTopicOn(s, TAAL_MODULE_ID, 'komma', false);
    expect(isTopicOn(s, catalog, TAAL_MODULE_ID, 'komma')).toBe(false);
    for (const sk of kommaSkills) {
      expect(isSkillOn(s, catalog, TAAL_MODULE_ID, 'komma', sk)).toBe(false);
    }
    expect(topicCounts(s, catalog, TAAL_MODULE_ID, 'komma').switchedOn).toBe(0);
    const afterModule = moduleCounts(s, catalog, TAAL_MODULE_ID);
    expect(afterModule.switchedOn).toBe(beforeModule.switchedOn - kommaCounts.switchedOn);
  });

  it('switching off a subject or module cascades to everything under it (AC48, AC78)', () => {
    const catalog = createCatalog();
    let s = defaultKv('switches');
    s = setSubjectOn(s, 'rekenen', false);
    expect(isModuleOn(s, catalog, REKENEN_MODULE_ID)).toBe(false);
    expect(isTopicOn(s, catalog, REKENEN_MODULE_ID, 'tafels')).toBe(false);
    expect(isSkillOn(s, catalog, REKENEN_MODULE_ID, 'tafels', 'tafel-3')).toBe(false);
    expect(isModuleUsable(s, catalog, REKENEN_MODULE_ID)).toBe(false);

    s = setSubjectOn(s, 'rekenen', true);
    s = setModuleOn(s, REKENEN_MODULE_ID, false);
    expect(isModuleOn(s, catalog, REKENEN_MODULE_ID)).toBe(false);
    expect(moduleCounts(s, catalog, REKENEN_MODULE_ID).switchedOn).toBe(0);
  });

  it('supports module levels, topic overrides and skill switches (AC48)', () => {
    const catalog = createCatalog();
    let s = defaultKv('switches');
    s = setModuleLevels(s, catalog, REKENEN_MODULE_ID, ['M6']);
    expect(effectiveLevels(s, catalog, REKENEN_MODULE_ID, 'tafels')).toEqual(['M6']);

    // Topic override on komma: only M7.
    s = setTopicLevelOverride(s, catalog, TAAL_MODULE_ID, 'komma', ['M7']);
    expect(effectiveLevels(s, catalog, TAAL_MODULE_ID, 'komma')).toEqual(['M7']);
    expect(effectiveLevels(s, catalog, TAAL_MODULE_ID, 'apostrof')).toEqual(['M6', 'E6', 'M7', 'E7']);

    // Switch off tafel-2 at M6.
    s = setSkillOn(s, REKENEN_MODULE_ID, 'tafels', 'tafel-2', false);
    expect(
      isItemSwitchedOn(s, catalog, REKENEN_MODULE_ID, 'tafels', { skill: 'tafel-2', level: 'M6' }),
    ).toBe(false);
    expect(
      isItemSwitchedOn(s, catalog, REKENEN_MODULE_ID, 'tafels', { skill: 'tafel-3', level: 'M6' }),
    ).toBe(true);
    expect(
      isItemSwitchedOn(s, catalog, REKENEN_MODULE_ID, 'tafels', { skill: 'tafel-3', level: 'E6' }),
    ).toBe(false);
  });

  it('Groep 7 midden preset switches on M6, E6 and M7 and turns E7 off for both built in modules (AC79)', () => {
    const catalog = createCatalog();
    let s = defaultKv('switches');
    s = setTopicLevelOverride(s, catalog, TAAL_MODULE_ID, 'komma', ['E7']);
    s = applyPreset(s, catalog, 'groep-7-midden');
    expect(moduleLevels(s, catalog, REKENEN_MODULE_ID)).toEqual(['M6', 'E6', 'M7']);
    expect(moduleLevels(s, catalog, TAAL_MODULE_ID)).toEqual(['M6', 'E6', 'M7']);
    expect(effectiveLevels(s, catalog, TAAL_MODULE_ID, 'komma')).toEqual(['M6', 'E6', 'M7']);
  });

  it('clamps Vakverdeling weights to 1..5 and counts mastered (beheerst) items', () => {
    const catalog = createCatalog();
    let s = defaultKv('switches');
    s = setModuleWeight(s, TAAL_MODULE_ID, 4);
    expect(moduleWeight(s, TAAL_MODULE_ID)).toBe(4);
    s = setModuleWeight(s, TAAL_MODULE_ID, 99);
    expect(moduleWeight(s, TAAL_MODULE_ID)).toBe(5);
    s = setModuleWeight(s, TAAL_MODULE_ID, 0);
    expect(moduleWeight(s, TAAL_MODULE_ID)).toBe(1);

    const kommaItems = catalog.fixedItems(TAAL_MODULE_ID, 'komma');
    const progress: ProgressRecord[] = [
      {
        moduleId: TAAL_MODULE_ID,
        itemId: kommaItems[0]!.id,
        box: 4,
        due: '2026-10-25',
        level: kommaItems[0]!.level,
        topic: 'komma',
        skill: kommaItems[0]!.skill,
        seen: 3,
      },
      {
        moduleId: TAAL_MODULE_ID,
        itemId: kommaItems[1]!.id,
        box: 2,
        due: '2026-10-18',
        level: kommaItems[1]!.level,
        topic: 'komma',
        skill: kommaItems[1]!.skill,
        seen: 1,
      },
    ];
    const counts = topicCounts(s, catalog, TAAL_MODULE_ID, 'komma', progress);
    expect(counts.switchedOn).toBe(kommaItems.length);
    expect(counts.mastered).toBe(1);
  });
});
