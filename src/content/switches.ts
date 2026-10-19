// Content tree switches, levels, topic overrides, presets, weights and item counts (T35, PRD 4.13).
// Pure functions over SwitchesRecord, Catalog and ProgressRecord[].

import type { Item, Level } from './format';
import { isMastered } from '../learning/srs';
import type { ProgressRecord } from '../storage/progress-store';
import type { SwitchesRecord } from '../storage/schema';
import type { Catalog } from './catalog';

export type PresetId = 'groep-6-midden' | 'groep-6-eind' | 'groep-7-midden' | 'groep-7-eind';

export interface PresetDef {
  id: PresetId;
  label: string;
  levels: readonly Level[];
}

export const PRESETS: readonly PresetDef[] = [
  { id: 'groep-6-midden', label: 'Groep 6 midden', levels: ['M6'] },
  { id: 'groep-6-eind', label: 'Groep 6 eind', levels: ['M6', 'E6'] },
  { id: 'groep-7-midden', label: 'Groep 7 midden', levels: ['M6', 'E6', 'M7'] },
  { id: 'groep-7-eind', label: 'Groep 7 eind', levels: ['M6', 'E6', 'M7', 'E7'] },
];

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 5;

export interface ModuleSwitchEntry {
  enabled?: boolean;
  weight?: number;
  levels?: Level[];
  topics?: Record<string, boolean>;
  /** Topic id -> skill -> enabled. */
  skills?: Record<string, Record<string, boolean>>;
  /** Topic id -> custom levels array, or null/undefined when inheriting module levels. */
  topicLevels?: Record<string, Level[] | null>;
}

export interface NodeCounts {
  switchedOn: number;
  mastered: number;
  /** True when the node includes an open Rekenen topic (`optellen` or `aftrekken`) that is switched on. */
  hasOpenSums: boolean;
}

function getSubjectsMap(record: SwitchesRecord): Record<string, boolean> {
  const raw = (record as { subjects?: unknown }).subjects;
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, boolean>;
  }
  return {};
}

function getModuleEntry(record: SwitchesRecord, moduleId: string): ModuleSwitchEntry {
  const raw = record.modules?.[moduleId];
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as ModuleSwitchEntry;
  }
  return {};
}

function cloneSwitches(record: SwitchesRecord): SwitchesRecord {
  const text = JSON.stringify({
    ...record,
    modules: record.modules ?? {},
  });
  return JSON.parse(text) as SwitchesRecord;
}

function withModuleEntry(
  record: SwitchesRecord,
  moduleId: string,
  update: (entry: ModuleSwitchEntry) => ModuleSwitchEntry,
): SwitchesRecord {
  const next = cloneSwitches(record);
  const current = getModuleEntry(next, moduleId);
  next.modules[moduleId] = update(current);
  return next;
}

// ---- on / off state ----

export function isSubjectOn(record: SwitchesRecord, subject: string): boolean {
  const key = subject.toLowerCase();
  return getSubjectsMap(record)[key] !== false;
}

export function setSubjectOn(record: SwitchesRecord, subject: string, on: boolean): SwitchesRecord {
  const next = cloneSwitches(record);
  const subjects = { ...getSubjectsMap(next), [subject.toLowerCase()]: on };
  (next as { subjects?: Record<string, boolean> }).subjects = subjects;
  return next;
}

export function isModuleOwnSwitchOn(record: SwitchesRecord, moduleId: string): boolean {
  return getModuleEntry(record, moduleId).enabled !== false;
}

/** Effective module state: false when its subject is off or the module itself is off (AC78). */
export function isModuleOn(record: SwitchesRecord, catalog: Catalog, moduleId: string): boolean {
  const bundle = catalog.getModule(moduleId);
  if (!bundle) return false;
  if (!isSubjectOn(record, bundle.module.subject)) return false;
  return isModuleOwnSwitchOn(record, moduleId);
}

export function setModuleOn(record: SwitchesRecord, moduleId: string, on: boolean): SwitchesRecord {
  return withModuleEntry(record, moduleId, (e) => ({ ...e, enabled: on }));
}

export function isTopicOwnSwitchOn(record: SwitchesRecord, moduleId: string, topicId: string): boolean {
  return getModuleEntry(record, moduleId).topics?.[topicId] !== false;
}

/** Effective topic state: false when its module is off or the topic itself is off (AC78). */
export function isTopicOn(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
): boolean {
  if (!isModuleOn(record, catalog, moduleId)) return false;
  if (!catalog.getTopic(moduleId, topicId)) return false;
  return isTopicOwnSwitchOn(record, moduleId, topicId);
}

export function setTopicOn(
  record: SwitchesRecord,
  moduleId: string,
  topicId: string,
  on: boolean,
): SwitchesRecord {
  return withModuleEntry(record, moduleId, (e) => ({
    ...e,
    topics: { ...(e.topics ?? {}), [topicId]: on },
  }));
}

export function isSkillOwnSwitchOn(
  record: SwitchesRecord,
  moduleId: string,
  topicId: string,
  skill: string,
): boolean {
  return getModuleEntry(record, moduleId).skills?.[topicId]?.[skill] !== false;
}

/** Effective skill state: false when its topic is off or the skill itself is off (AC78). */
export function isSkillOn(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  skill: string,
): boolean {
  if (!isTopicOn(record, catalog, moduleId, topicId)) return false;
  return isSkillOwnSwitchOn(record, moduleId, topicId, skill);
}

export function setSkillOn(
  record: SwitchesRecord,
  moduleId: string,
  topicId: string,
  skill: string,
  on: boolean,
): SwitchesRecord {
  return withModuleEntry(record, moduleId, (e) => ({
    ...e,
    skills: {
      ...(e.skills ?? {}),
      [topicId]: { ...(e.skills?.[topicId] ?? {}), [skill]: on },
    },
  }));
}

// ---- levels & overrides ----

/** Switched on levels of a module, in the module's teaching order. Default: all module levels. */
export function moduleLevels(record: SwitchesRecord, catalog: Catalog, moduleId: string): Level[] {
  const bundle = catalog.getModule(moduleId);
  if (!bundle) return [];
  const stored = getModuleEntry(record, moduleId).levels;
  if (!Array.isArray(stored)) return [...bundle.module.levels];
  const set = new Set(stored);
  return bundle.module.levels.filter((lv) => set.has(lv));
}

export function setModuleLevels(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  levels: readonly Level[],
): SwitchesRecord {
  const bundle = catalog.getModule(moduleId);
  const valid = bundle ? bundle.module.levels.filter((lv) => levels.includes(lv)) : [...levels];
  return withModuleEntry(record, moduleId, (e) => ({ ...e, levels: valid }));
}

export function toggleModuleLevel(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  level: Level,
  on: boolean,
): SwitchesRecord {
  const current = new Set(moduleLevels(record, catalog, moduleId));
  if (on) current.add(level);
  else current.delete(level);
  return setModuleLevels(record, catalog, moduleId, [...current]);
}

/** Null when the topic inherits its module's levels; otherwise the topic's own levels list. */
export function topicLevelOverride(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
): Level[] | null {
  const bundle = catalog.getModule(moduleId);
  if (!bundle) return null;
  const raw = getModuleEntry(record, moduleId).topicLevels?.[topicId];
  if (!Array.isArray(raw)) return null;
  const set = new Set(raw);
  return bundle.module.levels.filter((lv) => set.has(lv));
}

export function setTopicLevelOverride(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  levels: readonly Level[] | null,
): SwitchesRecord {
  const bundle = catalog.getModule(moduleId);
  const nextVal =
    levels === null
      ? null
      : bundle
        ? bundle.module.levels.filter((lv) => levels.includes(lv))
        : [...levels];
  return withModuleEntry(record, moduleId, (e) => ({
    ...e,
    topicLevels: { ...(e.topicLevels ?? {}), [topicId]: nextVal },
  }));
}

/** Levels active for a topic: its override if set, else the module's levels, in teaching order. */
export function effectiveLevels(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
): Level[] {
  return (
    topicLevelOverride(record, catalog, moduleId, topicId) ??
    moduleLevels(record, catalog, moduleId)
  );
}

// ---- presets (AC79) ----

/**
 * Applies a groep preset to every built in module (Rekenen, Taal and the other folder modules):
 * switches on the preset's levels that the module has and turns higher levels off, clears topic
 * level overrides, and switches the modules and their subjects on. A built in module with none of
 * the preset's levels is left as it is.
 */
export function applyPreset(
  record: SwitchesRecord,
  catalog: Catalog,
  presetId: PresetId,
): SwitchesRecord {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) return cloneSwitches(record);
  let next = cloneSwitches(record);
  for (const bundle of catalog.modules()) {
    const moduleId = bundle.module.id;
    if (!catalog.isBuiltIn(moduleId)) continue;
    const levels = preset.levels.filter((lv) => bundle.module.levels.includes(lv));
    if (levels.length === 0) continue;
    next = setSubjectOn(next, bundle.module.subject.toLowerCase(), true);
    next = withModuleEntry(next, moduleId, (e) => ({
      ...e,
      enabled: true,
      levels,
      topicLevels: {},
    }));
  }
  return next;
}

// ---- Vakverdeling weights ----

export function moduleWeight(record: SwitchesRecord, moduleId: string): number {
  const w = getModuleEntry(record, moduleId).weight;
  if (typeof w !== 'number' || !Number.isFinite(w)) return 1;
  return Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(w)));
}

export function setModuleWeight(
  record: SwitchesRecord,
  moduleId: string,
  weight: number,
): SwitchesRecord {
  const clamped = Number.isFinite(weight)
    ? Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(weight)))
    : 1;
  return withModuleEntry(record, moduleId, (e) => ({ ...e, weight: clamped }));
}

// ---- usable items & counts ----

/** Switched on skills of a topic (empty when the topic or module is off). */
export function switchedOnSkills(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
): string[] {
  if (!isTopicOn(record, catalog, moduleId, topicId)) return [];
  return catalog
    .skillsOfTopic(moduleId, topicId)
    .filter((skill) => isSkillOwnSwitchOn(record, moduleId, topicId, skill));
}

/** Switched on fixed items of a topic at the given levels (or all effective levels of the topic). */
export function switchedOnFixedItems(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  levelsOverride?: readonly Level[],
): Item[] {
  if (!isTopicOn(record, catalog, moduleId, topicId)) return [];
  const levels = levelsOverride ?? effectiveLevels(record, catalog, moduleId, topicId);
  if (levels.length === 0) return [];
  const skills = switchedOnSkills(record, catalog, moduleId, topicId);
  if (skills.length === 0) return [];
  return catalog.fixedItems(moduleId, topicId, { levels, skills });
}

/** True when an item's topic, skill and level are all switched on in `record` (AC48). */
export function isItemSwitchedOn(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  item: Pick<Item, 'skill' | 'level'>,
): boolean {
  if (!isSkillOn(record, catalog, moduleId, topicId, item.skill)) return false;
  const levels = effectiveLevels(record, catalog, moduleId, topicId);
  return levels.includes(item.level);
}

/** True when the topic is switched on and can produce at least one question. */
export function isTopicUsable(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
): boolean {
  if (!isTopicOn(record, catalog, moduleId, topicId)) return false;
  const levels = effectiveLevels(record, catalog, moduleId, topicId);
  if (levels.length === 0) return false;
  const skills = switchedOnSkills(record, catalog, moduleId, topicId);
  if (skills.length === 0) return false;
  if (catalog.isOpenTopic(moduleId, topicId)) return true;
  return switchedOnFixedItems(record, catalog, moduleId, topicId, levels).length > 0;
}

/** True when the module is switched on and has at least one usable topic. */
export function isModuleUsable(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
): boolean {
  const bundle = catalog.getModule(moduleId);
  if (!bundle || !isModuleOn(record, catalog, moduleId)) return false;
  return bundle.topics.some((t) => isTopicUsable(record, catalog, moduleId, t.id));
}

export function hasAnyUsableItems(record: SwitchesRecord, catalog: Catalog): boolean {
  return catalog.modules().some((b) => isModuleUsable(record, catalog, b.module.id));
}

function progressMapFor(
  progress: readonly ProgressRecord[],
  moduleId: string,
): Map<string, ProgressRecord> {
  const map = new Map<string, ProgressRecord>();
  for (const p of progress) {
    if (p.moduleId === moduleId) map.set(p.itemId, p);
  }
  return map;
}

export function skillCounts(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  skill: string,
  progress: readonly ProgressRecord[] = [],
): NodeCounts {
  if (!isSkillOn(record, catalog, moduleId, topicId, skill)) {
    return { switchedOn: 0, mastered: 0, hasOpenSums: false };
  }
  const levels = effectiveLevels(record, catalog, moduleId, topicId);
  if (levels.length === 0) {
    return { switchedOn: 0, mastered: 0, hasOpenSums: false };
  }
  const byItem = progressMapFor(progress, moduleId);
  if (catalog.isOpenTopic(moduleId, topicId)) {
    const levelSet = new Set(levels);
    let savedOn = 0;
    let mastered = 0;
    for (const p of byItem.values()) {
      if (p.topic !== topicId || p.skill !== skill) continue;
      const lv = String(p.level);
      if (!levelSet.has(lv)) continue;
      savedOn++;
      if (isMastered(p.box)) mastered++;
    }
    return { switchedOn: savedOn, mastered, hasOpenSums: true };
  }
  const items = catalog.fixedItems(moduleId, topicId, { levels, skills: [skill] });
  let mastered = 0;
  for (const item of items) {
    const p = byItem.get(item.id);
    if (p && isMastered(p.box)) mastered++;
  }
  return { switchedOn: items.length, mastered, hasOpenSums: false };
}

export function topicCounts(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  progress: readonly ProgressRecord[] = [],
): NodeCounts {
  if (!isTopicOn(record, catalog, moduleId, topicId)) {
    return { switchedOn: 0, mastered: 0, hasOpenSums: false };
  }
  let switchedOn = 0;
  let mastered = 0;
  let hasOpenSums = false;
  for (const skill of catalog.skillsOfTopic(moduleId, topicId)) {
    const c = skillCounts(record, catalog, moduleId, topicId, skill, progress);
    switchedOn += c.switchedOn;
    mastered += c.mastered;
    if (c.hasOpenSums) hasOpenSums = true;
  }
  return { switchedOn, mastered, hasOpenSums };
}

export function moduleCounts(
  record: SwitchesRecord,
  catalog: Catalog,
  moduleId: string,
  progress: readonly ProgressRecord[] = [],
): NodeCounts {
  const bundle = catalog.getModule(moduleId);
  if (!bundle || !isModuleOn(record, catalog, moduleId)) {
    return { switchedOn: 0, mastered: 0, hasOpenSums: false };
  }
  let switchedOn = 0;
  let mastered = 0;
  let hasOpenSums = false;
  for (const topic of bundle.topics) {
    const c = topicCounts(record, catalog, moduleId, topic.id, progress);
    switchedOn += c.switchedOn;
    mastered += c.mastered;
    if (c.hasOpenSums) hasOpenSums = true;
  }
  return { switchedOn, mastered, hasOpenSums };
}

export function subjectCounts(
  record: SwitchesRecord,
  catalog: Catalog,
  subject: string,
  progress: readonly ProgressRecord[] = [],
): NodeCounts {
  if (!isSubjectOn(record, subject)) {
    return { switchedOn: 0, mastered: 0, hasOpenSums: false };
  }
  let switchedOn = 0;
  let mastered = 0;
  let hasOpenSums = false;
  for (const bundle of catalog.modulesBySubject(subject)) {
    const c = moduleCounts(record, catalog, bundle.module.id, progress);
    switchedOn += c.switchedOn;
    mastered += c.mastered;
    if (c.hasOpenSums) hasOpenSums = true;
  }
  return { switchedOn, mastered, hasOpenSums };
}
