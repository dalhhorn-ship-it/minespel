// Break flow (T43): runs a learning break from the moment the play timer reaches 0 until the kid is
// back in the world with a full timer. It picks the module (rotation) and the questions (selection),
// shows the lesson the first time a topic gives new items, saves every step (AC37), writes the answer
// log, the break log, the point ledger and the Leitner boxes, and resumes a saved break after a restart.
//
// Every step is saved by `commitStep` (session-writer.ts) in one transaction: the session, points, boxes,
// answer log and ledger together. The break log is written in the commit that clears the session, so a kill
// can never lose or double a log line or points. The start of a break (rotation plus first session) is one commit.
// Storage trouble never blocks the kid: a break without working storage still plays, it just does not save.
import type { Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import { rotationWeights, type Switches } from '../content/switches';
import { dayKey, systemClock, type Clock } from '../core/clock';
import { createRng, type Rng } from '../core/rng';
import { pickModule, hasSeenLesson, markLessonSeen, type RotationState } from '../learning/rotation';
import { selectQuestions } from '../learning/selection';
import {
  startSession,
  type SessionEffect,
  type SessionEntry,
  type SessionState as BreakState,
} from '../learning/break-session';
import type { Sound } from '../audio/sound';
import type { SaveQueue } from '../storage/save-queue';
import { createProgressStore, type ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import { createSessionStore, type SessionStore } from '../storage/session-store';
import { breakLogOf, commitStep, stepWrite } from './session-writer';
import { defaultKv } from '../storage/schema';
import { createBreakScreen, type BreakScreen } from '../ui/learn/break-screen';
import { el } from '../ui/dom';
import { loadBreakCatalog, loadSwitches, topicOfItem } from './content-loader';
import type { Screens } from './screens';

export interface BreakFlowOptions {
  screens: Screens;
  /** Stops the world while the break is open. */
  pauseWorld: () => void;
  /** Starts the world again after the break. */
  resumeWorld: () => void;
  /** Gives the kid a full play timer again. */
  restartTimer: () => void;
  /** Storage and helpers. Read when a break starts, so storage that joins later is used. */
  env: BreakEnv;
}

export interface BreakFlow {
  /** Opens the break: resumes a saved one, else starts a new one. Safe to call twice. */
  start(): void;
  isActive(): boolean;
  /** Ends the break: closes the screen, restarts the world and gives a full timer. */
  end(): void;
  /** A parent ended the break ("Pauze nu beeindigen", AC95). */
  parentEnd(): void;
  /** Resolves when everything the break has queued is written. For tests. */
  settled(): Promise<void>;
}

/** What the break needs from the app. All of it is optional: without storage the break still plays. */
export interface BreakEnv {
  db: IDBDatabase | null;
  records: Records | null;
  queue: Pick<SaveQueue, 'flushNow'> | null;
  sound?: Pick<Sound, 'play'>;
  clock?: Clock;
  rng?: Rng;
}

/** The saved break in the `session` record. The state inside is a plain object (AC37). */
interface SavedBreak {
  kind: 'break';
  sessionId: string;
  moduleId: string;
  start: number;
  /** Topic whose lesson opens this break, null when none. */
  lessonTopic: string | null;
  /** Time to answer of every first try, for the "snel geklikt" flag. */
  firstAnswerMs: number[];
  state: BreakState;
  [key: string]: unknown;
}

function isSavedBreak(v: unknown): v is SavedBreak {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<SavedBreak>;
  const st = s.state as Partial<BreakState> | undefined;
  return (
    s.kind === 'break' &&
    typeof s.sessionId === 'string' &&
    typeof s.moduleId === 'string' &&
    typeof s.start === 'number' &&
    Array.isArray(s.firstAnswerMs) &&
    typeof st === 'object' &&
    st !== null &&
    Array.isArray(st.entries) &&
    Array.isArray(st.results) &&
    typeof st.phase === 'string' &&
    typeof st.index === 'number'
  );
}

interface Stores {
  db: IDBDatabase;
  sessions: SessionStore;
  progress: ProgressStore;
  records: Records;
}

/** Everything one running break needs. */
interface Run {
  env: BreakEnv;
  stores: Stores | null;
  clock: Clock;
  catalog: Catalog;
  meta: SavedBreak;
  screen: BreakScreen | null;
  finished: boolean;
}

function storesOf(env: BreakEnv): Stores | null {
  if (!env.db || !env.records) return null;
  return {
    db: env.db,
    sessions: createSessionStore(env.db),
    progress: createProgressStore(env.db),
    records: env.records,
  };
}

export function createBreakFlow(options: BreakFlowOptions): BreakFlow {
  let close: (() => void) | null = null;
  let opening = false;
  let run: Run | null = null;
  /** Bumped when a break ends, so a break that is still loading knows it is too late. */
  let generation = 0;
  let chain: Promise<void> = Promise.resolve();
  /** A parent end that came while the break was still loading. Applied when the screen mounts. */
  let pendingParentEnd = false;
  /** Stops waiting for a parent screen to close. */
  let stopWaiting: (() => void) | null = null;

  /** Storage steps run one after the other. A failing step is skipped; the kid never sees it. */
  function enqueue(task: () => Promise<void>): void {
    chain = chain.then(task).catch(() => undefined);
  }

  const isActive = (): boolean => opening || close !== null;

  async function openRun(env: BreakEnv, host: HTMLElement, gen: number): Promise<Run | null> {
    const clock = env.clock ?? systemClock;
    const rng = env.rng ?? createRng((Math.random() * 4294967296) >>> 0);
    const stores = storesOf(env);
    await env.queue?.flushNow().catch(() => undefined); // the time left and the world are on disk before the questions
    await chain; // the end of the last break is written before this one reads the saved session
    const catalog = await loadBreakCatalog();
    if (gen !== generation) return null;

    // A saved break comes back on the same question (AC37).
    if (stores) {
      let saved: unknown = null;
      try {
        saved = await stores.sessions.load();
      } catch {
        saved = null;
      }
      if (gen !== generation) return null;
      if (isSavedBreak(saved) && catalog.module(saved.moduleId)) {
        const r: Run = { env, stores, clock, catalog, meta: saved, screen: null, finished: false };
        // The points come from the stored economy record, which is the truth (every step commits both together).
        // The saved session may hold older points, e.g. when a purchase happened between the boot and this resume.
        let economy: unknown = null;
        try {
          economy = await stores.records.get('economy');
        } catch {
          economy = null;
        }
        if (gen !== generation) return null;
        const fresh = economy && typeof economy === 'object' ? (economy as typeof saved.state.economy) : saved.state.economy;
        // The thinking time restarts, so a long closed app is not logged as a slow answer.
        r.meta.state = { ...saved.state, economy: { ...fresh }, shownAt: clock.now() };
        mountScreen(r, host);
        // A saved session is never 'done' (the commit that ends it clears it), but a stray one still closes.
        if (r.meta.state.phase === 'done') finishRun(r);
        return r;
      }
    }

    // A new break.
    const at = clock.now();
    const day = dayKey(at);
    const records = stores?.records ?? null;
    const [settings, economy, switches, rotation, progress] = await Promise.all([
      records ? records.get('settings').catch(() => defaultKv('settings')) : defaultKv('settings'),
      records ? records.get('economy').catch(() => defaultKv('economy')) : defaultKv('economy'),
      loadSwitches(records),
      records ? records.get('rotation').catch(() => defaultKv('rotation')) : defaultKv('rotation'),
      stores ? stores.progress.list().catch(() => []) : Promise.resolve([]),
    ]);
    if (gen !== generation) return null;

    const pick = chooseQuestions({
      catalog,
      switches,
      rotation,
      progress,
      count: Math.max(1, Math.floor(settings.questionsPerBreak) || 5),
      newAllowed: settings.newLessonsEnabled !== false,
      today: day,
      rng,
    });
    let nextRotation = pick.rotation;
    let lessonTopic: string | null = null;
    if (pick.moduleId && pick.newTopicId && pick.newCount > 0 && !hasSeenLesson(nextRotation, pick.moduleId, pick.newTopicId)) {
      lessonTopic = pick.newTopicId;
      nextRotation = markLessonSeen(nextRotation, pick.moduleId, pick.newTopicId);
    }
    const started = startSession({
      mode: 'break',
      entries: pick.entries,
      economy,
      day,
      lessonFirst: lessonTopic !== null,
      at,
    });
    const meta: SavedBreak = {
      kind: 'break',
      sessionId: `b${at}`,
      moduleId: pick.moduleId ?? '',
      start: at,
      lessonTopic,
      firstAnswerMs: [],
      state: started.state,
    };
    const r: Run = { env, stores, clock, catalog, meta, screen: null, finished: false };
    if (stores) {
      try {
        await commitStep(stores.db, { session: meta, rotation: nextRotation });
      } catch {
        // The break plays without saving.
      }
    }
    if (gen !== generation) return null;
    mountScreen(r, host);
    return r;
  }

  function mountScreen(r: Run, host: HTMLElement): void {
    const { catalog, meta } = r;
    const topicOf = (item: Item): string => topicOfItem(catalog, meta.moduleId, item);
    const lessonOf = (item: Item): Lesson | undefined => catalog.topic(meta.moduleId, topicOf(item))?.lesson;
    const screen = createBreakScreen({
      state: meta.state,
      lesson: meta.lessonTopic ? catalog.topic(meta.moduleId, meta.lessonTopic)?.lesson : undefined,
      lessonOf,
      now: () => r.clock.now(),
      sound: { play: (name) => r.env.sound?.play(name) },
      onStep: (state, effects) => onStep(r, state, effects),
    });
    r.screen = screen;
    host.replaceChildren(screen.element);
  }

  function onStep(r: Run, state: BreakState, effects: SessionEffect[]): void {
    for (const e of effects) if (e.type === 'answer' && e.try === 1) r.meta.firstAnswerMs.push(e.ms);
    // A parent end on the summary: every question was answered, so the break counts as done.
    const logState: BreakState =
      state.phase === 'done' && state.endReason === 'parent' && r.meta.state.phase === 'summary'
        ? { ...state, endReason: 'complete' }
        : state;
    r.meta.state = state;
    const done = state.phase === 'done';
    const stores = r.stores;
    if (stores && !r.finished) {
      const write = stepWrite({
        state,
        effects,
        context: 'break',
        ledgerReason: 'break',
        sessionId: r.meta.sessionId,
        moduleId: r.meta.moduleId,
        topicOf: (item) => topicOfItem(r.catalog, r.meta.moduleId, item),
        isOpen: (topic) => r.catalog.isOpen(r.meta.moduleId, topic),
        now: r.clock.now(),
        // The commit that ends the break also clears the saved session and writes the break log.
        session: done ? null : { ...r.meta, firstAnswerMs: [...r.meta.firstAnswerMs] },
        breakLog: done ? breakLogOf({ state: logState, sessionId: r.meta.sessionId, moduleId: r.meta.moduleId, start: r.meta.start, end: r.clock.now(), firstAnswerMs: r.meta.firstAnswerMs }) : undefined,
      });
      enqueue(() => commitStep(stores.db, write));
    }
    if (done) finishRun(r);
  }

  /** The break is over: give the timer back and close the screen. Its log is in the final step commit. */
  function finishRun(r: Run): void {
    if (r.finished) return;
    r.finished = true;
    leave(); // leave() also clears a stray saved session
  }

  /** Closes the screen, wakes the world and restarts the timer, then clears the saved break. */
  function leave(): void {
    if (!isActive()) return;
    const env = run?.env ?? options.env;
    const stores = run?.stores ?? storesOf(env);
    generation++;
    run?.screen?.destroy();
    run = null;
    opening = false;
    pendingParentEnd = false;
    close?.();
    close = null;
    // Chained after the break log. The full timer is saved before the saved break is forgotten.
    options.restartTimer();
    enqueue(async () => {
      await env.queue?.flushNow().catch(() => undefined);
      await stores?.sessions.clear();
    });
    options.resumeWorld();
  }

  function begin(): void {
    if (isActive()) return;
    opening = true;
    pendingParentEnd = false;
    const gen = ++generation;
    options.pauseWorld();
    const host = el('div', { class: 'break-host', attrs: { 'data-screen-id': 'break', role: 'dialog' } });
    host.style.cssText = 'position:absolute;inset:0';
    close = options.screens.open('learn', host);
    void openRun(options.env, host, gen)
      .then((r) => {
        if (r && gen === generation) {
          run = r;
          if (pendingParentEnd) {
            pendingParentEnd = false;
            if (!r.finished) r.screen?.parentEnd();
          }
        }
      })
      .catch(() => {
        // The questions could not be made: give the kid the world back with a full timer.
        if (gen === generation) leave();
      })
      .finally(() => {
        if (gen === generation) opening = false;
      });
  }

  return {
    start() {
      if (isActive() || stopWaiting) return;
      // A parent screen (PIN pad, first start, parent area) is on top: the break waits until it closes.
      if (options.screens.current() === 'parent') {
        let unsubscribe: (() => void) | null = null;
        let cancelled = false;
        const stop = () => {
          cancelled = true;
          unsubscribe?.();
          unsubscribe = null;
          if (stopWaiting === stop) stopWaiting = null;
        };
        stopWaiting = stop;
        unsubscribe = options.screens.subscribe((kind) => {
          if (cancelled || kind === 'parent') return;
          stop();
          begin();
        });
        if (cancelled) unsubscribe?.();
        return;
      }
      begin();
    },
    isActive,
    end() {
      leave();
    },
    parentEnd() {
      if (run?.screen) run.screen.parentEnd();
      else if (opening) pendingParentEnd = true; // still loading: applied when the break mounts
    },
    settled: () => chain,
  };
}

interface ChooseInput {
  catalog: Catalog;
  switches: Switches;
  rotation: RotationState;
  progress: Parameters<typeof selectQuestions>[0]['progress'];
  count: number;
  newAllowed: boolean;
  today: string;
  rng: Rng;
}

interface Chosen {
  moduleId: string | null;
  entries: SessionEntry[];
  rotation: RotationState;
  newTopicId: string | null;
  newCount: number;
}

/**
 * Module by rotation (AC38), then its questions. Nothing asked yet in this break, so `asked` is empty;
 * selection itself never repeats an id within one pick (AC41, AC119). No module with questions means
 * an empty break (AC39).
 */
export function chooseQuestions(input: ChooseInput): Chosen {
  const { catalog, switches, progress, count, today, rng } = input;
  const weights = rotationWeights(switches, catalog);
  const candidates = Object.entries(weights).map(([id, weight]) => ({ id, weight, usable: true }));
  const mod = pickModule(input.rotation, candidates);
  if (mod.moduleId === null) return { moduleId: null, entries: [], rotation: mod.state, newTopicId: null, newCount: 0 };
  const first = selectQuestions({
    catalog,
    switches,
    moduleId: mod.moduleId,
    count,
    progress,
    rotation: mod.state,
    today,
    newAllowed: input.newAllowed,
    asked: [],
    rng,
  });
  return { moduleId: mod.moduleId, entries: first.entries, rotation: first.rotation, newTopicId: first.newTopicId, newCount: first.newCount };
}
