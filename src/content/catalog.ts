// All modules (built in Rekenen and Taal, plus parent made own modules), lookups and fixed item pools (T35).
// Pure: takes own modules as an argument and never touches storage directly.

import type { Exam, Item, Level, ModuleBundle, Topic } from './format';
import { factIds, itemFromId } from './rekenen/generator';
import type { RekenenLevel } from './rekenen/generator';
import {
  REKENEN_GENERATOR,
  REKENEN_LEVELS,
  REKENEN_MODULE_ID,
  REKENEN_SKILLS,
  REKENEN_TOPICS,
  rekenenBundle,
  skillsOfTopic as rekenenSkillsOfTopic,
} from './rekenen/module';
import type { RekenenTopicId } from './rekenen/module';
import { folderBundles } from './folder-modules';
import { TAAL_MODULE_ID, taalBundle } from './taal';

export { REKENEN_MODULE_ID, TAAL_MODULE_ID };

const isRekenenTopic = (v: string): v is RekenenTopicId =>
  (REKENEN_TOPICS as readonly string[]).includes(v);

const isRekenenLevel = (v: string): v is RekenenLevel =>
  (REKENEN_LEVELS as readonly string[]).includes(v);

export function isGeneratedModule(bundle: ModuleBundle): boolean {
  return bundle.module.generator === REKENEN_GENERATOR || bundle.module.id === REKENEN_MODULE_ID;
}

export function isOpenRekenenTopic(moduleId: string, topicId: string): boolean {
  return moduleId === REKENEN_MODULE_ID && (topicId === 'optellen' || topicId === 'aftrekken');
}

export function subjectLabel(subject: string): string {
  const clean = subject.trim();
  if (!clean) return 'Overig';
  if (clean.toLowerCase() === 'rekenen') return 'Rekenen';
  if (clean.toLowerCase() === 'taal') return 'Taal';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export interface Catalog {
  /** Every module bundle in display order: Rekenen, Taal, other built in folder modules, then own modules. */
  modules(): readonly ModuleBundle[];
  getModule(moduleId: string): ModuleBundle | undefined;
  isBuiltIn(moduleId: string): boolean;
  /** Unique subject keys (lowercase) in order. */
  subjects(): string[];
  modulesBySubject(subject: string): ModuleBundle[];
  getTopic(moduleId: string, topicId: string): Topic | undefined;
  getExam(moduleId: string, examId: string): Exam | undefined;
  /** All skills of a topic in teaching order. */
  skillsOfTopic(moduleId: string, topicId: string): string[];
  /** Skills of a topic that exist at a given level. */
  skillsOfTopicAtLevel(moduleId: string, topicId: string, level: Level): string[];
  /**
   * Looks up one item by id. For generated Rekenen sums (`optellen` and `aftrekken`),
   * pass the saved `level` from the progress record so the item is rebuilt at its exact level.
   */
  getItem(moduleId: string, itemId: string, level?: Level): Item | null;
  /** Finds which topic an item belongs to, or null when unknown. */
  topicOfItem(moduleId: string, itemId: string): string | null;
  /** True for Rekenen `optellen` and `aftrekken` where new sums are generated on the fly. */
  isOpenTopic(moduleId: string, topicId: string): boolean;
  /**
   * Enumerable items of a topic (all items for JSON topics; fact table items for Rekenen
   * `tafels` and `delen`; empty for open Rekenen topics `optellen` and `aftrekken`).
   */
  fixedItems(
    moduleId: string,
    topicId: string,
    options?: { levels?: readonly Level[]; skills?: readonly string[] },
  ): Item[];
}

export function createCatalog(ownModules: readonly ModuleBundle[] = []): Catalog {
  const builtIn: ModuleBundle[] = [
    rekenenBundle,
    taalBundle,
    ...folderBundles.filter((b) => b.module.id !== TAAL_MODULE_ID),
  ];
  const builtInIds = new Set(builtIn.map((b) => b.module.id));
  const all: ModuleBundle[] = [...builtIn, ...ownModules.filter((m) => !builtInIds.has(m.module.id))];
  const byId = new Map<string, ModuleBundle>(all.map((b) => [b.module.id, b]));

  function getTopic(moduleId: string, topicId: string): Topic | undefined {
    return byId.get(moduleId)?.topics.find((t) => t.id === topicId);
  }

  function skillsOfTopic(moduleId: string, topicId: string): string[] {
    const bundle = byId.get(moduleId);
    if (!bundle) return [];
    if (isGeneratedModule(bundle) && isRekenenTopic(topicId)) {
      return rekenenSkillsOfTopic(topicId);
    }
    const topic = getTopic(moduleId, topicId);
    if (!topic) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of topic.items) {
      if (!seen.has(item.skill)) {
        seen.add(item.skill);
        out.push(item.skill);
      }
    }
    return out;
  }

  function skillsOfTopicAtLevel(moduleId: string, topicId: string, level: Level): string[] {
    const bundle = byId.get(moduleId);
    if (!bundle) return [];
    if (isGeneratedModule(bundle) && isRekenenTopic(topicId)) {
      return [...(REKENEN_SKILLS[topicId][level] ?? [])];
    }
    const topic = getTopic(moduleId, topicId);
    if (!topic) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of topic.items) {
      if (item.level === level && !seen.has(item.skill)) {
        seen.add(item.skill);
        out.push(item.skill);
      }
    }
    return out;
  }

  function getItem(moduleId: string, itemId: string, level?: Level): Item | null {
    const bundle = byId.get(moduleId);
    if (!bundle) return null;
    if (isGeneratedModule(bundle)) {
      return itemFromId(itemId, level);
    }
    for (const topic of bundle.topics) {
      const found = topic.items.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  }

  function topicOfItem(moduleId: string, itemId: string): string | null {
    const bundle = byId.get(moduleId);
    if (!bundle) return null;
    if (isGeneratedModule(bundle)) {
      const prefix = itemId.split(':')[0] ?? '';
      return isRekenenTopic(prefix) && itemFromId(itemId) !== null ? prefix : null;
    }
    for (const topic of bundle.topics) {
      if (topic.items.some((i) => i.id === itemId)) return topic.id;
    }
    return null;
  }

  function fixedItems(
    moduleId: string,
    topicId: string,
    options?: { levels?: readonly Level[]; skills?: readonly string[] },
  ): Item[] {
    const bundle = byId.get(moduleId);
    if (!bundle) return [];
    const levelSet = options?.levels ? new Set(options.levels) : null;
    const skillSet = options?.skills ? new Set(options.skills) : null;

    if (isGeneratedModule(bundle)) {
      if (!isRekenenTopic(topicId) || isOpenRekenenTopic(moduleId, topicId)) return [];
      const levels = (options?.levels ?? bundle.module.levels).filter(isRekenenLevel);
      const out: Item[] = [];
      for (const lv of levels) {
        for (const id of factIds(topicId, lv)) {
          const item = itemFromId(id, lv);
          if (!item) continue;
          if (skillSet && !skillSet.has(item.skill)) continue;
          out.push(item);
        }
      }
      return out;
    }

    const topic = getTopic(moduleId, topicId);
    if (!topic) return [];
    return topic.items.filter(
      (item) => (!levelSet || levelSet.has(item.level)) && (!skillSet || skillSet.has(item.skill)),
    );
  }

  return {
    modules: () => all,
    getModule: (moduleId) => byId.get(moduleId),
    isBuiltIn: (moduleId) => builtInIds.has(moduleId),
    subjects() {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const b of all) {
        const key = b.module.subject.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(key);
        }
      }
      return out;
    },
    modulesBySubject(subject) {
      const key = subject.toLowerCase();
      return all.filter((b) => b.module.subject.toLowerCase() === key);
    },
    getTopic,
    getExam(moduleId, examId) {
      return byId.get(moduleId)?.module.exams.find((e) => e.id === examId);
    },
    skillsOfTopic,
    skillsOfTopicAtLevel,
    getItem,
    topicOfItem,
    isOpenTopic: isOpenRekenenTopic,
    fixedItems,
  };
}
