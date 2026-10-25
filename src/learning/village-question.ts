// A villager question (v11 Dorp, PRD 12, AC182 to AC185). Pure: no storage, no clock, no screen.
// It is not a break: it never moves the break turn order or the new topic pointer, never gives or takes
// points, and writes no break record. Only the first try moves the learning box (PRD 4.6).
import type { Catalog } from '../content/catalog';
import { isModuleOn, moduleWeight } from '../content/switches';
import type { Rng } from '../core/rng';
import type { ProgressRecord } from '../storage/progress-store';
import type { RotationRecord, SwitchesRecord } from '../storage/schema';
import { checkAnswer, type Response } from './answer-check';
import type { SessionEntry } from './break-session';
import { pickModuleForVillager, type ModuleCandidate } from './rotation';
import { selectBreakItems } from './selection';

/** No bubble for this many milliseconds of play time after a card opened (AC186). */
export const COOLDOWN_MS = 3 * 60_000;
/** No bubble when the play timer has this much or less left (AC182). */
export const QUIET_BEFORE_BREAK_MS = 30_000;
/** How many of the villager's rare block one right answer gives (decision 106). */
export const REWARD_COUNT = 2;
/** How many seen items one pick looks at before choosing one at random. */
const POOL = 5;

export interface VillageQuestion {
  moduleId: string;
  topic: string;
  entry: SessionEntry;
}

export interface PickVillageQuestionOptions {
  catalog: Catalog;
  switches: SwitchesRecord;
  /** Read only. It comes back unchanged to the caller, who must not save it. */
  rotation: RotationRecord;
  progress: readonly ProgressRecord[];
  today: string;
  lastSeenDay?: string | null;
  rng: Rng;
}

/**
 * One seen item (box 1 to 5) from switched on content. The module follows the Vakverdeling weights.
 * Null when no switched on module has a seen item: the villager then only says "Hoi!" (AC182).
 */
export function pickVillageQuestion(options: PickVillageQuestionOptions): VillageQuestion | null {
  const { catalog, switches, rotation, progress, today, lastSeenDay, rng } = options;
  const pools = new Map<string, SessionEntry[]>();
  const candidates: ModuleCandidate[] = [];
  for (const bundle of catalog.modules()) {
    const id = bundle.module.id;
    if (!isModuleOn(switches, catalog, id)) continue;
    const { entries } = selectBreakItems({
      catalog,
      switches,
      rotation,
      progress,
      moduleId: id,
      count: POOL,
      today,
      lastSeenDay,
      seenOnly: true,
      rng,
    });
    if (entries.length === 0) continue;
    pools.set(id, entries);
    candidates.push({ id, weight: moduleWeight(switches, id), usable: true });
  }
  const moduleId = pickModuleForVillager(candidates, rng);
  if (moduleId === null) return null;
  const pool = pools.get(moduleId) ?? [];
  const entry = pool[rng.int(0, pool.length - 1)];
  if (!entry) return null;
  const topic = catalog.topicOfItem(moduleId, entry.item.id) ?? '';
  return { moduleId, topic, entry };
}

// ---- the card ----

export type VillagePhase = 'question' | 'right' | 'wrong' | 'closed';
export type Celebration = 'dance' | 'respect';

export interface VillageCardState {
  phase: VillagePhase;
  /** 1 on the first try, 2 on the retry. */
  try: 1 | 2;
  firstTryRight: boolean | null;
  question: VillageQuestion;
  /** The rare block of this villager. */
  gives: number;
  /** True when the block was found before: "Nog 2 [naam] erbij!" instead of "Je hebt [naam] gevonden!". */
  alreadyFound: boolean;
  /** Set on a right answer: the villager dances, or shouts "Respect bruuuuu!". */
  celebration: Celebration | null;
}

export type VillageEvent =
  | { type: 'answer'; response: Response; ms: number; at: number; roll: number }
  /** Verder, after a right answer or after "Zo zit het:". */
  | { type: 'verder' }
  /** "Laat maar": close without a block. A first try already given still counts. */
  | { type: 'laatMaar' }
  /** "In mijn hotbar" after a right answer. */
  | { type: 'hotbar' };

export type VillageEffect =
  | { type: 'answer'; try: 1 | 2; correct: boolean; response: Response; ms: number; at: number }
  /** Only from the first try: right moves the box up, wrong puts it in box 1 (PRD 4.6). */
  | { type: 'box'; firstTryRight: boolean }
  /** A right answer: the block is found (if it was not yet) and its stock goes up by `count` (decision 106). */
  | { type: 'reward'; block: number; count: number }
  | { type: 'dance' }
  | { type: 'hotbar'; block: number };

export function startVillageCard(question: VillageQuestion, gives: number, found: readonly number[]): VillageCardState {
  return {
    phase: 'question',
    try: 1,
    firstTryRight: null,
    question,
    gives,
    alreadyFound: found.includes(gives),
    celebration: null,
  };
}

export function reduceVillage(
  state: VillageCardState,
  event: VillageEvent,
): { state: VillageCardState; effects: VillageEffect[] } {
  const none = { state, effects: [] as VillageEffect[] };
  if (state.phase === 'closed') return none;

  switch (event.type) {
    case 'answer': {
      // A double tap or a late answer after the card moved on does nothing.
      if (state.phase !== 'question') return none;
      const entry = state.question.entry;
      const correct = checkAnswer(entry.item, event.response, entry.numeric === true);
      const effects: VillageEffect[] = [
        { type: 'answer', try: state.try, correct, response: event.response, ms: event.ms, at: event.at },
      ];
      const firstTryRight = state.try === 1 ? correct : state.firstTryRight;
      if (state.try === 1) effects.push({ type: 'box', firstTryRight: correct });
      if (correct) {
        const celebration: Celebration = event.roll < 0.5 ? 'dance' : 'respect';
        if (celebration === 'dance') effects.push({ type: 'dance' });
        effects.push({ type: 'reward', block: state.gives, count: REWARD_COUNT });
        return { state: { ...state, phase: 'right', firstTryRight, celebration }, effects };
      }
      if (state.try === 1) return { state: { ...state, try: 2, firstTryRight }, effects };
      return { state: { ...state, phase: 'wrong', firstTryRight }, effects };
    }
    case 'hotbar': {
      if (state.phase !== 'right') return none;
      return {
        state: { ...state, phase: 'closed' },
        effects: [{ type: 'hotbar', block: state.gives }],
      };
    }
    case 'verder': {
      if (state.phase !== 'right' && state.phase !== 'wrong') return none;
      return { state: { ...state, phase: 'closed' }, effects: [] };
    }
    case 'laatMaar':
      return { state: { ...state, phase: 'closed' }, effects: [] };
  }
}
