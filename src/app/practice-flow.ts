// Extra oefenen flow (T46, AC52, AC120):
// Lets the kid pick any switched-on topic to practice for extra coins (up to 10 points/day cap in practice mode),
// or override the countdown timer to start a full learning break immediately.

import '../styles/lesboek.css';
import type { Sound } from '../audio/sound';
import { isGeneratedModule, subjectLabel, type Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import { generateItems } from '../content/rekenen/generator';
import type { RekenenTopicId } from '../content/rekenen/module';
import {
  effectiveLevels,
  isItemSwitchedOn,
  isModuleOn,
  isTopicOn,
  switchedOnFixedItems,
  switchedOnSkills,
} from '../content/switches';
import { effectiveDay, systemClock, today, type Clock } from '../core/clock';
import {
  canAffordEgg,
  MSG_ENOUGH_PRACTICE,
  PRACTICE_DAY_CAP,
  practiceCapReached,
  practiceEarnedToday,
  shopDinoCount,
} from '../core/economy';
import { createRng, type Rng } from '../core/rng';
import type { Response } from '../learning/answer-check';
import {
  reduce,
  startSession,
  type SessionEffect,
  type SessionEntry,
  type SessionEvent,
  type SessionState,
} from '../learning/break-session';
import { savedSumIds, saveProgressWithCap } from '../learning/generated-items';
import { isItemDue } from '../learning/srs';
import type { LogStore } from '../storage/log-store';
import type { ProgressRecord, ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import type { SwitchesRecord } from '../storage/schema';
import { el } from '../ui/dom';
import { createBreakScreen, type BreakScreen, type BreakScreenAction } from '../ui/learn/break-screen';
import { onTap } from '../ui/tap';
import type { ScreenManager } from './screens';

export interface PracticeFlowOptions {
  screens: ScreenManager;
  clock?: Clock;
  rng?: Rng;
  records?: Records;
  progressStore?: ProgressStore;
  logStore?: LogStore;
  getCatalog?: () => Catalog;
  sound?: Pick<Sound, 'play'>;
  /** Optional callback to override the countdown clock and trigger a full break round immediately. */
  onStartBreakRound?: () => Promise<void>;
  now?: () => number;
}

export interface PracticeFlow {
  open(): void;
  startTopic(moduleId: string, topicId: string): Promise<void>;
  destroy(): void;
}

/** Picks up to `count` questions for a specific switched-on topic in Extra oefenen (AC52). */
export function selectPracticeTopicItems(options: {
  catalog: Catalog;
  switches: SwitchesRecord;
  progress: readonly ProgressRecord[];
  moduleId: string;
  topicId: string;
  count: number;
  today: string;
  lastSeenDay?: string | null;
  rng: Rng;
}): SessionEntry[] {
  const {
    catalog,
    switches,
    progress,
    moduleId,
    topicId,
    count,
    today: day,
    lastSeenDay,
    rng,
  } = options;
  const bundle = catalog.getModule(moduleId);
  if (!bundle || count <= 0) return [];
  if (!isTopicOn(switches, catalog, moduleId, topicId)) return [];

  const levels = effectiveLevels(switches, catalog, moduleId, topicId);
  const skills = switchedOnSkills(switches, catalog, moduleId, topicId);
  if (levels.length === 0 || skills.length === 0) return [];

  const numeric = isGeneratedModule(bundle);
  const entries: SessionEntry[] = [];
  const pickedIds = new Set<string>();
  const progressByItem = new Map<string, ProgressRecord>();
  for (const p of progress) {
    if (p.moduleId === moduleId) {
      progressByItem.set(p.itemId, p);
    }
  }

  const addEntry = (item: Item, box: number) => {
    if (pickedIds.has(item.id) || entries.length >= count) return;
    pickedIds.add(item.id);
    entries.push({ item, box, ...(numeric ? { numeric: true } : {}) });
  };

  // 1. Due items in this topic first
  const topicSeen = [...progressByItem.values()].filter(
    (p) => p.box > 0 && (p.topic === topicId || catalog.topicOfItem(moduleId, p.itemId) === topicId),
  );
  for (const p of topicSeen) {
    if (entries.length >= count) break;
    if (!isItemDue(p, day, lastSeenDay)) continue;
    const item = catalog.getItem(moduleId, p.itemId, String(p.level));
    if (item && isItemSwitchedOn(switches, catalog, moduleId, topicId, item)) {
      addEntry(item, p.box);
    }
  }

  // 2. Unseen / generated items in this topic
  if (entries.length < count) {
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
          count - entries.length,
          rng,
          { skills, exclude },
        );
        for (const item of generated) {
          addEntry(item, 0);
        }
      }
    } else {
      const fixed = switchedOnFixedItems(switches, catalog, moduleId, topicId, levels);
      for (const item of fixed) {
        if (entries.length >= count) break;
        const box = progressByItem.get(item.id)?.box ?? 0;
        if (box === 0) addEntry(item, 0);
      }
      // 3. Fill with any remaining seen items in this topic
      for (const item of fixed) {
        if (entries.length >= count) break;
        const box = progressByItem.get(item.id)?.box ?? 0;
        addEntry(item, box);
      }
    }
  }

  return entries;
}

function formatGivenResponse(item: Item, response: Response): string {
  switch (response.type) {
    case 'choice':
      return item.type === 'choice' ? (item.options[response.index] ?? String(response.index)) : String(response.index);
    case 'find-error':
      if (response.index === -1) return 'geen fout';
      return item.type === 'find-error' ? (item.words[response.index] ?? String(response.index)) : String(response.index);
    case 'type':
      return response.text;
    case 'punctuate':
      return response.gaps.join(',');
  }
}

export function createPracticeFlow(options: PracticeFlowOptions): PracticeFlow {
  const clock = options.clock ?? systemClock;
  const rng = options.rng ?? createRng(0x70726163);
  const cleanups: Array<() => void> = [];
  let screenView: BreakScreen | null = null;
  let activeState: SessionState | null = null;
  let activeModuleId = '';
  let activeTopicId = '';
  let activeSessionId = '';
  let shopCount = 0;

  function clearCleanups() {
    while (cleanups.length > 0) {
      cleanups.pop()?.();
    }
  }

  function clearScreen() {
    clearCleanups();
    if (screenView) {
      screenView.destroy();
      screenView = null;
    }
    activeState = null;
  }

  function lessonForItem(moduleId: string, item: Item): Lesson | undefined {
    const catalog = options.getCatalog?.();
    if (!catalog) return undefined;
    const tId = catalog.topicOfItem(moduleId, item.id) || activeTopicId;
    if (!tId) return undefined;
    return catalog.getTopic(moduleId, tId)?.lesson;
  }

  async function processPracticeEffects(state: SessionState, effects: readonly SessionEffect[]) {
    const catalog = options.getCatalog?.();
    const answerCorrectByItem = new Map<string, boolean>();
    for (const ef of effects) {
      if (ef.type === 'answer') {
        answerCorrectByItem.set(ef.itemId, ef.correct);
      }
    }

    for (const ef of effects) {
      if (ef.type === 'answer' && options.logStore) {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        const item = entry?.item ?? catalog?.getItem(activeModuleId, ef.itemId);
        const topic = catalog?.topicOfItem(activeModuleId, ef.itemId) ?? activeTopicId;
        await options.logStore.appendAnswer({
          ts: ef.at,
          day: state.day,
          context: 'practice',
          sessionId: activeSessionId,
          moduleId: activeModuleId,
          topic,
          skill: item?.skill ?? '',
          level: item?.level ?? 'M6',
          itemId: ef.itemId,
          try: ef.try,
          correct: ef.correct,
          given: item ? formatGivenResponse(item, ef.response) : '',
          ms: ef.ms,
        });
      } else if (ef.type === 'box' && options.progressStore) {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        const item = entry?.item ?? catalog?.getItem(activeModuleId, ef.itemId);
        const topic = catalog?.topicOfItem(activeModuleId, ef.itemId) ?? activeTopicId;
        const firstTryRight = answerCorrectByItem.get(ef.itemId) ?? ef.box > 1;
        await saveProgressWithCap(options.progressStore, {
          moduleId: activeModuleId,
          itemId: ef.itemId,
          topic,
          skill: item?.skill ?? '',
          level: item?.level ?? 'M6',
          box: ef.box,
          due: ef.due,
          firstTryRight,
          at: clock.now(),
        });
      } else if (ef.type === 'points' && options.records) {
        await options.records.put('economy', state.economy);
        if (ef.applied !== 0 && options.logStore) {
          await options.logStore.appendLedger({
            ts: clock.now(),
            day: state.day,
            delta: ef.applied,
            reason: 'practice',
          });
        }
      }
    }
  }

  async function dispatchPractice(event: SessionEvent) {
    if (!activeState) return;
    const stepResult = reduce(activeState, event);
    activeState = stepResult.state;
    await processPracticeEffects(activeState, stepResult.effects);
    if (!activeState) return; // Stoppen was tapped while saving; points are saved already.

    if (activeState.phase === 'done') {
      clearScreen();
      options.screens.showWorld();
      return;
    }
    screenView?.render(activeState);
  }

  /** Stoppen (decision 51): points are already saved per step, so just close and go back to the world. */
  function stopSession() {
    clearScreen();
    options.screens.showWorld();
  }

  function handleAction(action: BreakScreenAction) {
    const at = clock.now();
    switch (action.type) {
      case 'lessonDone':
        void dispatchPractice({ type: 'lessonDone', at });
        break;
      case 'answer':
        void dispatchPractice({ type: 'answer', response: action.response, q: action.q, at });
        break;
      case 'next':
        void dispatchPractice({ type: 'next', q: action.q, at });
        break;
      case 'understood':
        void dispatchPractice({ type: 'understood', q: action.q, at });
        break;
      case 'finish':
        void dispatchPractice({ type: 'finish', at });
        break;
    }
  }

  async function startTopic(moduleId: string, topicId: string) {
    clearScreen();
    const catalog = options.getCatalog?.();
    if (!catalog || !options.records || !options.progressStore) {
      options.screens.showWorld();
      return;
    }

    const [settings, switches, economy, dinos, allProgress] = await Promise.all([
      options.records.get('settings'),
      options.records.get('switches'),
      options.records.get('economy'),
      options.records.get('dinos'),
      options.progressStore.list(),
    ]);

    shopCount = shopDinoCount(dinos.dinos ?? [], dinos.eggs ?? []);
    const clockDay = today(clock);
    const lastSeenDay = (settings as { lastSeenDay?: string }).lastSeenDay ?? null;
    const effDay = effectiveDay(clockDay, lastSeenDay);
    const count = Math.max(1, settings.questionsPerBreak || 5);

    const entries = selectPracticeTopicItems({
      catalog,
      switches,
      progress: allProgress,
      moduleId,
      topicId,
      count,
      today: effDay,
      lastSeenDay: effDay,
      rng,
    });

    const now = clock.now();
    const started = startSession({
      mode: 'practice',
      entries,
      economy,
      day: effDay,
      lessonFirst: false,
      at: now,
    });

    activeModuleId = moduleId;
    activeTopicId = topicId;
    activeSessionId = `practice-${now}-${Math.floor(rng.next() * 1_000_000)}`;
    activeState = started.state;

    // If the daily practice cap was already reached before starting, keep the cap message visible
    if (practiceCapReached(economy, effDay)) {
      activeState = {
        ...activeState,
        message: MSG_ENOUGH_PRACTICE,
      };
    }

    const topicLesson = catalog.getTopic(moduleId, topicId)?.lesson;
    screenView = createBreakScreen({
      state: activeState,
      lesson: topicLesson,
      lessonForItem: (item) => lessonForItem(moduleId, item),
      canAffordEgg: (pts) => canAffordEgg(pts, shopCount),
      sound: options.sound,
      onAction: handleAction,
      onStop: stopSession,
      now: options.now ?? (() => clock.now()),
    });
    options.screens.showLearn(screenView.element);
  }

  async function renderPicker() {
    clearScreen();
    const catalog = options.getCatalog?.();
    const [settings, switches, economy] = options.records
      ? await Promise.all([
          options.records.get('settings'),
          options.records.get('switches'),
          options.records.get('economy'),
        ])
      : [null, { modules: {} } as SwitchesRecord, { points: 0, practicePointsToday: 0, practiceDay: '' }];

    const clockDay = today(clock);
    const lastSeenDay = (settings as { lastSeenDay?: string } | null)?.lastSeenDay ?? null;
    const effDay = effectiveDay(clockDay, lastSeenDay);
    const earnedToday = practiceEarnedToday(economy, effDay);
    const capHit = practiceCapReached(economy, effDay);

    const closeBtn = el('button', {
      class: 'pause-btn pause-btn-primary',
      text: 'Terug naar de wereld',
      attrs: { type: 'button' },
    });
    cleanups.push(
      onTap(
        closeBtn,
        () => {
          clearScreen();
          options.screens.showWorld();
        },
        { now: options.now },
      ),
    );

    const header = el('div', { class: 'lesboek-header pause-header' }, [
      el('h2', { class: 'lesboek-title pause-title', text: 'Extra oefenen' }),
      el('div', { class: 'lesboek-badges' }, [
        el('span', {
          class: 'lesboek-pill',
          text: `\u{1FA99} ${economy.points} ${economy.points === 1 ? 'punt' : 'punten'}`,
        }),
        el('span', {
          class: 'lesboek-pill',
          text: `Vandaag: ${earnedToday} / ${PRACTICE_DAY_CAP} extra`,
        }),
      ]),
      closeBtn,
    ]);

    const bodyChildren: HTMLElement[] = [header];

    if (capHit) {
      bodyChildren.push(
        el('p', {
          class: 'lesboek-cap-banner',
          text: MSG_ENOUGH_PRACTICE,
          attrs: { 'data-testid': 'practice-cap-banner' },
        }),
      );
    } else {
      bodyChildren.push(
        el('p', {
          text: 'Kies een onderwerp om extra vragen te oefenen en munten te verdienen!',
        }),
      );
    }

    if (options.onStartBreakRound) {
      const breakBtn = el(
        'button',
        {
          class: 'lesboek-override-btn',
          attrs: { type: 'button', 'data-testid': 'practice-start-break-now' },
        },
        [
          el('span', { text: '\u{1FA99} Start nu een volledige leerpauze' }),
          el('span', { text: 'Start \u{27A1}' }),
        ],
      );
      cleanups.push(
        onTap(
          breakBtn,
          () => {
            clearScreen();
            void options.onStartBreakRound?.();
          },
          { now: options.now },
        ),
      );
      bodyChildren.push(breakBtn);
    }

    const grid = el('div', { class: 'lesboek-topics-grid pause-actions' });
    let count = 0;

    if (catalog) {
      for (const bundle of catalog.modules()) {
        if (!isModuleOn(switches, catalog, bundle.module.id)) continue;
        for (const topic of bundle.topics) {
          if (!isTopicOn(switches, catalog, bundle.module.id, topic.id)) continue;
          count++;
          const btn = el(
            'button',
            {
              class: 'lesboek-topic-btn pause-btn',
              attrs: {
                type: 'button',
                'data-practice-topic': `${bundle.module.id}:${topic.id}`,
              },
            },
            [
              el('span', {
                class: 'lesboek-topic-subject',
                text: subjectLabel(bundle.module.subject),
              }),
              el('span', {
                class: 'lesboek-topic-name',
                text: topic.title,
              }),
            ],
          );
          cleanups.push(
            onTap(
              btn,
              () => {
                void startTopic(bundle.module.id, topic.id);
              },
              { now: options.now },
            ),
          );
          grid.append(btn);
        }
      }
    }

    if (count === 0) {
      grid.append(
        el('p', {
          class: 'lesboek-empty',
          text: 'Kies een onderwerp om extra punten te verdienen.',
        }),
      );
    }

    bodyChildren.push(grid);

    const card = el(
      'div',
      {
        class: 'lesboek-card pause-card',
        attrs: { role: 'dialog', 'aria-label': 'Extra oefenen' },
      },
      bodyChildren,
    );
    const backdrop = el('div', { class: 'lesboek-backdrop pause-backdrop' }, [card]);
    options.screens.showKidOverlay(backdrop);
  }

  return {
    open() {
      void renderPicker();
    },
    startTopic,
    destroy() {
      clearScreen();
    },
  };
}
