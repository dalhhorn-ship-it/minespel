// What the parent switched on and off (Inhoud kiezen): modules, topics, skills, levels, topic
// level overrides, presets and Vakverdeling weights. Pure functions on a plain object that is
// saved in the `switches` kv record. Nothing saved means everything is on.
import type { ProgressRecord } from '../storage/progress-store';
import type { SwitchesRecord } from '../storage/schema';
import { BUILT_IN_IDS, type Catalog, type Cell, type ItemMeta } from './catalog';

export interface TopicSwitch {
  /** Missing means on. */
  on?: boolean;
  /** Own levels for this topic. Missing means the module levels. */
  levels?: string[];
  /** Skill to on or off. Missing means on. */
  skills?: Record<string, boolean>;
}
export interface ModuleSwitch {
  on?: boolean;
  /** Missing means every level of the module. */
  levels?: string[];
  topics?: Record<string, TopicSwitch>;
}
export interface Switches {
  modules: Record<string, ModuleSwitch>;
  /** Vakverdeling, 1 to 5. Missing means 1. */
  weights: Record<string, number>;
}

export const MIN_WEIGHT = 1;
export const MAX_WEIGHT = 5;

export const PRESETS = {
  'groep-6-midden': { title: 'Groep 6 midden', levels: ['M6'] },
  'groep-6-eind': { title: 'Groep 6 eind', levels: ['M6', 'E6'] },
  'groep-7-midden': { title: 'Groep 7 midden', levels: ['M6', 'E6', 'M7'] },
  'groep-7-eind': { title: 'Groep 7 eind', levels: ['M6', 'E6', 'M7', 'E7'] },
} as const;
export type PresetId = keyof typeof PRESETS;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

/** Reads a saved record, forgiving about missing or odd fields. */
export function readSwitches(record: SwitchesRecord | null | undefined): Switches {
  const out: Switches = { modules: {}, weights: {} };
  if (!record) return out;
  if (isObj(record.modules)) {
    for (const [id, m] of Object.entries(record.modules)) {
      if (!isObj(m)) continue;
      const ms: ModuleSwitch = {};
      if (typeof m.on === 'boolean') ms.on = m.on;
      const lv = strings(m.levels);
      if (lv) ms.levels = lv;
      if (isObj(m.topics)) {
        ms.topics = {};
        for (const [tid, t] of Object.entries(m.topics)) {
          if (!isObj(t)) continue;
          const ts: TopicSwitch = {};
          if (typeof t.on === 'boolean') ts.on = t.on;
          const tl = strings(t.levels);
          if (tl) ts.levels = tl;
          if (isObj(t.skills)) {
            ts.skills = {};
            for (const [s, v] of Object.entries(t.skills)) if (typeof v === 'boolean') ts.skills[s] = v;
          }
          ms.topics[tid] = ts;
        }
      }
      out.modules[id] = ms;
    }
  }
  if (isObj(record.weights)) {
    for (const [id, w] of Object.entries(record.weights)) if (typeof w === 'number') out.weights[id] = clampWeight(w);
  }
  return out;
}

export function toRecord(sw: Switches): SwitchesRecord {
  return { modules: sw.modules, weights: sw.weights };
}

export const clampWeight = (w: number): number =>
  Number.isFinite(w) ? Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, Math.round(w))) : MIN_WEIGHT;

// ---------- reading ----------

export const weightOf = (sw: Switches, moduleId: string): number => sw.weights[moduleId] ?? MIN_WEIGHT;

export const isModuleOn = (sw: Switches, moduleId: string): boolean => sw.modules[moduleId]?.on !== false;

/** A topic is on when its module and the topic itself are on. */
export const isTopicOn = (sw: Switches, moduleId: string, topicId: string): boolean =>
  isModuleOn(sw, moduleId) && sw.modules[moduleId]?.topics?.[topicId]?.on !== false;

/** A skill is on when its module, topic and the skill itself are on (AC78). */
export const isSkillOn = (sw: Switches, moduleId: string, topicId: string, skill: string): boolean =>
  isTopicOn(sw, moduleId, topicId) && sw.modules[moduleId]?.topics?.[topicId]?.skills?.[skill] !== false;

/** The levels that are on for a module, in module order. */
export function moduleLevels(sw: Switches, catalog: Catalog, moduleId: string): string[] {
  const all = catalog.levels(moduleId);
  const chosen = sw.modules[moduleId]?.levels;
  return chosen ? all.filter((l) => chosen.includes(l)) : all;
}

/** The levels that are on for a topic: its own override, else the module levels. */
export function topicLevels(sw: Switches, catalog: Catalog, moduleId: string, topicId: string): string[] {
  const own = sw.modules[moduleId]?.topics?.[topicId]?.levels;
  if (!own) return moduleLevels(sw, catalog, moduleId);
  return catalog.levels(moduleId).filter((l) => own.includes(l));
}

export function hasTopicLevelOverride(sw: Switches, moduleId: string, topicId: string): boolean {
  return sw.modules[moduleId]?.topics?.[topicId]?.levels !== undefined;
}

/** True when an item with this topic, skill and level may be asked (AC48). */
export function isUsable(
  sw: Switches,
  catalog: Catalog,
  moduleId: string,
  topicId: string,
  skill: string,
  level: string,
): boolean {
  return isSkillOn(sw, moduleId, topicId, skill) && topicLevels(sw, catalog, moduleId, topicId).includes(level);
}

// ---------- changing (each returns a new object) ----------

function edit(sw: Switches, change: (copy: Switches) => void): Switches {
  const copy = structuredClone(sw);
  change(copy);
  return copy;
}
const modOf = (sw: Switches, id: string): ModuleSwitch => (sw.modules[id] ??= {});
const topOf = (sw: Switches, m: string, t: string): TopicSwitch => ((modOf(sw, m).topics ??= {})[t] ??= {});

/** Switching a module on or off also sets everything under it the same way. */
export function setModuleOn(sw: Switches, moduleId: string, on: boolean): Switches {
  return edit(sw, (c) => {
    const m = modOf(c, moduleId);
    m.on = on;
    for (const t of Object.values(m.topics ?? {})) {
      delete t.on;
      delete t.skills;
    }
  });
}

/** Switching a topic on or off also sets all its skills the same way. A topic switched on turns its module on. */
export function setTopicOn(sw: Switches, moduleId: string, topicId: string, on: boolean): Switches {
  return edit(sw, (c) => {
    const t = topOf(c, moduleId, topicId);
    t.on = on;
    delete t.skills;
    if (on) modOf(c, moduleId).on = true;
  });
}

/** A skill switched on turns its topic and module on too, so the tap is never silently ignored. */
export function setSkillOn(sw: Switches, moduleId: string, topicId: string, skill: string, on: boolean): Switches {
  return edit(sw, (c) => {
    const t = topOf(c, moduleId, topicId);
    (t.skills ??= {})[skill] = on;
    if (on) {
      t.on = true;
      modOf(c, moduleId).on = true;
    }
  });
}

export function setModuleLevels(sw: Switches, moduleId: string, levels: readonly string[]): Switches {
  return edit(sw, (c) => {
    modOf(c, moduleId).levels = [...levels];
  });
}

/** Pass null to go back to the module levels. */
export function setTopicLevels(sw: Switches, moduleId: string, topicId: string, levels: readonly string[] | null): Switches {
  return edit(sw, (c) => {
    const t = topOf(c, moduleId, topicId);
    if (levels === null) delete t.levels;
    else t.levels = [...levels];
  });
}

export function setWeight(sw: Switches, moduleId: string, weight: number): Switches {
  return edit(sw, (c) => {
    c.weights[moduleId] = clampWeight(weight);
  });
}

/** A preset sets the levels of both built in modules and drops their topic overrides (AC79). */
export function applyPreset(sw: Switches, preset: PresetId): Switches {
  const levels = PRESETS[preset].levels;
  return edit(sw, (c) => {
    for (const id of BUILT_IN_IDS) {
      const m = modOf(c, id);
      m.levels = [...levels];
      for (const t of Object.values(m.topics ?? {})) delete t.levels;
    }
  });
}

// ---------- what is usable ----------

function usableCells(sw: Switches, catalog: Catalog, moduleId: string, topicId: string): Cell[] {
  return catalog.cells(moduleId, topicId).filter((c) => isUsable(sw, catalog, moduleId, topicId, c.skill, c.level));
}

/** Items that can be asked, for stored items and fixed facts. Open topics (optellen, aftrekken) are not listed, see `usableOpen`. */
export function usableItems(sw: Switches, catalog: Catalog, moduleId: string, topicId?: string): ItemMeta[] {
  const topics = topicId === undefined ? catalog.topics(moduleId).map((t) => t.id) : [topicId];
  return topics.flatMap((t) =>
    catalog.items(moduleId, t).filter((m) => isUsable(sw, catalog, moduleId, t, m.skill, m.level)),
  );
}

/** Levels and skills of an open topic that are on. Make the sums with the generator. */
export function usableOpen(sw: Switches, catalog: Catalog, moduleId: string, topicId: string): Cell[] {
  return catalog.isOpen(moduleId, topicId) ? usableCells(sw, catalog, moduleId, topicId) : [];
}

export function topicHasUsable(sw: Switches, catalog: Catalog, moduleId: string, topicId: string): boolean {
  return usableCells(sw, catalog, moduleId, topicId).some((c) => c.count === null || c.count > 0);
}

/** Topics with something to ask, in teaching order. */
export function usableTopics(sw: Switches, catalog: Catalog, moduleId: string): string[] {
  return catalog.topics(moduleId).map((t) => t.id).filter((t) => topicHasUsable(sw, catalog, moduleId, t));
}

export function moduleHasUsable(sw: Switches, catalog: Catalog, moduleId: string): boolean {
  return usableTopics(sw, catalog, moduleId).length > 0;
}

/** True when nothing is switched on anywhere (AC39, AC129). */
export function nothingOn(sw: Switches, catalog: Catalog): boolean {
  return !catalog.modules().some((m) => moduleHasUsable(sw, catalog, m.id));
}

/** Vakverdeling weights of the modules that have something to ask, for the round robin. */
export function rotationWeights(sw: Switches, catalog: Catalog): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of catalog.modules()) if (moduleHasUsable(sw, catalog, m.id)) out[m.id] = weightOf(sw, m.id);
  return out;
}

// ---------- counts for the tree ----------

export interface Counts {
  /** Items in this part that exist and can be listed. */
  total: number;
  /** Of those, how many are switched on. */
  on: number;
  /** Items at box 4 or 5, switched on or not. */
  beheerst: number;
  /** True when the part has endless sums that are on (optellen, aftrekken), not counted in total or on. */
  open: boolean;
}

export interface CountScope {
  moduleId: string;
  topicId?: string;
  skill?: string;
  level?: string;
}

export const BEHEERST_BOX = 4;

/**
 * The saved level of a progress record as a level name. ProgressRecord types it as a number but
 * item levels are names like "M6". A name is used as is; a number is read as a 0 based position
 * in the module levels. (Open question for the operator, see the T35 report.)
 */
export function levelName(catalog: Catalog, moduleId: string, saved: unknown): string | undefined {
  if (typeof saved === 'string') return saved;
  if (typeof saved === 'number') return catalog.levels(moduleId)[saved];
  return undefined;
}

export function countItems(
  sw: Switches,
  catalog: Catalog,
  progress: readonly ProgressRecord[],
  scope: CountScope,
): Counts {
  const { moduleId, topicId, skill, level } = scope;
  const counts: Counts = { total: 0, on: 0, beheerst: 0, open: false };
  const topics = topicId === undefined ? catalog.topics(moduleId).map((t) => t.id) : [topicId];
  for (const t of topics) {
    for (const c of catalog.cells(moduleId, t)) {
      if ((skill !== undefined && c.skill !== skill) || (level !== undefined && c.level !== level)) continue;
      const usable = isUsable(sw, catalog, moduleId, t, c.skill, c.level);
      if (c.count === null) {
        if (usable) counts.open = true;
        continue;
      }
      counts.total += c.count;
      if (usable) counts.on += c.count;
    }
  }
  const inTopics = new Set(topics);
  for (const p of progress) {
    if (p.moduleId !== moduleId || p.box < BEHEERST_BOX || !inTopics.has(p.topic)) continue;
    const lv = levelName(catalog, moduleId, p.level);
    if ((skill !== undefined && p.skill !== skill) || (level !== undefined && lv !== level)) continue;
    if (catalog.item(moduleId, p.itemId, lv) === null) continue;
    counts.beheerst++;
  }
  return counts;
}
