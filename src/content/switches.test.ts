import { beforeAll, describe, expect, it } from 'vitest';
import { loadCatalog, type Catalog } from './catalog';
import { REKENEN_MODULE_ID } from './rekenen/module';
import { TAAL_MODULE_ID } from './taal';
import type { ProgressRecord } from '../storage/progress-store';
import {
  applyPreset, countItems, isSkillOn, isTopicOn, moduleLevels, nothingOn, readSwitches, rotationWeights,
  setModuleLevels, setModuleOn, setSkillOn, setTopicLevels, setTopicOn, setWeight, toRecord, topicLevels,
  usableItems, usableOpen, usableTopics, weightOf, hasTopicLevelOverride, isUsable,
} from './switches';

let cat: Catalog;
beforeAll(async () => {
  cat = await loadCatalog();
});
const R = REKENEN_MODULE_ID;
const fresh = () => readSwitches(undefined);

describe('switches', () => {
  it('has everything on by default and reads odd records', () => {
    const sw = fresh();
    expect(isSkillOn(sw, R, 'tafels', 'tafel-7')).toBe(true);
    expect(moduleLevels(sw, cat, R)).toEqual(['M6', 'E6', 'M7', 'E7']);
    expect(weightOf(sw, R)).toBe(1);
    const odd = readSwitches({ modules: { [R]: { on: 'no', topics: { tafels: 5 } } }, weights: { [R]: 99 } });
    expect(isTopicOn(odd, R, 'tafels')).toBe(true);
    expect(weightOf(odd, R)).toBe(5);
    expect(readSwitches({ modules: 3 as never })).toEqual(fresh());
  });

  it('round trips through the record', () => {
    const sw = setWeight(setTopicOn(fresh(), R, 'tafels', false), TAAL_MODULE_ID, 2);
    expect(readSwitches(toRecord(sw))).toEqual(sw);
    expect(fresh()).toEqual({ modules: {}, weights: {} });
  });

  it('switching a topic off switches its skills off, and on brings them back (AC78)', () => {
    let sw = setSkillOn(fresh(), R, 'tafels', 'tafel-1', false);
    expect(isSkillOn(sw, R, 'tafels', 'tafel-1')).toBe(false);
    sw = setTopicOn(sw, R, 'tafels', false);
    expect(isSkillOn(sw, R, 'tafels', 'tafel-7')).toBe(false);
    sw = setTopicOn(sw, R, 'tafels', true);
    expect(isSkillOn(sw, R, 'tafels', 'tafel-1')).toBe(true);
    const off = setModuleOn(fresh(), R, false);
    expect(isTopicOn(off, R, 'delen')).toBe(false);
    expect(setSkillOn(off, R, 'delen', 'deel-5', true)).not.toBe(off);
    expect(isSkillOn(setSkillOn(off, R, 'delen', 'deel-5', true), R, 'delen', 'deel-5')).toBe(true);
  });

  it('does not change the object it is given', () => {
    const sw = fresh();
    setModuleOn(sw, R, false);
    expect(sw).toEqual(fresh());
  });

  it('counts a topic count update when switched off (AC78)', () => {
    const sw = fresh();
    const before = countItems(sw, cat, [], { moduleId: R, topicId: 'tafels' });
    expect(before.on).toBe(before.total);
    expect(before.total).toBeGreaterThan(0);
    const after = countItems(setTopicOn(sw, R, 'tafels', false), cat, [], { moduleId: R, topicId: 'tafels' });
    expect(after).toMatchObject({ total: before.total, on: 0 });
  });

  it('counts per skill and level', () => {
    const c = countItems(fresh(), cat, [], { moduleId: R, topicId: 'tafels', skill: 'tafel-7' });
    expect(c).toEqual({ total: 10, on: 10, beheerst: 0, open: false });
    const m6 = countItems(fresh(), cat, [], { moduleId: R, topicId: 'tafels', level: 'M6' });
    expect(m6.total).toBe(60);
  });

  it('level switches limit usable items (AC48)', () => {
    const sw = setModuleLevels(fresh(), R, ['M6']);
    const items = usableItems(sw, cat, R, 'tafels');
    expect(items.length).toBe(60);
    expect(items.every((m) => m.level === 'M6')).toBe(true);
    expect(isUsable(sw, cat, R, 'tafels', 'tafel-7', 'E6')).toBe(false);
    const off = setSkillOn(sw, R, 'tafels', 'tafel-1', false);
    expect(usableItems(off, cat, R, 'tafels').some((m) => m.skill === 'tafel-1')).toBe(false);
  });

  it('topic level override wins over module levels', () => {
    let sw = setModuleLevels(fresh(), R, ['M6']);
    sw = setTopicLevels(sw, R, 'delen', ['E6']);
    expect(hasTopicLevelOverride(sw, R, 'delen')).toBe(true);
    expect(topicLevels(sw, cat, R, 'delen')).toEqual(['E6']);
    expect(topicLevels(sw, cat, R, 'tafels')).toEqual(['M6']);
    expect(usableItems(sw, cat, R, 'delen').every((m) => m.level === 'E6')).toBe(true);
    sw = setTopicLevels(sw, R, 'delen', null);
    expect(topicLevels(sw, cat, R, 'delen')).toEqual(['M6']);
  });

  it('open topics list usable cells for the generator', () => {
    const sw = setModuleLevels(fresh(), R, ['E6', 'E7']);
    expect(usableOpen(sw, cat, R, 'optellen').map((c) => c.level)).toEqual(['E6', 'E7']);
    expect(usableOpen(sw, cat, R, 'tafels')).toEqual([]);
    expect(usableTopics(sw, cat, R)).toEqual(['optellen', 'aftrekken', 'tafels', 'delen']);
  });

  it('preset Groep 7 midden: M6, E6, M7 on, E7 off, for both built in modules (AC79)', () => {
    const sw = applyPreset(setTopicLevels(fresh(), R, 'tafels', ['E7']), 'groep-7-midden');
    for (const id of [R, TAAL_MODULE_ID]) expect(moduleLevels(sw, cat, id)).toEqual(['M6', 'E6', 'M7']);
    expect(hasTopicLevelOverride(sw, R, 'tafels')).toBe(false);
    expect(moduleLevels(applyPreset(fresh(), 'groep-6-midden'), cat, R)).toEqual(['M6']);
    expect(moduleLevels(applyPreset(fresh(), 'groep-6-eind'), cat, R)).toEqual(['M6', 'E6']);
    expect(moduleLevels(applyPreset(fresh(), 'groep-7-eind'), cat, R)).toHaveLength(4);
  });

  it('Taal items follow skill and level switches', () => {
    const topic = cat.topics(TAAL_MODULE_ID)[0];
    expect(topic).toBeDefined();
    const all = usableItems(fresh(), cat, TAAL_MODULE_ID, topic?.id).length;
    expect(all).toBe(topic?.items.length);
    const some = usableItems(setModuleLevels(fresh(), TAAL_MODULE_ID, ['M6']), cat, TAAL_MODULE_ID, topic?.id);
    expect(some.length).toBeLessThan(all);
    expect(some.every((m) => m.level === 'M6')).toBe(true);
  });

  it('nothing on and rotation weights', () => {
    let sw = setWeight(fresh(), TAAL_MODULE_ID, 3);
    expect(rotationWeights(sw, cat)).toEqual({ [R]: 1, [TAAL_MODULE_ID]: 3 });
    sw = setModuleOn(sw, R, false);
    expect(rotationWeights(sw, cat)).toEqual({ [TAAL_MODULE_ID]: 3 });
    expect(nothingOn(sw, cat)).toBe(false);
    sw = setModuleOn(sw, TAAL_MODULE_ID, false);
    expect(nothingOn(sw, cat)).toBe(true);
    expect(rotationWeights(sw, cat)).toEqual({});
    expect(nothingOn(setModuleLevels(fresh(), R, []), cat)).toBe(false); // Taal still on
    expect(nothingOn(setModuleLevels(setModuleLevels(fresh(), R, []), TAAL_MODULE_ID, []), cat)).toBe(true);
    expect(weightOf(setWeight(fresh(), R, 0), R)).toBe(1);
    expect(weightOf(setWeight(fresh(), R, 9), R)).toBe(5);
  });

  it('counts beheerst items from progress, also with generated ids and the saved level', () => {
    const rec = (itemId: string, box: number, topic: string, skill: string, level: unknown): ProgressRecord =>
      ({ moduleId: R, itemId, box, due: '2026-10-18', level, topic, skill, seen: 1 }) as ProgressRecord;
    const progress = [
      rec('tafels:7x8', 4, 'tafels', 'tafel-7', 'E6'),
      rec('tafels:7x9', 3, 'tafels', 'tafel-7', 'E6'),
      rec('optellen:470+380', 5, 'optellen', 'plus', 'E6'),
      rec('optellen:470+380', 5, 'optellen', 'plus', 'M6'), // not a valid sum at M6
      rec('tafels:99x99', 5, 'tafels', 'tafel-9', 'E6'), // not an item
    ];
    expect(countItems(fresh(), cat, progress, { moduleId: R }).beheerst).toBe(2);
    expect(countItems(fresh(), cat, progress, { moduleId: R, topicId: 'tafels' }).beheerst).toBe(1);
    expect(countItems(fresh(), cat, progress, { moduleId: R, topicId: 'optellen' })).toMatchObject({ beheerst: 1, open: true, total: 0 });
    // switched off topics still show what is beheerst
    const off = setTopicOn(fresh(), R, 'tafels', false);
    expect(countItems(off, cat, progress, { moduleId: R, topicId: 'tafels' })).toMatchObject({ on: 0, beheerst: 1 });
    // numeric saved level is read as a position in the module levels
    const num = [rec('tafels:7x8', 4, 'tafels', 'tafel-7', 1)];
    expect(countItems(fresh(), cat, num, { moduleId: R, topicId: 'tafels', level: 'E6' }).beheerst).toBe(1);
  });
});
