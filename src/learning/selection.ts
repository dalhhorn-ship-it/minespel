// Question selection for a learning break or Extra oefenen round (T38, PRD 4.6).
// Pure: takes Catalog, SwitchesRecord, RotationState, ProgressRecord[], Clock day and Rng.
// Returns the chosen SessionEntry list, the topic of any new items (for showing its lesson first),
// and the updated RotationState (with the topic pointer moved past that topic, AC46).

import { isGeneratedModule, type Catalog } from '../content/catalog';
import type { Item } from '../content/format';
import { generateItems } from '../content/rekenen/generator';
import type { RekenenTopicId } from '../content/rekenen/module';
import {
  effectiveLevels,
  isItemSwitchedOn,
  isTopicOn,
  switchedOnFixedItems,
  switchedOnSkills,
} from '../content/switches';
import type { Rng } from '../core/rng';
import type { ProgressRecord } from '../storage/progress-store';
import type { SwitchesRecord } from '../storage/schema';
import type { SessionEntry } from './break-session';
import { savedSumIds } from './generated-items';
import { pickTopic, type RotationState, type TopicCandidate } from './rotation';
import { isItemDue } from './srs';

export interface SelectBreakOptions {
  catalog: Catalog;
  switches: SwitchesRecord;
  rotation: RotationState;
  progress: readonly ProgressRecord[];
  moduleId: string;
  /** Number of questions to pick (N). */
  count: number;
  /** Effective local calendar day, e.g. "2026-10-17". */
  today: string;
  /** Last seen calendar day, for the clock-set-back rule (AC118). */
  lastSeenDay?: string | null;
  /** "Nieuwe lessen en vragen" setting. When false, only seen items are picked (AC47). */
  newLessonsEnabled?: boolean;
  /** Extra item ids to leave out (for example items already asked in the current break). */
  excludeIds?: ReadonlySet<string>;
  /** Mix question order at the end (PRD 4.6 step 5). Default true. */
  shuffleOrder?: boolean;
  rng: Rng;
}

export interface SelectionResult {
  entries: SessionEntry[];
  /** Topic id from which new items were picked, or null when no new items were used. */
  newTopicId: string | null;
  /** Updated rotation state (topic pointer advanced when new items were picked). */
  rotation: RotationState;
}

interface SeenCandidate {
  item: Item;
  box: number;
  due: string;
  topic: string;
}

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

export function selectBreakItems(options: SelectBreakOptions): SelectionResult {
  const {
    catalog,
    switches,
    rotation,
    progress,
    moduleId,
    count,
    today,
    lastSeenDay,
    newLessonsEnabled = true,
    excludeIds = new Set<string>(),
    shuffleOrder = true,
    rng,
  } = options;

  const bundle = catalog.getModule(moduleId);
  if (!bundle || count <= 0) {
    return { entries: [], newTopicId: null, rotation };
  }

  const numeric = isGeneratedModule(bundle);
  const progressByItem = new Map<string, ProgressRecord>();
  for (const p of progress) {
    if (p.moduleId === moduleId) {
      progressByItem.set(p.itemId, p);
    }
  }

  // Gather all seen (box > 0) switched on items for this module.
  const dueItems: SeenCandidate[] = [];
  const notDueItems: SeenCandidate[] = [];

  for (const p of progressByItem.values()) {
    if (p.box <= 0 || excludeIds.has(p.itemId)) continue;
    const item = catalog.getItem(moduleId, p.itemId, String(p.level));
    if (!item) continue;
    const topicId = p.topic || catalog.topicOfItem(moduleId, p.itemId) || '';
    if (!topicId || !isItemSwitchedOn(switches, catalog, moduleId, topicId, item)) continue;

    const candidate: SeenCandidate = { item, box: p.box, due: p.due, topic: topicId };
    if (isItemDue(p, today, lastSeenDay)) {
      dueItems.push(candidate);
    } else {
      notDueItems.push(candidate);
    }
  }

  // PRD 4.6 step 1: Box 1 items first, then other due items, the oldest due date first.
  dueItems.sort((a, b) => {
    const aBox1 = a.box === 1 ? 0 : 1;
    const bBox1 = b.box === 1 ? 0 : 1;
    if (aBox1 !== bBox1) return aBox1 - bBox1;
    const dueCmp = a.due.localeCompare(b.due);
    if (dueCmp !== 0) return dueCmp;
    if (a.box !== b.box) return a.box - b.box;
    return a.item.id.localeCompare(b.item.id);
  });

  // PRD 4.6 step 3 fallback: not yet due items with the lowest box, then oldest due date.
  notDueItems.sort((a, b) => {
    if (a.box !== b.box) return a.box - b.box;
    const dueCmp = a.due.localeCompare(b.due);
    if (dueCmp !== 0) return dueCmp;
    return a.item.id.localeCompare(b.item.id);
  });

  const entries: SessionEntry[] = [];
  const pickedIds = new Set<string>(excludeIds);

  const addEntry = (item: Item, box: number) => {
    if (pickedIds.has(item.id)) return;
    pickedIds.add(item.id);
    entries.push({ item, box, ...(numeric ? { numeric: true } : {}) });
  };

  // Step 1: Review slots — up to half of N rounded up (or all of N if new lessons are off, AC43, AC47).
  const maxReview = newLessonsEnabled ? Math.ceil(count / 2) : count;
  for (const c of dueItems) {
    if (entries.length >= maxReview) break;
    addEntry(c.item, c.box);
  }

  // Step 2: New slots (box 0) from one topic chosen by the module's topic pointer (AC44, AC45, AC46).
  let nextRotation = rotation;
  let newTopicId: string | null = null;
  const newSlotsWanted = count - entries.length;

  if (newLessonsEnabled && newSlotsWanted > 0) {
    const topicCandidates: TopicCandidate[] = bundle.topics.map((topic) => {
      if (!isTopicOn(switches, catalog, moduleId, topic.id)) {
        return { id: topic.id, hasNew: false };
      }
      const levels = effectiveLevels(switches, catalog, moduleId, topic.id);
      const skills = switchedOnSkills(switches, catalog, moduleId, topic.id);
      if (levels.length === 0 || skills.length === 0) {
        return { id: topic.id, hasNew: false };
      }
      if (catalog.isOpenTopic(moduleId, topic.id)) {
        return { id: topic.id, hasNew: true };
      }
      const hasUnseen = switchedOnFixedItems(switches, catalog, moduleId, topic.id, levels).some(
        (item) => (progressByItem.get(item.id)?.box ?? 0) === 0 && !pickedIds.has(item.id),
      );
      return { id: topic.id, hasNew: hasUnseen };
    });

    const pickedTopic = pickTopic(rotation, moduleId, topicCandidates);
    if (pickedTopic.topicId !== null) {
      const topicId = pickedTopic.topicId;
      nextRotation = pickedTopic.state;
      newTopicId = topicId;

      const levels = effectiveLevels(switches, catalog, moduleId, topicId);
      const skills = switchedOnSkills(switches, catalog, moduleId, topicId);

      if (catalog.isOpenTopic(moduleId, topicId)) {
        const easiestLevel = levels[0];
        if (easiestLevel !== undefined) {
          const exclude = new Set<string>([
            ...savedSumIds(progress, topicId),
            ...pickedIds,
          ]);
          const generated = generateItems(
            topicId as RekenenTopicId,
            easiestLevel,
            newSlotsWanted,
            rng,
            { skills, exclude },
          );
          for (const item of generated) {
            if (entries.length >= count) break;
            addEntry(item, 0);
          }
        }
      } else {
        // Fixed topic: easiest switched on level first, in random order within each level (AC45).
        for (const lv of levels) {
          if (entries.length >= count) break;
          const levelNew = switchedOnFixedItems(switches, catalog, moduleId, topicId, [lv]).filter(
            (item) => (progressByItem.get(item.id)?.box ?? 0) === 0 && !pickedIds.has(item.id),
          );
          for (const item of shuffle(levelNew, rng)) {
            if (entries.length >= count) break;
            addEntry(item, 0);
          }
        }
      }
    }
  }

  // Step 3: Fill any remaining slots with more due items, then not yet due items with lowest box.
  if (entries.length < count) {
    for (const c of dueItems) {
      if (entries.length >= count) break;
      addEntry(c.item, c.box);
    }
  }
  if (entries.length < count) {
    for (const c of notDueItems) {
      if (entries.length >= count) break;
      addEntry(c.item, c.box);
    }
  }

  // Step 5: Mix the question order inside the break (PRD 4.6 step 5).
  const finalEntries = shuffleOrder && entries.length > 1 ? shuffle(entries, rng) : entries;

  return {
    entries: finalEntries,
    newTopicId,
    rotation: nextRotation,
  };
}
