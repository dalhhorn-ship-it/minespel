// Exam flow (T51b, PRD 4.11, AC64 to AC71, AC111, AC153, AC155).
// Runs the pure exam session (T39) with the kid exam screens (T51a) on the exam layer.
// Saves the session after every step, writes answers (context `exam`), boxes and the exam record,
// gives the golden egg once on a pass, resumes at boot, and goes back to the world with a full play timer.
// Points never change here (AC65).

import type { Sound } from '../audio/sound';
import type { Catalog } from '../content/catalog';
import type { Item } from '../content/format';
import { effectiveDay, today, type Clock } from '../core/clock';
import type { Rng } from '../core/rng';
import { createSerialQueue } from '../core/serial-queue';
import { registerHook } from '../dev/e2e-hooks';
import type { DinoStore } from '../dinos/dino-store';
import { SHOP_KINDS } from '../dinos/kinds';
import type { Response } from '../learning/answer-check';
import {
  answerCurrent,
  beginExam,
  createExamSession,
  currentExamEntry,
  examResult,
  givenText,
  planExam,
  reviewPages,
  rightText,
  stopByParent,
  timeOut,
  toExamInput,
  type ExamEffect,
  type ExamState,
  type ExamStep,
} from '../learning/exam-session';
import { saveProgressWithCap } from '../learning/generated-items';
import type { LogStore } from '../storage/log-store';
import type { ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import type { SessionState as StoredSessionRecord, SessionStore } from '../storage/session-store';
import { createExamScreen, type ExamScreen, type ExamView } from '../ui/learn/exam-screen';
import type { ScreenManager } from './screens';
import type { TimerDriver } from './timer-driver';

export type PersistedExamPhase = 'start' | 'questions' | 'end' | 'review';

export interface PersistedExamSession extends StoredSessionRecord {
  kind: 'exam';
  sessionId: string;
  seed: number;
  /** `review` is the kid reading the mistakes. It reopens as `end` (AC153). */
  phase: PersistedExamPhase;
  /** The exam record is written (saveExam). */
  recorded: boolean;
  /** The golden egg is given (once, AC68). */
  eggGiven: boolean;
  session: ExamState;
}

export function isPersistedExamSession(value: unknown): value is PersistedExamSession {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<PersistedExamSession>;
  const s = v.session as Partial<ExamState> | undefined;
  return (
    v.kind === 'exam' &&
    typeof v.sessionId === 'string' &&
    typeof s === 'object' &&
    s !== null &&
    typeof s.moduleId === 'string' &&
    Array.isArray(s.entries) &&
    Array.isArray(s.answers) &&
    (s.phase === 'start' || s.phase === 'questions' || s.phase === 'end')
  );
}

export interface ExamFlowOptions {
  clock: Clock;
  rng: Rng;
  screens: ScreenManager;
  records: Pick<Records, 'get'>;
  progressStore: ProgressStore;
  logStore: LogStore;
  sessionStore: SessionStore;
  timerDriver: Pick<
    TimerDriver,
    'startExamTimer' | 'stopExamTimer' | 'remainingExamMs' | 'resetPlayTimer'
  >;
  /** Only `addEgg` is used. Null when the world could not start. */
  dinoStore: Pick<DinoStore, 'addEgg'> | null;
  getCatalog: () => Catalog;
  /** The small grey lock on the question screen (AC155). */
  onLock: () => void;
  sound?: Pick<Sound, 'play'>;
}

export interface ExamFlow {
  /** Opens the kid start screen. Does nothing when an exam already runs. */
  start(moduleId: string, examId: string, seed?: number): Promise<void>;
  /** The real question count for the parent's warning (AC72). */
  plan(moduleId: string, examId: string): { wanted: number; real: number };
  /** Resumes a saved exam at boot. False when the save cannot be used. */
  resumeExam(saved: StoredSessionRecord): Promise<boolean>;
  /** The parent stopped the exam through the gate (AC70). Shows the world itself. */
  stop(): Promise<void>;
  isActive(): boolean;
  currentState(): ExamState | null;
  destroy(): void;
}

/** An answer for the e2e hook `examAnswer`: right or on purpose wrong. */
export function responseFor(item: Item, right: boolean): Response {
  switch (item.type) {
    case 'choice': {
      const n = Math.max(1, item.options.length);
      return { type: 'choice', index: right ? item.answer : (item.answer + 1) % n };
    }
    case 'find-error':
      return { type: 'find-error', index: right ? item.answer : item.answer === -1 ? 0 : -1 };
    case 'type':
      return { type: 'type', text: right ? (item.answer[0] ?? '') : '???' };
    case 'punctuate':
      return {
        type: 'punctuate',
        gaps: right ? [...item.answer] : item.answer.length === 0 ? [0] : [],
      };
  }
}

export function createExamFlow(options: ExamFlowOptions): ExamFlow {
  let active: PersistedExamSession | null = null;
  let screenView: ExamScreen | null = null;
  const queue = createSerialQueue();

  function enqueue(job: () => Promise<void>): Promise<void> {
    return queue.run(job);
  }

  function viewOf(persisted: PersistedExamSession): ExamView {
    const state = persisted.session;
    if (state.phase === 'start') {
      return {
        phase: 'start',
        count: state.entries.length,
        minutes: state.timeLimitMinutes,
        title: state.title,
      };
    }
    if (state.phase === 'questions') {
      const entry = currentExamEntry(state);
      if (entry) {
        return {
          phase: 'question',
          index: state.index,
          count: state.entries.length,
          item: entry.item,
          ...(entry.numeric ? { numeric: true } : {}),
          msLeft: options.timerDriver.remainingExamMs(),
        };
      }
    }
    const result = examResult(state);
    return {
      phase: 'end',
      score: result.right,
      total: result.total,
      passed: result.passed,
      reviewPages: reviewPages(state).map((p) => ({
        prompt: p.prompt,
        given: p.unanswered ? null : p.given,
        right: p.right,
        explain: p.explain,
      })),
    };
  }

  function saveSession(persisted: PersistedExamSession): Promise<void> {
    return options.sessionStore.save(persisted);
  }

  function mountScreen(persisted: PersistedExamSession) {
    screenView?.destroy();
    screenView = createExamScreen({
      view: viewOf(persisted),
      onBegin: () => {
        void enqueue(() => begin());
      },
      onAnswer: (response, index) => {
        void enqueue(() => answer(response, index));
      },
      onLock: options.onLock,
      onLeave: () => {
        void enqueue(() => leave());
      },
      onReviewOpen: () => {
        void enqueue(async () => {
          if (!active || active.session.phase !== 'end') return;
          active.phase = 'review';
          await saveSession(active);
        });
      },
      now: () => options.clock.now(),
    });
    options.screens.showExam(screenView.element);
  }

  function renderScreen() {
    if (!active) return;
    screenView?.render(viewOf(active));
  }

  function leaveToWorld() {
    options.timerDriver.stopExamTimer();
    screenView?.destroy();
    screenView = null;
    active = null;
    options.screens.showWorld();
    options.timerDriver.resetPlayTimer();
  }

  function startTimer(persisted: PersistedExamSession, savedMs: number | null) {
    options.timerDriver.startExamTimer(
      persisted.session.timeLimitMinutes,
      savedMs,
      () => {
        // Read the open draft at once, before the screen can change (AC67).
        const draft = screenView?.getDraft() ?? null;
        void enqueue(() => expire(draft));
      },
      (ms) => screenView?.setTimeLeft(ms),
    );
  }

  async function writeEffects(persisted: PersistedExamSession, effects: readonly ExamEffect[]) {
    const state = persisted.session;
    const catalog = options.getCatalog();
    const correctByItem = new Map<string, boolean>();
    for (const ef of effects) if (ef.type === 'answer') correctByItem.set(ef.itemId, ef.correct);
    for (const ef of effects) {
      if (ef.type === 'answer') {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        await options.logStore.appendAnswer({
          ts: ef.at,
          day: state.day,
          context: 'exam',
          sessionId: persisted.sessionId,
          moduleId: state.moduleId,
          topic: catalog.topicOfItem(state.moduleId, ef.itemId) ?? '',
          skill: entry?.item.skill ?? '',
          level: entry?.item.level ?? 'M6',
          itemId: ef.itemId,
          try: 1,
          correct: ef.correct,
          given: entry ? givenText(entry.item, ef.response) : '',
          ms: ef.ms,
        });
      } else if (ef.type === 'box') {
        const entry = state.entries.find((e) => e.item.id === ef.itemId);
        await saveProgressWithCap(options.progressStore, {
          moduleId: state.moduleId,
          itemId: ef.itemId,
          topic: catalog.topicOfItem(state.moduleId, ef.itemId) ?? '',
          skill: entry?.item.skill ?? '',
          level: entry?.item.level ?? 'M6',
          box: ef.box,
          due: ef.due,
          firstTryRight: correctByItem.get(ef.itemId) ?? false,
          at: options.clock.now(),
        });
      }
    }
  }

  /** Saves the exam record and the golden egg once each. Safe to run again after a resume. */
  async function finalize(persisted: PersistedExamSession) {
    const result = examResult(persisted.session);
    if (!persisted.recorded) {
      await options.logStore.saveExam(toExamInput(persisted.session));
      persisted.recorded = true;
      await saveSession(persisted);
    }
    if (result.passed && !persisted.eggGiven && options.dinoStore) {
      const kinds = SHOP_KINDS;
      const kind = kinds[options.rng.int(0, kinds.length - 1)] ?? kinds[0];
      if (kind) await options.dinoStore.addEgg(kind.id, true);
      persisted.eggGiven = true;
      await saveSession(persisted);
    }
  }

  /** Writes a step, then moves on: next question, end screen, or (stopped) the world. */
  async function applyStep(persisted: PersistedExamSession, step: ExamStep) {
    persisted.session = step.state;
    persisted.phase = step.state.phase;
    await writeEffects(persisted, step.effects);
    const ended = step.effects.some((e) => e.type === 'end');
    if (!ended) {
      await saveSession(persisted);
      renderScreen();
      return;
    }
    options.timerDriver.stopExamTimer();
    // The end state is saved first, so a kill during finalize resumes on the end screen.
    await saveSession(persisted);
    if (step.state.endReason === 'parent') {
      await finalize(persisted);
      await options.sessionStore.clear();
      leaveToWorld();
      return;
    }
    await finalize(persisted);
    renderScreen();
  }

  async function begin() {
    if (!active || active.session.phase !== 'start') return;
    const step = beginExam(active.session, options.clock.now());
    const current = active;
    await applyStep(current, step);
    if (active === current && step.state.phase === 'questions') startTimer(current, null);
  }

  async function answer(response: Response, index: number) {
    if (!active || active.session.phase !== 'questions') return;
    const step = answerCurrent(active.session, response, options.clock.now(), index);
    if (step.state === active.session) return;
    await applyStep(active, step);
  }

  async function expire(draft: Response | null) {
    if (!active || active.session.phase !== 'questions') return;
    await applyStep(active, timeOut(active.session, draft, options.clock.now()));
  }

  async function leave() {
    if (!active || active.session.phase !== 'end') return;
    await finalize(active);
    await options.sessionStore.clear();
    leaveToWorld();
  }

  const flow: ExamFlow = {
    async start(moduleId, examId, seed) {
      if (active) return;
      const catalog = options.getCatalog();
      const [settings, progress] = await Promise.all([
        options.records.get('settings'),
        options.progressStore.list(moduleId),
      ]);
      const boxes: Record<string, number> = {};
      for (const p of progress) boxes[p.itemId] = p.box;
      const now = options.clock.now();
      const lastSeenDay = (settings as { lastSeenDay?: string }).lastSeenDay ?? null;
      const examSeed = seed ?? options.rng.int(1, 2_147_483_646);
      const state = createExamSession({
        catalog,
        moduleId,
        examId,
        seed: examSeed,
        day: effectiveDay(today(options.clock), lastSeenDay),
        at: now,
        boxes,
      });
      if (!state || active) return;
      const persisted: PersistedExamSession = {
        kind: 'exam',
        sessionId: `exam-${now}-${examSeed}`,
        seed: examSeed,
        phase: 'start',
        recorded: false,
        eggGiven: false,
        session: state,
      };
      active = persisted;
      await saveSession(persisted);
      mountScreen(persisted);
    },

    plan(moduleId, examId) {
      const plan = planExam(options.getCatalog(), moduleId, examId);
      return plan ? { wanted: plan.wanted, real: plan.real } : { wanted: 0, real: 0 };
    },

    async resumeExam(saved) {
      if (!isPersistedExamSession(saved)) return false;
      const persisted: PersistedExamSession = { ...saved };
      if (persisted.phase === 'review') persisted.phase = 'end';
      active = persisted;
      if (persisted.session.phase === 'end' && persisted.session.endReason === 'parent') {
        // Killed while stopping: finish the stop, no end screen (AC70).
        await enqueue(async () => {
          await finalize(persisted);
          await options.sessionStore.clear();
          leaveToWorld();
        });
        return true;
      }
      mountScreen(persisted);
      if (persisted.session.phase === 'questions') {
        const timers = await options.records.get('timers');
        startTimer(persisted, timers.examMsLeft);
      } else if (persisted.session.phase === 'end') {
        await enqueue(async () => {
          if (active) await finalize(active);
        });
      }
      return true;
    },

    async stop() {
      await enqueue(async () => {
        if (!active) return;
        if (active.session.phase === 'end') {
          await finalize(active);
          await options.sessionStore.clear();
          leaveToWorld();
          return;
        }
        await applyStep(active, stopByParent(active.session, options.clock.now()));
      });
    },

    isActive: () => active !== null,
    currentState: () => active?.session ?? null,

    destroy() {
      screenView?.destroy();
      screenView = null;
      active = null;
    },
  };

  if (__E2E__) {
    registerHook('startExam', (moduleId: string, examId: string, seed?: number) =>
      flow.start(moduleId, examId, seed),
    );
    registerHook('beginExam', () => enqueue(() => begin()));
    registerHook('isExamActive', () => flow.isActive());
    registerHook('examState', () => {
      const s = active?.session;
      if (!s) return null;
      return {
        phase: active?.phase ?? s.phase,
        index: s.index,
        count: s.entries.length,
        endReason: s.endReason,
        eggGiven: active?.eggGiven ?? false,
        /** The right answer of the question on screen, so a spec can type it. */
        right: currentExamEntry(s) ? rightText((currentExamEntry(s) as { item: Item }).item) : null,
        given: s.answers.map((a, i) =>
          a?.response ? givenText((s.entries[i] as { item: Item }).item, a.response) : null,
        ),
      };
    });
    // Answers the question on screen right or wrong, for long exams.
    registerHook('examAnswer', (right: boolean) => {
      const s = active?.session;
      const entry = s ? currentExamEntry(s) : null;
      if (!s || !entry) return Promise.resolve();
      return enqueue(() => answer(responseFor(entry.item, right), s.index));
    });
    registerHook('examsLog', () => options.logStore.listExams());
  }

  return flow;
}
