// Break flow orchestrator (T43, AC26..AC39, AC43..AC48, AC95).
// Rotates modules, picks items, shows the lesson first time, runs the break screen,
// writes every step to sessionStore (AC37), updates SRS boxes, economy, answers, breaks and ledger logs,
// and resets the play timer on completion.

import type { Sound } from '../audio/sound';
import type { Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import { isModuleOn, isModuleUsable, moduleWeight } from '../content/switches';
import { effectiveDay, today, type Clock } from '../core/clock';
import { canAffordEgg, shopDinoCount } from '../core/economy';
import type { Rng } from '../core/rng';
import { registerHook } from '../dev/e2e-hooks';
import type { Response } from '../learning/answer-check';
import {
  EMPTY_BREAK_MS,
  reduce,
  startSession,
  type SessionEffect,
  type SessionEntry,
  type SessionEvent,
  type SessionState,
} from '../learning/break-session';
import { saveProgressWithCap } from '../learning/generated-items';
import {
  hasSeenLesson,
  markLessonSeen,
  pickModule,
  type ModuleCandidate,
  type RotationState,
} from '../learning/rotation';
import { selectBreakItems } from '../learning/selection';
import type { LogStore } from '../storage/log-store';
import type { ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import type { SessionState as StoredSessionRecord, SessionStore } from '../storage/session-store';
import { createBreakScreen, type BreakScreen, type BreakScreenAction } from '../ui/learn/break-screen';
import type { ScreenManager } from './screens';

export interface PersistedBreakSession extends StoredSessionRecord {
  kind: 'break';
  sessionId: string;
  moduleId: string;
  newTopicId: string | null;
  startedAt: number;
  firstAnswerMs: number[];
  session: SessionState;
}

export function isPersistedBreakSession(value: unknown): value is PersistedBreakSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<PersistedBreakSession>;
  return (
    v.kind === 'break' &&
    typeof v.sessionId === 'string' &&
    typeof v.moduleId === 'string' &&
    typeof v.startedAt === 'number' &&
    Array.isArray(v.firstAnswerMs) &&
    typeof v.session === 'object' &&
    v.session !== null
  );
}

export interface BreakFlowOptions {
  clock: Clock;
  rng: Rng;
  screens: ScreenManager;
  records: Records;
  progressStore: ProgressStore;
  logStore: LogStore;
  sessionStore: SessionStore;
  getCatalog: () => Catalog;
  sound?: Pick<Sound, 'play'>;
  onBreakFinished?: () => void;
  win?: Window;
}

export interface BreakFlow {
  /**
   * Start a break. `early: true` is a break the kid started with Nu oefenen: its plus points share
   * the Extra oefenen day limit and there is no malus. A break from the countdown is never early.
   */
  startBreak(opts?: { early?: boolean }): Promise<void>;
  resumeBreak(saved: PersistedBreakSession): Promise<void>;
  endBreakByParent(): Promise<void>;
  isActive(): boolean;
  currentState(): SessionState | null;
  /** Advance an empty break when `clock.now() >= emptyUntil`. */
  tickEmptyBreak(): Promise<void>;
  destroy(): void;
}

function formatGivenResponse(item: Item, response: Response): string {
  switch (response.type) {
    case 'choice':
      if (item.type === 'choice') {
        return item.options[response.index] ?? String(response.index);
      }
      return String(response.index);
    case 'find-error':
      if (response.index === -1) return 'geen fout';
      if (item.type === 'find-error') {
        return item.words[response.index] ?? String(response.index);
      }
      return String(response.index);
    case 'type':
      return response.text;
    case 'punctuate':
      return response.gaps.join(',');
  }
}

export function createBreakFlow(options: BreakFlowOptions): BreakFlow {
  const win = options.win ?? (typeof window !== 'undefined' ? window : undefined);
  let active: PersistedBreakSession | null = null;
  let screenView: BreakScreen | null = null;
  let emptyTimerId: number | null = null;
  let shopCount = 0;
  let processingQueue: Promise<void> = Promise.resolve();

  function clearEmptyTimer() {
    if (emptyTimerId !== null && win) {
      win.clearTimeout(emptyTimerId);
      emptyTimerId = null;
    }
  }

  function scheduleEmptyTimer(state: SessionState) {
    clearEmptyTimer();
    if (state.phase === 'empty' && state.emptyUntil !== null && win) {
      const wait = Math.max(50, state.emptyUntil - options.clock.now());
      emptyTimerId = win.setTimeout(() => {
        void flow.tickEmptyBreak();
      }, wait);
    }
  }

  function lessonFor(moduleId: string, topicId: string | null): Lesson | undefined {
    if (!moduleId || !topicId) return undefined;
    return options.getCatalog().getTopic(moduleId, topicId)?.lesson;
  }

  function lessonForItem(moduleId: string, item: Item): Lesson | undefined {
    const catalog = options.getCatalog();
    const topicId = catalog.topicOfItem(moduleId, item.id);
    if (!topicId) return undefined;
    return catalog.getTopic(moduleId, topicId)?.lesson;
  }

  async function processEffects(
    persisted: PersistedBreakSession,
    effects: readonly SessionEffect[],
  ): Promise<boolean> {
    const catalog = options.getCatalog();
    const { moduleId, sessionId } = persisted;
    const state = persisted.session;
    let ended = false;

    // Map first-try answers in this step so box updates know whether firstTryRight was true.
    const answerCorrectByItem = new Map<string, boolean>();
    for (const ef of effects) {
      if (ef.type === 'answer') {
        answerCorrectByItem.set(ef.itemId, ef.correct);
      }
    }

    for (const ef of effects) {
      if (ef.type === 'answer') {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        const item = entry?.item ?? catalog.getItem(moduleId, ef.itemId);
        const topic = catalog.topicOfItem(moduleId, ef.itemId) ?? '';
        if (ef.try === 1) {
          persisted.firstAnswerMs.push(ef.ms);
        }
        await options.logStore.appendAnswer({
          ts: ef.at,
          day: state.day,
          context: 'break',
          sessionId,
          moduleId,
          topic,
          skill: item?.skill ?? '',
          level: item?.level ?? 'M6',
          itemId: ef.itemId,
          try: ef.try,
          correct: ef.correct,
          given: item ? formatGivenResponse(item, ef.response) : '',
          ms: ef.ms,
        });
      } else if (ef.type === 'box') {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        const item = entry?.item ?? catalog.getItem(moduleId, ef.itemId);
        const topic = catalog.topicOfItem(moduleId, ef.itemId) ?? '';
        const firstTryRight = answerCorrectByItem.get(ef.itemId) ?? ef.box > 1;
        await saveProgressWithCap(options.progressStore, {
          moduleId,
          itemId: ef.itemId,
          topic,
          skill: item?.skill ?? '',
          level: item?.level ?? 'M6',
          box: ef.box,
          due: ef.due,
          firstTryRight,
          at: options.clock.now(),
        });
      } else if (ef.type === 'points') {
        await options.records.put('economy', state.economy);
        if (ef.applied !== 0) {
          await options.logStore.appendLedger({
            ts: options.clock.now(),
            day: state.day,
            delta: ef.applied,
            reason: ef.applied < 0 ? 'malus' : 'break',
          });
        }
      } else if (ef.type === 'unanswered') {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        const item = entry?.item ?? catalog.getItem(moduleId, ef.itemId);
        const topic = catalog.topicOfItem(moduleId, ef.itemId) ?? '';
        await options.logStore.appendAnswer({
          ts: options.clock.now(),
          day: state.day,
          context: 'break',
          sessionId,
          moduleId,
          topic,
          skill: item?.skill ?? '',
          level: item?.level ?? 'M6',
          itemId: ef.itemId,
          try: 1,
          correct: false,
          given: 'niet beantwoord',
          ms: 0,
        });
      } else if (ef.type === 'end') {
        ended = true;
        const score = state.results.filter((r) => r === 'first' || r === 'retry').length;
        await options.logStore.saveBreak({
          start: persisted.startedAt,
          end: ef.at,
          day: state.day,
          sessionId: persisted.sessionId,
          moduleId: persisted.moduleId,
          n: state.entries.length,
          score,
          points: state.earned,
          endedBy: ef.reason === 'parent' ? 'stopped' : 'done',
          firstAnswerMs: [...persisted.firstAnswerMs],
        });
      }
    }

    return ended;
  }

  async function dispatch(event: SessionEvent): Promise<void> {
    if (!active) return;
    const current = active;

    if (event.type === 'lessonDone' && current.moduleId && current.newTopicId) {
      await options.records.update('rotation', (rot) =>
        markLessonSeen(rot, current.moduleId, current.newTopicId!),
      );
    }

    const stepResult = reduce(current.session, event);
    current.session = stepResult.state;

    const ended = await processEffects(current, stepResult.effects);
    if (ended || current.session.phase === 'done') {
      clearEmptyTimer();
      await options.sessionStore.clear();
      if (screenView) {
        screenView.destroy();
        screenView = null;
      }
      active = null;
      options.screens.showWorld();
      options.onBreakFinished?.();
      return;
    }

    await options.sessionStore.save(current);
    screenView?.render(current.session);
    scheduleEmptyTimer(current.session);
  }

  function enqueueDispatch(event: SessionEvent): Promise<void> {
    processingQueue = processingQueue.then(() => dispatch(event)).catch(() => {
      /* keep queue alive */
    });
    return processingQueue;
  }

  function handleScreenAction(action: BreakScreenAction) {
    const at = options.clock.now();
    switch (action.type) {
      case 'lessonDone':
        void enqueueDispatch({ type: 'lessonDone', at });
        break;
      case 'answer':
        void enqueueDispatch({ type: 'answer', response: action.response, q: action.q, at });
        break;
      case 'next':
        void enqueueDispatch({ type: 'next', q: action.q, at });
        break;
      case 'understood':
        void enqueueDispatch({ type: 'understood', q: action.q, at });
        break;
      case 'finish':
        void enqueueDispatch({ type: 'finish', at });
        break;
    }
  }

  function mountScreen(persisted: PersistedBreakSession) {
    if (screenView) {
      screenView.destroy();
      screenView = null;
    }
    const lesson = lessonFor(persisted.moduleId, persisted.newTopicId);
    screenView = createBreakScreen({
      state: persisted.session,
      lesson,
      lessonForItem: (item) => lessonForItem(persisted.moduleId, item),
      canAffordEgg: (pts) => canAffordEgg(pts, shopCount),
      sound: options.sound,
      onAction: handleScreenAction,
      now: () => options.clock.now(),
    });
    options.screens.showLearn(screenView.element);
    scheduleEmptyTimer(persisted.session);
  }

  const flow: BreakFlow = {
    async startBreak(opts) {
      if (active) return;
      const catalog = options.getCatalog();
      const [settings, switches, rotation, economy, dinos, allProgress] = await Promise.all([
        options.records.get('settings'),
        options.records.get('switches'),
        options.records.get('rotation'),
        options.records.get('economy'),
        options.records.get('dinos'),
        options.progressStore.list(),
      ]);

      shopCount = shopDinoCount(dinos.dinos ?? [], dinos.eggs ?? []);
      const clockDay = today(options.clock);
      const lastSeenDay = (settings as { lastSeenDay?: string }).lastSeenDay ?? null;
      const effDay = effectiveDay(clockDay, lastSeenDay);
      if (effDay !== lastSeenDay) {
        await options.records.update('settings', (s) => ({ ...s, lastSeenDay: effDay }));
      }

      const count = Math.max(1, settings.questionsPerBreak || 5);
      const newLessonsEnabled = settings.newLessonsEnabled !== false;

      // Determine which modules can actually produce at least 1 question right now.
      const candidates: ModuleCandidate[] = catalog.modules().map((m) => {
        const modId = m.module.id;
        const on = isModuleOn(switches, catalog, modId);
        const weight = on ? moduleWeight(switches, modId) : 0;
        let usable = on && isModuleUsable(switches, catalog, modId);
        if (usable && !newLessonsEnabled) {
          // When new lessons are off, a module is usable only if it has seen switched-on items.
          const probe = selectBreakItems({
            catalog,
            switches,
            rotation,
            progress: allProgress,
            moduleId: modId,
            count: 1,
            today: effDay,
            lastSeenDay: effDay,
            newLessonsEnabled: false,
            shuffleOrder: false,
            rng: options.rng,
          });
          usable = probe.entries.length > 0;
        }
        return { id: modId, weight, usable };
      });

      const pickedMod = pickModule(rotation, candidates);
      let nextRotation: RotationState = pickedMod.state;
      const chosenModuleId = pickedMod.moduleId ?? '';
      let entries: SessionEntry[] = [];
      let newTopicId: string | null = null;
      let lessonFirst = false;

      if (chosenModuleId) {
        const sel = selectBreakItems({
          catalog,
          switches,
          rotation: nextRotation,
          progress: allProgress,
          moduleId: chosenModuleId,
          count,
          today: effDay,
          lastSeenDay: effDay,
          newLessonsEnabled,
          rng: options.rng,
        });
        entries = sel.entries;
        newTopicId = sel.newTopicId;
        nextRotation = sel.rotation;
        if (
          entries.length > 0 &&
          newTopicId !== null &&
          !hasSeenLesson(nextRotation, chosenModuleId, newTopicId)
        ) {
          const topicLesson = lessonFor(chosenModuleId, newTopicId);
          if (topicLesson && topicLesson.pages.length > 0) {
            lessonFirst = true;
          }
        }
      }

      await options.records.put('rotation', nextRotation);

      const now = options.clock.now();
      const started = startSession({
        mode: 'break',
        early: opts?.early === true,
        entries,
        economy,
        day: effDay,
        lessonFirst,
        at: now,
      });

      const persisted: PersistedBreakSession = {
        kind: 'break',
        sessionId: `break-${now}-${Math.floor(options.rng.next() * 1_000_000)}`,
        moduleId: chosenModuleId,
        newTopicId,
        startedAt: now,
        firstAnswerMs: [],
        session: started.state,
      };

      active = persisted;
      await options.sessionStore.save(persisted);
      mountScreen(persisted);
    },

    async resumeBreak(saved) {
      const dinos = await options.records.get('dinos');
      shopCount = shopDinoCount(dinos.dinos ?? [], dinos.eggs ?? []);
      // Adjust emptyUntil if resuming an empty break
      if (saved.session.phase === 'empty' && saved.session.emptyUntil === null) {
        saved.session = {
          ...saved.session,
          emptyUntil: options.clock.now() + EMPTY_BREAK_MS,
        };
      }
      active = saved;
      mountScreen(saved);
    },

    async endBreakByParent() {
      if (!active) return;
      await enqueueDispatch({ type: 'parentEnd', at: options.clock.now() });
    },

    isActive: () => active !== null,
    currentState: () => active?.session ?? null,

    async tickEmptyBreak() {
      if (!active || active.session.phase !== 'empty') return;
      await enqueueDispatch({ type: 'tick', at: options.clock.now() });
    },

    destroy() {
      clearEmptyTimer();
      if (screenView) {
        screenView.destroy();
        screenView = null;
      }
      active = null;
    },
  };

  if (__E2E__) {
    registerHook('startBreakNow', () => flow.startBreak());
    registerHook('startEarlyBreak', () => flow.startBreak({ early: true }));
    registerHook('endBreakByParent', () => flow.endBreakByParent());
    registerHook('isBreakActive', () => flow.isActive());
    registerHook('breakState', () => flow.currentState());
    registerHook('tickEmptyBreak', () => flow.tickEmptyBreak());
  }

  return flow;
}
