// All modules in one place: the built in Rekenen and Taal modules plus the parent's own modules.
// Answers "which topics, levels and skills exist" and "give me item X" (also generated sums).
import type { Item, ModuleBundle, Topic } from './format';
import {
  itemFromId,
  factIds,
  type RekenenLevel,
} from './rekenen/generator';
import {
  REKENEN_GENERATOR,
  REKENEN_LEVELS,
  REKENEN_MODULE_ID,
  REKENEN_SKILLS,
  rekenenBundle,
  type RekenenTopicId,
} from './rekenen/module';

/** Same as TAAL_MODULE_ID in taal.ts. Repeated here so this file does not pull in the Taal chunk. */
export const BUILT_IN_TAAL_ID = 'cito-taalverzorging';
export const BUILT_IN_IDS: readonly string[] = [REKENEN_MODULE_ID, BUILT_IN_TAAL_ID];

/** What the switches and the selection need to know about an item. */
export interface ItemMeta {
  id: string;
  topic: string;
  skill: string;
  level: string;
}

/** One level and skill of a topic. `count` is null for sums that are made on the fly (no end). */
export interface Cell {
  level: string;
  skill: string;
  count: number | null;
}

export interface CatalogModule {
  id: string;
  title: string;
  subject: string;
  builtIn: boolean;
  /** True when the items come from the generator (Rekenen). */
  generated: boolean;
  bundle: ModuleBundle;
}

export interface Catalog {
  modules(): CatalogModule[];
  module(id: string): CatalogModule | undefined;
  topics(moduleId: string): Topic[];
  topic(moduleId: string, topicId: string): Topic | undefined;
  /** Levels of the module, easiest first. */
  levels(moduleId: string): string[];
  /** Skills of a topic in teaching order. */
  skills(moduleId: string, topicId: string): string[];
  /** True when the topic makes endless sums (optellen, aftrekken). */
  isOpen(moduleId: string, topicId: string): boolean;
  /** Every item that can be listed: stored items and the fixed tafels and delen facts. Empty for open topics. */
  items(moduleId: string, topicId: string): ItemMeta[];
  /** Levels and skills of a topic, with item counts. */
  cells(moduleId: string, topicId: string): Cell[];
  /**
   * Finds an item by id. For generated optellen and aftrekken ids pass the saved level
   * (the id does not say it). Null when it does not exist.
   */
  item(moduleId: string, itemId: string, level?: string): Item | null;
}

const isRekenenTopic = (t: string): t is RekenenTopicId => t in REKENEN_SKILLS;
const isRekenenLevel = (l: string): l is RekenenLevel => (REKENEN_LEVELS as readonly string[]).includes(l);

export function createCatalog(bundles: readonly ModuleBundle[]): Catalog {
  const mods = new Map<string, CatalogModule>();
  for (const bundle of bundles) {
    const id = bundle.module.id;
    if (mods.has(id)) continue; // first wins, so a built in module cannot be shadowed
    mods.set(id, {
      id,
      title: bundle.module.title,
      subject: bundle.module.subject,
      builtIn: BUILT_IN_IDS.includes(id),
      generated: bundle.module.generator === REKENEN_GENERATOR,
      bundle,
    });
  }

  const itemCache = new Map<string, ItemMeta[]>();
  const storedIndex = new Map<string, Map<string, Item>>();

  const isOpen = (moduleId: string, topicId: string): boolean =>
    mods.get(moduleId)?.generated === true && (topicId === 'optellen' || topicId === 'aftrekken');

  function storedItems(moduleId: string): Map<string, Item> {
    let index = storedIndex.get(moduleId);
    if (!index) {
      index = new Map();
      for (const t of mods.get(moduleId)?.bundle.topics ?? []) for (const it of t.items) index.set(it.id, it);
      storedIndex.set(moduleId, index);
    }
    return index;
  }

  function items(moduleId: string, topicId: string): ItemMeta[] {
    const key = `${moduleId}/${topicId}`;
    const cached = itemCache.get(key);
    if (cached) return cached;
    const mod = mods.get(moduleId);
    const topic = mod?.bundle.topics.find((t) => t.id === topicId);
    let out: ItemMeta[] = [];
    if (mod && topic) {
      if (mod.generated) {
        if (isRekenenTopic(topicId) && !isOpen(moduleId, topicId)) {
          for (const level of mod.bundle.module.levels) {
            if (!isRekenenLevel(level)) continue;
            for (const id of factIds(topicId, level)) {
              const it = itemFromId(id, level);
              if (it) out.push({ id, topic: topicId, skill: it.skill, level });
            }
          }
        }
      } else {
        out = topic.items.map((it) => ({ id: it.id, topic: topicId, skill: it.skill, level: it.level }));
      }
    }
    itemCache.set(key, out);
    return out;
  }

  function cells(moduleId: string, topicId: string): Cell[] {
    const mod = mods.get(moduleId);
    if (!mod) return [];
    const out: Cell[] = [];
    const add = (level: string, skill: string, count: number | null): void => {
      const found = out.find((c) => c.level === level && c.skill === skill);
      if (!found) out.push({ level, skill, count });
      else if (found.count !== null && count !== null) found.count += count;
    };
    if (isOpen(moduleId, topicId) && isRekenenTopic(topicId)) {
      for (const level of mod.bundle.module.levels) {
        for (const skill of REKENEN_SKILLS[topicId][level] ?? []) add(level, skill, null);
      }
      return out;
    }
    for (const m of items(moduleId, topicId)) add(m.level, m.skill, 1);
    return out;
  }

  return {
    modules: () => [...mods.values()],
    module: (id) => mods.get(id),
    topics: (moduleId) => mods.get(moduleId)?.bundle.topics ?? [],
    topic: (moduleId, topicId) => mods.get(moduleId)?.bundle.topics.find((t) => t.id === topicId),
    levels: (moduleId) => [...(mods.get(moduleId)?.bundle.module.levels ?? [])],
    skills(moduleId, topicId) {
      const seen = new Set<string>();
      for (const c of cells(moduleId, topicId)) seen.add(c.skill);
      return [...seen];
    },
    isOpen,
    items,
    cells,
    item(moduleId, itemId, level) {
      const mod = mods.get(moduleId);
      if (!mod) return null;
      if (mod.generated) return itemFromId(itemId, level);
      return storedItems(moduleId).get(itemId) ?? null;
    },
  };
}

/** The two built in bundles. Taal is loaded lazily so it gets its own chunk. */
export async function loadBuiltInBundles(): Promise<ModuleBundle[]> {
  const { taalBundle } = await import('./taal');
  return [rekenenBundle, taalBundle];
}

/** Built in modules first, then the own modules from storage. */
export async function loadCatalog(own: readonly ModuleBundle[] = []): Promise<Catalog> {
  return createCatalog([...(await loadBuiltInBundles()), ...own]);
}
