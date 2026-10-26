// One ready signal for the app (R1b, decisions 78 and 83).
// `whenReady(action)` runs the action now when the app is ready. Before that it shows one shared waiting
// card with Terug, and runs the action by itself on ready if the card is still open. When storage fails,
// or the app is not ready after READY_SLOW_MS, the card says the game cannot load.

import type { Sound } from '../audio/sound';
import type { Catalog } from '../content/catalog';
import { systemClock } from '../core/clock';
import { ownsFluit } from '../core/economy';
import type { Rng } from '../core/rng';
import type { Game } from '../game/game';
import { createWorldSave, type WorldSave } from '../game/world-save';
import type { ScreenGuard } from '../platform/screen-guard';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords, type Records } from '../storage/records';
import { createSaveQueue, type SaveQueue } from '../storage/save-queue';
import { createSessionStore, type SessionStore } from '../storage/session-store';
import type { CountdownView } from '../ui/countdown';
import { createWaitingCard, type WaitingCard } from '../ui/waiting-card';
import { createBreakFlow, type BreakFlow } from './break-flow';
import { loadCatalog } from './content-loader';
import { createExamFlow, type ExamFlow } from './exam-flow';
import { createParentFlow, type ParentFlow } from './parent-flow';
import { createPracticeFlow, type PracticeFlow } from './practice-flow';
import { resumeSessionIfAny } from './resume';
import type { ScreenManager } from './screens';
import { applySettingsToRuntime } from './settings-apply';
import { createShopFlow, type ShopFlow } from './shop-flow';
import { createTimerDriver, type TimerDriver } from './timer-driver';
import { createVillageFlow, type VillageFlow } from './village-flow';

export const READY_SLOW_MS = 10_000;

export interface ReadyGateOptions {
  /** Puts the card on screen. */
  show: (node: HTMLElement) => void;
  /** Takes the card off screen without going anywhere. */
  hide: () => void;
  /** Terug: back to the world. */
  back: () => void;
  slowMs?: number;
}

export interface ReadyGate {
  whenReady(action: () => void): void;
  /** Boot is done: flows exist. */
  markReady(): void;
  /** Boot could not open storage. */
  markFailed(): void;
  isReady(): boolean;
  /** Resolves on ready, rejects on failure. */
  readonly ready: Promise<void>;
}

export function createReadyGate(options: ReadyGateOptions): ReadyGate {
  let state: 'waiting' | 'ready' | 'failed' = 'waiting';
  let slow = false;
  let card: WaitingCard | null = null;
  let pending: (() => void) | null = null;
  let resolveReady: () => void = () => {};
  let rejectReady: (e: Error) => void = () => {};
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  ready.catch(() => {});

  const slowTimer = setTimeout(() => {
    if (state !== 'waiting') return;
    slow = true;
    card?.showFailure();
  }, options.slowMs ?? READY_SLOW_MS);

  function closeCard() {
    card?.destroy();
    card = null;
    pending = null;
  }

  return {
    ready,
    isReady: () => state === 'ready',
    whenReady(action) {
      if (state === 'ready') {
        action();
        return;
      }
      // One card, one pending action: a second tap while it is open never runs twice.
      pending = state === 'failed' ? null : action;
      if (card) return;
      const made = createWaitingCard({
        failed: state === 'failed' || slow,
        onBack: () => {
          if (card !== made) return;
          closeCard();
          options.back();
        },
      });
      card = made;
      options.show(made.element);
    },
    markReady() {
      if (state !== 'waiting') return;
      state = 'ready';
      clearTimeout(slowTimer);
      const run = pending;
      if (card) {
        closeCard();
        options.hide();
      }
      resolveReady();
      run?.();
    },
    markFailed() {
      if (state !== 'waiting') return;
      state = 'failed';
      clearTimeout(slowTimer);
      pending = null;
      card?.showFailure();
      rejectReady(new Error('boot failed'));
    },
  };
}

/** Everything boot builds. The ready promise resolves with this, so nothing after boot checks for null. */
export interface App {
  queue: SaveQueue;
  records: Records;
  catalog: () => Catalog;
  timerDriver: TimerDriver;
  breakFlow: BreakFlow;
  parentFlow: ParentFlow;
  shopFlow: ShopFlow;
  practiceFlow: PracticeFlow;
  examFlow: ExamFlow;
  villageFlow: VillageFlow;
}

export interface BootDeps {
  screens: ScreenManager;
  /** Null when the 3D world could not start: boot then fails at once. */
  game: Game | null;
  guard: ScreenGuard;
  sound: Sound;
  rng: Rng;
  countdownView: CountdownView;
}

export interface Boot {
  gate: ReadyGate;
  /** Resolves with the App once every flow exists. Rejects when storage cannot open. */
  app: Promise<App>;
  /** Runs the action with the App now, or after the waiting card when boot is not done (decision 83). */
  whenApp(action: (app: App) => void): void;
  /** The App once it exists, else undefined. For buttons that work before boot ends. */
  current(): App | undefined;
  /** Opens storage, builds every flow, marks ready. Hands the world save to `bootSave`. */
  create(): Promise<WorldSave>;
}

export function createBoot(deps: BootDeps): Boot {
  const { screens, game, guard, sound, rng, countdownView } = deps;
  const gate = createReadyGate({
    show: (node) => screens.showKidOverlay(node),
    hide: () => screens.showKidOverlay(null),
    back: () => screens.showWorld(),
  });
  let built: App | undefined;
  let resolveApp: (app: App) => void = () => {};
  let rejectApp: (e: unknown) => void = () => {};
  const app = new Promise<App>((resolve, reject) => {
    resolveApp = resolve;
    rejectApp = reject;
  });
  app.catch(() => {});

  async function build(world: Game): Promise<{ app: App; sessionStore: SessionStore }> {
    const db = await openDb();
    const queue = createSaveQueue({ db });
    const records = createRecords(db);
    const progressStore = createProgressStore(db);
    const logStore = createLogStore(db);
    const sessionStore = createSessionStore(db);

    const catalog = await loadCatalog(db);
    const getCatalog = () => catalog;
    const [settings, timers] = await Promise.all([records.get('settings'), records.get('timers')]);

    const breakFlow = createBreakFlow({
      clock: systemClock,
      rng,
      screens,
      db,
      records,
      progressStore,
      logStore,
      sessionStore,
      getCatalog,
      sound,
      onBreakFinished: () => {
        timerDriver.resetPlayTimer();
      },
    });
    const timerDriver: TimerDriver = createTimerDriver({
      clock: systemClock,
      screens,
      guard,
      records,
      sound,
      countdownView,
      initialBreakEveryMinutes: settings.breakEveryMinutes || 5,
      initialPlayMsLeft: timers.playMsLeft,
      initialWarningEnabled: settings.breakWarningEnabled !== false,
      onBreakDue: () => {
        // The play timer does not run during an exam, but never start a break over one (AC66).
        if (examFlow.isActive()) return;
        void breakFlow.startBreak();
      },
    });
    applySettingsToRuntime(settings, { sound, timerDriver });

    const shopFlow = createShopFlow({
      screens,
      db,
      records,
      logStore,
      dinoStore: world.dinoStore,
      clock: systemClock,
      sound,
      onEarnCoins: () => {
        void breakFlow.startBreak({ early: true });
      },
      onFluitBought: () => world.setFluitOwned(true),
    });
    // The Dinofluit button shows once the kid owns the fluit (decision 114).
    world.setFluitOwned(ownsFluit(await records.get('economy')));
    const practiceFlow = createPracticeFlow({
      screens,
      clock: systemClock,
      rng,
      db,
      records,
      progressStore,
      logStore,
      getCatalog,
      sound,
      onStartBreakRound: async () => {
        await breakFlow.startBreak({ early: true });
      },
    });
    const examFlow: ExamFlow = createExamFlow({
      clock: systemClock,
      rng,
      screens,
      records,
      progressStore,
      logStore,
      sessionStore,
      timerDriver,
      dinoStore: world.dinoStore,
      getCatalog,
      onLock: () => {
        void parentFlow.openExamStop();
      },
      sound,
    });
    const parentFlow: ParentFlow = createParentFlow({
      clock: systemClock,
      rng,
      screens,
      records,
      progressStore,
      logStore,
      getCatalog,
      breakFlow,
      timerDriver,
      exams: {
        isActive: () => examFlow.isActive(),
        plan: (m, e) => examFlow.plan(m, e),
        start: (m, e) => examFlow.start(m, e),
        stop: () => examFlow.stop(),
      },
      sound,
      onResetWorld: () => {
        world.resetWorld();
      },
    });
    // Villagers ask their question only once the app is ready (AC182).
    const villageFlow = createVillageFlow({
      game: world,
      screens,
      timerDriver,
      records,
      progressStore,
      logStore,
      getCatalog,
      sound,
      clock: systemClock,
      rng,
    });
    return {
      app: {
        queue, records, catalog: getCatalog, timerDriver, breakFlow, parentFlow, shopFlow,
        practiceFlow, examFlow, villageFlow,
      },
      sessionStore,
    };
  }

  return {
    gate,
    app,
    whenApp(action) {
      gate.whenReady(() => {
        if (built) action(built);
      });
    },
    current: () => built,
    async create() {
      try {
        if (!game) throw new Error('no game');
        const { app: made, sessionStore } = await build(game);
        built = made;
        resolveApp(made);
        // Every flow exists: buttons that waited can run now.
        gate.markReady();
        void made.villageFlow.start();
        await resumeSessionIfAny({
          sessionStore,
          records: made.records,
          breakFlow: made.breakFlow,
          examFlow: made.examFlow,
        });
        return createWorldSave({ game, queue: made.queue, records: made.records });
      } catch (e) {
        gate.markFailed();
        rejectApp(e);
        throw e;
      }
    },
  };
}
