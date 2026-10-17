// Extra oefenen (T46, PRD 4.7, AC52, AC120). The kid picks a module and gets a round of N questions chosen
// by the same rules as a break. Each question works like in a break (retry, teach moment, points) but there is
// no malus and no +3 bonus, and at most 10 plus points count per calendar day (the economy does that, mode
// 'practice'). It is a 'learn' screen: the play timer is stopped and never reset, so it never replaces a break.
//
// Every step is saved by `commitStep` (session-writer.ts) with context 'practice' and ledger reason 'practice'.
// The round is NOT saved as a session: the `session` record is left alone, so the boot resume can never open
// a practice round as a break. A round that is closed early keeps the answers and points it already committed.
import '../styles/lesboek.css';
import { registerHook } from '../dev/e2e-hooks';
import type { Catalog } from '../content/catalog';
import type { Item, Lesson } from '../content/format';
import { moduleHasUsable, type Switches } from '../content/switches';
import { dayKey } from '../core/clock';
import { createRng, type Rng } from '../core/rng';
import { startSession, type SessionEffect, type SessionState } from '../learning/break-session';
import { hasSeenLesson, markLessonSeen } from '../learning/rotation';
import { selectQuestions } from '../learning/selection';
import { createProgressStore } from '../storage/progress-store';
import { defaultKv } from '../storage/schema';
import { createBreakScreen, MSG_EMPTY, type BreakScreen } from '../ui/learn/break-screen';
import { el } from '../ui/dom';
import { pointsText } from '../ui/pause-menu';
import { onTap } from '../ui/tap';
import type { AppEnv } from './app-env';
import { loadBreakCatalog, loadSwitches, topicOfItem } from './content-loader';
import type { Screens } from './screens';
import { commitStep, stepWrite } from './session-writer';

export const MSG_PRACTICE_ERROR = 'Extra oefenen kan nu niet starten. Probeer het straks nog eens.';

/** Extras for tests. The defaults are the real catalog and a random generator. */
export interface PracticeDeps {
  catalog?: () => Promise<Catalog>;
  rng?: Rng;
  /** Called with the state when the round starts and after every step. */
  onState?: (state: SessionState) => void;
}

/** Modules the kid can practise: switched on and with something to ask (AC48). */
export function practiceModules(catalog: Catalog, switches: Switches): Array<{ id: string; title: string }> {
  return catalog
    .modules()
    .filter((m) => moduleHasUsable(switches, catalog, m.id))
    .map((m) => ({ id: m.id, title: m.title }));
}

/** The pause menu stays open under this screen. Show the new total when the round is over. */
async function refreshPausePoints(env: AppEnv): Promise<void> {
  try {
    const eco = await env.records?.get('economy');
    const node = document.querySelector('[data-pause="points"]');
    if (eco && node) node.textContent = pointsText(eco.points);
  } catch {
    // keep what is shown
  }
}

export function openPractice(screens: Screens, env: AppEnv, deps: PracticeDeps = {}): () => void {
  let closed = false;
  let busy = false;
  let screen: BreakScreen | null = null;
  let chain: Promise<void> = Promise.resolve();
  let chooserCleanup: Array<() => void> = [];
  const cleanups: Array<() => void> = [];

  const host = el('div', { class: 'practice-host', attrs: { role: 'dialog', 'aria-label': 'Extra oefenen', 'data-screen-id': 'practice' } });
  const bar = el('div', { class: 'practice-bar' });
  const stop = el('button', { class: 'lesboek-back', text: 'Stoppen', attrs: { type: 'button', 'data-practice': 'stop' } });
  bar.append(stop);
  const stage = el('div', { class: 'practice-stage' });
  host.append(bar, stage);
  const closeScreen = screens.open('learn', host);
  cleanups.push(onTap(stop, close));

  function close(): void {
    if (closed) return;
    closed = true;
    screen?.destroy();
    screen = null;
    for (const c of [...chooserCleanup, ...cleanups]) c();
    chooserCleanup = [];
    closeScreen();
    // After the last commit, so the total is the real one.
    void chain.then(() => refreshPausePoints(env));
  }

  function note(text: string): void {
    stage.replaceChildren(el('p', { class: 'lesboek-note', text, attrs: { role: 'status' } }));
  }

  function showChooser(catalog: Catalog, switches: Switches): void {
    const mods = practiceModules(catalog, switches);
    if (mods.length === 0) return note(MSG_EMPTY);
    const buttons = mods.map((m) => {
      const b = el('button', { class: 'lesboek-topic practice-module', text: m.title, attrs: { type: 'button', 'data-practice-module': m.id } });
      chooserCleanup.push(
        onTap(b, () => {
          if (busy || closed) return;
          busy = true;
          void startRound(catalog, switches, m.id).catch(() => {
            busy = false;
            if (!closed) note(MSG_PRACTICE_ERROR);
          });
        }),
      );
      return b;
    });
    stage.replaceChildren(
      el('h2', { class: 'lesboek-title', text: 'Extra oefenen' }),
      el('p', { class: 'lesboek-note', text: 'Kies waar je mee wilt oefenen.' }),
      el('div', { class: 'lesboek-grid' }, buttons),
    );
  }

  async function startRound(catalog: Catalog, switches: Switches, moduleId: string): Promise<void> {
    const records = env.records;
    const db = env.db;
    const rng = deps.rng ?? createRng((Math.random() * 4294967296) >>> 0);
    const at = env.clock.now();
    const day = dayKey(at);
    const [settings, economy, rotation, progress] = await Promise.all([
      records ? records.get('settings').catch(() => defaultKv('settings')) : defaultKv('settings'),
      records ? records.get('economy').catch(() => defaultKv('economy')) : defaultKv('economy'),
      records ? records.get('rotation').catch(() => defaultKv('rotation')) : defaultKv('rotation'),
      db ? createProgressStore(db).list().catch(() => []) : Promise.resolve([]),
    ]);
    if (closed) return;
    const picked = selectQuestions({
      catalog,
      switches,
      moduleId,
      count: Math.max(1, Math.floor(settings.questionsPerBreak) || 5),
      progress,
      rotation,
      today: day,
      newAllowed: settings.newLessonsEnabled !== false,
      asked: [],
      rng,
    });
    let nextRotation = picked.rotation;
    let lessonTopic: string | null = null;
    if (picked.newTopicId && picked.newCount > 0 && !hasSeenLesson(nextRotation, moduleId, picked.newTopicId)) {
      lessonTopic = picked.newTopicId;
      nextRotation = markLessonSeen(nextRotation, moduleId, picked.newTopicId);
    }
    const started = startSession({ mode: 'practice', entries: picked.entries, economy, day, lessonFirst: lessonTopic !== null, at });
    const sessionId = `p${at}`;
    // Only the rotation is written here. The `session` record is not touched.
    if (db) await commitStep(db, { rotation: nextRotation }).catch(() => undefined);
    if (closed) return;

    const topicOf = (item: Item): string => topicOfItem(catalog, moduleId, item);
    const lessonOf = (item: Item): Lesson | undefined => catalog.topic(moduleId, topicOf(item))?.lesson;
    const onStep = (state: SessionState, effects: SessionEffect[]): void => {
      deps.onState?.(state);
      if (db) {
        const write = stepWrite({
          state,
          effects,
          context: 'practice',
          ledgerReason: 'practice',
          sessionId,
          moduleId,
          topicOf,
          isOpen: (topic) => catalog.isOpen(moduleId, topic),
          now: env.clock.now(),
          session: null,
        });
        delete write.session; // leave the saved session alone: a practice round is never a saved break
        chain = chain.then(() => commitStep(db, write)).catch(() => undefined);
      }
      if (state.phase === 'done') queueMicrotask(close);
    };
    const s = createBreakScreen({
      state: started.state,
      lesson: lessonTopic ? catalog.topic(moduleId, lessonTopic)?.lesson : undefined,
      lessonOf,
      now: () => env.clock.now(),
      sound: { play: (name) => env.sound.play(name) },
      onStep,
    });
    screen = s;
    deps.onState?.(started.state);
    stage.replaceChildren(s.element);
    for (const c of chooserCleanup) c();
    chooserCleanup = [];
    host.classList.add('practice-running');
    if (__E2E__) registerHook('practiceState', () => JSON.parse(JSON.stringify(s.getState())) as never);
  }

  note('Even laden...');
  const loadCatalog = deps.catalog ?? loadBreakCatalog;
  Promise.all([loadCatalog(), loadSwitches(env.records)]).then(
    ([catalog, switches]) => {
      if (!closed) showChooser(catalog, switches);
    },
    () => {
      if (!closed) note(MSG_PRACTICE_ERROR);
    },
  );

  return close;
}
