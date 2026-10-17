// Break flow (T43): runs a learning break from the moment the play timer reaches 0 until the kid is
// back in the world with a full timer. It picks the module (rotation) and the questions (selection),
// shows the lesson the first time a topic gives new items, saves every step (AC37), writes the answer
// log, the break log, the point ledger and the Leitner boxes, and resumes a saved break after a restart.
//
// Save order of one step: the session first (so a reopen is on the right question), then points,
// boxes and logs. A kill in between can lose a log line but never makes the kid answer twice for points.
// Storage trouble never blocks the kid: a break without working storage still plays, it just does not save.
import type { Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import { rotationWeights, type Switches } from '../content/switches';
import { dayKey, systemClock, type Clock } from '../core/clock';
import { createRng, type Rng } from '../core/rng';
import { sumsToForget } from '../learning/generated-items';
import { pickModule, hasSeenLesson, markLessonSeen, type RotationState } from '../learning/rotation';
import { selectQuestions } from '../learning/selection';
import {
  startSession,
  type SessionEffect,
  type SessionEntry,
  type SessionState as BreakState,
} from '../learning/break-session';
import type { Response } from '../learning/answer-check';
import { createSound, type Sound } from '../audio/sound';
import type { AudioUnlock } from '../platform/audio-unlock';
import type { SaveQueue } from '../storage/save-queue';
import { createLogStore, type BreakEnd, type LogStore } from '../storage/log-store';
import { createProgressStore, type ProgressStore } from '../storage/progress-store';
import type { Records } from '../storage/records';
import { createSessionStore, type SessionStore } from '../storage/session-store';
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
  /** Storage and helpers. Defaults to what `setBreakEnv` set. */
  env?: BreakEnv;
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
  audio?: AudioUnlock | null;
  sound?: Pick<Sound, 'play'>;
  clock?: Clock;
  rng?: Rng;
}

let sharedEnv: BreakEnv | null = null;

/** The app calls this once the save is loaded. The play timer builds the break flow with only the four screen options. */
export function setBreakEnv(env: BreakEnv | null): void {
  sharedEnv = env;
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
  /** The break log is written. Set so a restart does not write it twice. */
  logged: boolean;
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
  sessions: SessionStore;
  progress: ProgressStore;
  logs: LogStore;
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
    sessions: createSessionStore(env.db),
    progress: createProgressStore(env.db),
    logs: createLogStore(env.db),
    records: env.records,
  };
}

function givenText(item: Item, r: Response): string {
  switch (r.type) {
    case 'choice':
      return item.type === 'choice' ? (item.options[r.index] ?? String(r.index)) : String(r.index);
    case 'find-error':
      return r.index < 0 ? 'Geen fout' : item.type === 'find-error' ? (item.words[r.index] ?? String(r.index)) : String(r.index);
    case 'type':
      return r.text;
    case 'punctuate':
      return [...r.gaps].sort((a, b) => a - b).join(',');
  }
}

export function createBreakFlow(options: BreakFlowOptions): BreakFlow {
  let close: (() => void) | null = null;
  let opening = false;
  let run: Run | null = null;
  /** Bumped when a break ends, so a break that is still loading knows it is too late. */
  let generation = 0;
  let chain: Promise<void> = Promise.resolve();

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
        // The thinking time restarts, so a long closed app is not logged as a slow answer.
        r.meta.state = { ...saved.state, shownAt: clock.now() };
        if (saved.state.economy) void stores.records.put('economy', saved.state.economy).catch(() => undefined);
        mountScreen(r, host);
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
      logged: false,
      state: started.state,
    };
    const r: Run = { env, stores, clock, catalog, meta, screen: null, finished: false };
    if (stores) {
      try {
        await stores.records.put('rotation', nextRotation);
        await stores.sessions.save(meta);
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
    let sound = r.env.sound;
    if (!sound && r.env.audio) {
      void r.stores?.records.get('settings').then(
        (s) => {
          sound = createSound({ unlock: r.env.audio as AudioUnlock, enabled: s.soundEffectsEnabled, volume: s.volume });
        },
        () => undefined,
      );
    }
    const screen = createBreakScreen({
      state: meta.state,
      lesson: meta.lessonTopic ? catalog.topic(meta.moduleId, meta.lessonTopic)?.lesson : undefined,
      lessonOf,
      now: () => r.clock.now(),
      sound: { play: (name) => sound?.play(name) },
      onStep: (state, effects) => onStep(r, state, effects),
    });
    r.screen = screen;
    host.replaceChildren(screen.element);
  }

  function onStep(r: Run, state: BreakState, effects: SessionEffect[]): void {
    for (const e of effects) if (e.type === 'answer' && e.try === 1) r.meta.firstAnswerMs.push(e.ms);
    r.meta.state = state;
    const snapshot: SavedBreak = { ...r.meta, firstAnswerMs: [...r.meta.firstAnswerMs] };
    const stores = r.stores;
    if (stores) {
      enqueue(async () => {
        if (state.phase !== 'done') await stores.sessions.save(snapshot);
        for (const e of effects) await applyEffect(r, stores, state, e);
      });
    }
    if (state.phase === 'done') finishRun(r);
  }

  /** Writes one effect of a step: logs, boxes, points and the ledger. */
  async function applyEffect(r: Run, stores: Stores, state: BreakState, e: SessionEffect): Promise<void> {
    const moduleId = r.meta.moduleId;
    const entryOf = (itemId: string): SessionEntry | undefined => state.entries.find((x) => x.item.id === itemId);
    const ts = r.clock.now();
    switch (e.type) {
      case 'answer': {
        const entry = entryOf(e.itemId);
        if (!entry) return;
        await stores.logs.appendAnswer({
          ts: e.at,
          day: state.day,
          context: 'break',
          sessionId: r.meta.sessionId,
          moduleId,
          topic: topicOfItem(r.catalog, moduleId, entry.item),
          skill: entry.item.skill,
          level: entry.item.level,
          itemId: e.itemId,
          try: e.try,
          correct: e.correct,
          given: givenText(entry.item, e.response),
          ms: e.ms,
        });
        return;
      }
      case 'unanswered': {
        const entry = entryOf(e.itemId);
        if (!entry) return;
        await stores.logs.appendAnswer({
          ts,
          day: state.day,
          context: 'break',
          sessionId: r.meta.sessionId,
          moduleId,
          topic: topicOfItem(r.catalog, moduleId, entry.item),
          skill: entry.item.skill,
          level: entry.item.level,
          itemId: e.itemId,
          try: 1,
          correct: false,
          given: 'niet beantwoord',
          ms: 0,
        });
        return;
      }
      case 'box':
        await saveBox(r, stores, state, e.itemId, e.box, e.due);
        return;
      case 'points':
        await stores.records.put('economy', { ...state.economy });
        if (e.applied !== 0) {
          await stores.logs.appendLedger({ ts, day: state.day, delta: e.applied, reason: e.applied < 0 ? 'malus' : 'break' });
        }
        return;
      case 'end':
        return;
    }
  }

  /**
   * Box and due day of one item after its first try. A generated sum (optellen, aftrekken) is only
   * saved when it was answered wrong; a saved sum keeps following the boxes. At most 200 stay (AC126).
   */
  async function saveBox(r: Run, stores: Stores, state: BreakState, itemId: string, box: number, due: string): Promise<void> {
    const moduleId = r.meta.moduleId;
    const entry = state.entries.find((x) => x.item.id === itemId);
    if (!entry) return;
    const topic = topicOfItem(r.catalog, moduleId, entry.item);
    const open = r.catalog.isOpen(moduleId, topic);
    if (open && entry.box === 0 && box > 1) return; // a new sum answered right is not kept
    const old = await stores.progress.get(moduleId, itemId);
    await stores.progress.put({
      moduleId,
      itemId,
      box,
      due,
      level: entry.item.level,
      topic,
      skill: entry.item.skill,
      seen: (old?.seen ?? 0) + 1,
      added: r.clock.now(), // the store keeps an older value
    });
    if (open) {
      const all = await stores.progress.list(moduleId);
      for (const gone of sumsToForget(all, moduleId, topic)) {
        await stores.progress.delete(gone.moduleId, gone.itemId);
      }
    }
  }

  /** The break is over: write the break log, give the timer back, close the screen. */
  function finishRun(r: Run): void {
    if (r.finished) return;
    r.finished = true;
    const state = r.meta.state;
    const stores = r.stores;
    if (stores) {
      enqueue(async () => {
        const reason = state.endReason;
        if (!r.meta.logged && reason !== 'empty' && state.entries.length > 0) {
          const endedBy: BreakEnd = reason === 'parent' ? 'stopped' : 'done';
          const right = state.results.filter((x) => x === 'first' || x === 'retry').length;
          await stores.logs.saveBreak({
            start: r.meta.start,
            end: r.clock.now(),
            day: state.day,
            sessionId: r.meta.sessionId,
            moduleId: r.meta.moduleId,
            n: state.entries.length,
            score: right,
            points: state.earned,
            endedBy,
            firstAnswerMs: [...r.meta.firstAnswerMs],
          });
          r.meta.logged = true;
          await stores.sessions.save({ ...r.meta }); // a restart now only leaves the break
        }
      });
    }
    leave();
  }

  /** Closes the screen, wakes the world and restarts the timer, then clears the saved break. */
  function leave(): void {
    if (!isActive()) return;
    const env = run?.env ?? options.env ?? sharedEnv;
    const stores = run?.stores ?? (env ? storesOf(env) : null);
    generation++;
    run?.screen?.destroy();
    run = null;
    opening = false;
    close?.();
    close = null;
    // Chained after the break log. The full timer is saved before the saved break is forgotten.
    options.restartTimer();
    enqueue(async () => {
      await env?.queue?.flushNow().catch(() => undefined);
      await stores?.sessions.clear();
    });
    options.resumeWorld();
  }

  return {
    start() {
      if (isActive()) return;
      opening = true;
      const gen = ++generation;
      options.pauseWorld();
      const host = el('div', { class: 'break-host', attrs: { 'data-screen-id': 'break', role: 'dialog' } });
      host.style.cssText = 'position:absolute;inset:0';
      close = options.screens.open('learn', host);
      const env = options.env ?? sharedEnv ?? { db: null, records: null, queue: null };
      void openRun(env, host, gen)
        .then((r) => {
          if (r && gen === generation) run = r;
        })
        .catch(() => {
          // The questions could not be made: give the kid the world back with a full timer.
          if (gen === generation) leave();
        })
        .finally(() => {
          if (gen === generation) opening = false;
        });
    },
    isActive,
    end() {
      leave();
    },
    parentEnd() {
      run?.screen?.parentEnd();
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
