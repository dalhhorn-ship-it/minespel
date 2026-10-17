// Picks the questions of a break or an Extra oefenen round (PRD 4.6). Pure: no storage, no clock.
// The caller loads progress, switches and rotation, passes them in and saves what comes back.
import type { Rng } from '../core/rng';
import type { Catalog } from '../content/catalog';
import type { Item } from '../content/format';
import { generateItem, type RekenenLevel } from '../content/rekenen/generator';
import type { RekenenTopicId } from '../content/rekenen/module';
import {
  isUsable,
  topicLevels,
  usableItems,
  usableOpen,
  usableTopics,
  type Switches,
} from '../content/switches';
import type { ProgressRecord } from '../storage/progress-store';
import { newSumExclude } from './generated-items';
import { pickTopic, type RotationState } from './rotation';
import { isItemDue } from './srs';
import type { SessionEntry } from './break-session';

export interface SelectionInput {
  catalog: Catalog;
  switches: Switches;
  moduleId: string;
  /** Number of questions (N). */
  count: number;
  /** All progress records (any module is fine, others are ignored). */
  progress: readonly ProgressRecord[];
  rotation: RotationState;
  /** Today by the clock, "2026-10-18". */
  today: string;
  /** Latest day seen, so a clock set back keeps due items due (AC118). */
  lastSeenDay?: string | null;
  /** Setting "Nieuwe lessen en vragen" (AC47). */
  newAllowed: boolean;
  /** Ids already asked in this break. They are left out (AC41, AC119). */
  asked?: Iterable<string>;
  rng: Rng;
}

export interface SelectionResult {
  /** In the order to ask them (mixed). Accepted by `startSession`. */
  entries: SessionEntry[];
  /** Rotation state after the pick. Save it. */
  rotation: RotationState;
  /** Topic the new items came from, null when no new slot was used. T43 uses it for the lesson. */
  newTopicId: string | null;
  /** Number of new (box 0) entries. */
  newCount: number;
}

type Due = { rec: ProgressRecord; item: Item };

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [a[i], a[j]] = [a[j] as T, a[i] as T];
  }
  return a;
}

const isRekenenTopic = (t: string): t is RekenenTopicId =>
  t === 'optellen' || t === 'aftrekken' || t === 'tafels' || t === 'delen';

/** Fresh sums for an open topic at one level, skills filtered, no excluded ids. */
function newOpenItems(
  topic: string,
  level: string,
  skills: ReadonlySet<string>,
  want: number,
  exclude: Set<string>,
  rng: Rng,
): Item[] {
  if (!isRekenenTopic(topic)) return [];
  const out: Item[] = [];
  for (let tries = 0; out.length < want && tries < want * 200 + 200; tries++) {
    const it = generateItem(topic, level as RekenenLevel, rng);
    if (exclude.has(it.id) || !skills.has(it.skill)) continue;
    exclude.add(it.id);
    out.push(it);
  }
  return out;
}

export function selectQuestions(input: SelectionInput): SelectionResult {
  const { catalog, switches: sw, moduleId, count, progress, rng } = input;
  const mod = catalog.module(moduleId);
  const used = new Set<string>(input.asked ?? []);
  const mine = progress.filter((p) => p.moduleId === moduleId);
  const byId = new Map(mine.map((p) => [p.itemId, p]));
  const numeric = mod?.generated === true;
  const entry = (item: Item, box: number): SessionEntry =>
    numeric && item.type === 'type' ? { item, box, numeric: true } : { item, box };

  // Seen items that may be asked (AC48), with their item rebuilt.
  const seen: Due[] = [];
  for (const rec of mine) {
    if (rec.box <= 0 || used.has(rec.itemId)) continue;
    const item = catalog.item(moduleId, rec.itemId, rec.level);
    if (!item || !isUsable(sw, catalog, moduleId, rec.topic, item.skill, rec.level)) continue;
    seen.push({ rec, item });
  }
  const byOldest = (a: Due, b: Due): number =>
    a.rec.due < b.rec.due ? -1 : a.rec.due > b.rec.due ? 1 : a.rec.itemId < b.rec.itemId ? -1 : 1;
  const dueList = seen
    .filter((d) => isItemDue(d.rec, input.today, input.lastSeenDay))
    .sort((a, b) => {
      const a1 = a.rec.box === 1 ? 0 : 1;
      const b1 = b.rec.box === 1 ? 0 : 1;
      return a1 - b1 || byOldest(a, b);
    });
  const notDue = seen
    .filter((d) => !isItemDue(d.rec, input.today, input.lastSeenDay))
    .sort((a, b) => a.rec.box - b.rec.box || byOldest(a, b));

  const picked: SessionEntry[] = [];
  const take = (list: readonly Due[], max: number): void => {
    for (const d of list) {
      if (picked.length >= max) return;
      if (used.has(d.rec.itemId)) continue;
      used.add(d.rec.itemId);
      picked.push(entry(d.item, d.rec.box));
    }
  };

  // 1. Review slots: up to half of N, rounded up.
  take(dueList, Math.min(count, Math.ceil(count / 2)));

  // 2. New slots from one topic.
  let rotation = input.rotation;
  let newTopicId: string | null = null;
  let newCount = 0;
  if (input.newAllowed && picked.length < count) {
    const newIn = (topic: string): number => {
      if (catalog.isOpen(moduleId, topic)) return usableOpen(sw, catalog, moduleId, topic).length;
      return usableItems(sw, catalog, moduleId, topic).filter((m) => !byId.has(m.id) && !used.has(m.id)).length;
    };
    const topics = catalog.topics(moduleId).map((t) => ({
      id: t.id,
      hasNew: usableTopics(sw, catalog, moduleId).includes(t.id) && newIn(t.id) > 0,
    }));
    const pick = pickTopic(input.rotation, moduleId, topics);
    rotation = pick.state;
    if (pick.topicId !== null) {
      const topic = pick.topicId;
      newTopicId = topic;
      const levels = topicLevels(sw, catalog, moduleId, topic);
      const open = catalog.isOpen(moduleId, topic);
      const exclude = newSumExclude(mine, moduleId, topic, used);
      const stored = open ? [] : usableItems(sw, catalog, moduleId, topic).filter((m) => !byId.has(m.id) && !used.has(m.id));
      for (const level of levels) {
        const want = count - picked.length;
        if (want <= 0) break;
        let items: Item[];
        if (open) {
          const skills = new Set(usableOpen(sw, catalog, moduleId, topic).filter((c) => c.level === level).map((c) => c.skill));
          items = newOpenItems(topic, level, skills, want, exclude, rng);
        } else {
          const ids = shuffle(stored.filter((m) => m.level === level), rng).slice(0, want);
          items = ids.flatMap((m) => {
            const it = catalog.item(moduleId, m.id, level);
            return it ? [it] : [];
          });
        }
        for (const it of items) {
          used.add(it.id);
          picked.push(entry(it, 0));
          newCount++;
        }
      }
    }
  }

  // 3. Fill up with more due items, then the not yet due items with the lowest box.
  take(dueList, count);
  take(notDue, count);

  return { entries: shuffle(picked, rng), rotation, newTopicId, newCount };
}
