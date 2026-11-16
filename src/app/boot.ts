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
import { registerHook } from '../dev/e2e-hooks';
import { KNIGHT_PRIORITY, createKnightSystem, type KnightSystem } from '../knights/knight-system';
import { createNearSounds, type NearSounds } from '../audio/near-sounds';
import type { WorldDino } from '../dinos/dino-store';
import { createFeeder, type Feeder } from '../lavakip/feed';
import { createLavakipBar, LAVAKIP_BAR_PRIORITY, type LavakipBar } from '../lavakip/lavakip-bar';
import { createLavakipEconomy, type LavakipEconomy } from '../lavakip/lavakip-economy';
import { createBubblePill } from '../ui/bubble-pill';
import { createLavakipCard } from '../ui/lavakip-card';
import { createMoleTapCard, type MoleTapCard } from '../ui/mole-tap-card';
import { createActorLabels, labelPoint, type ActorLabels } from '../ui/actor-labels';
import { createBubbleHudFlow, type BubbleHudFlow } from './bubble-hud-flow';
import { readLavakip } from '../storage/lavakip-store';
import { MONSTER_PRIORITY, createMonsterSystem, type MonsterSystem } from '../monsters/monster-system';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { createMoedBar } from '../ui/moed-bar';
import { createMoleCard, type MoleCard } from '../ui/mole-card';
import { viewDistanceOf } from '../render/quality';
import { creatureSwitches, prepareMonsters, updateMonsters } from '../storage/monsters-store';
import { moveOldSave } from '../storage/world-move-store';
import { createProgressStore } from '../storage/progress-store';
import { createRecords, type Records } from '../storage/records';
import { createSaveQueue, type SaveQueue } from '../storage/save-queue';
import { createSessionStore, type SessionStore } from '../storage/session-store';
import type { CountdownView } from '../ui/countdown';
import { say, setSpeechClock } from '../ui/speech';
import { createWaitingCard, type WaitingCard } from '../ui/waiting-card';
import { createBreakFlow, type BreakFlow } from './break-flow';
import { loadCatalog } from './content-loader';
import { createKnightFlow } from './knight-flow';
import { createGearEconomy, type GearEconomy } from '../knights/gear-economy';
import { createStonesEconomy } from './stones-economy';
import { createStonesFlow, type StonesFlow } from './stones-flow';
import { cellIndex, WORLD_SEED } from '../world/terrain';
import { startWorld } from '../world/terrain-v3';
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
  /** The knights (v17). Buying and the menu use it. */
  knights: KnightSystem;
  /** The bubble clock, the bubble and Klodder (v18). */
  monsters: MonsterSystem;
  /** The wapenkast and the gear each knight wears (v19). */
  gear: GearEconomy;
  /** The found and bought vein stones (v20). */
  stones: StonesFlow;
  /** World labels (v22): the one pool of at most 16 nodes for Hihi!, Zzz, Gevangen!, the shield and the snack. */
  labels: ActorLabels;
  /** The pill under the learning break pill (v22). */
  bubbleHud: BubbleHudFlow;
  /** The near sounds (v24). */
  nearSounds: NearSounds;
  /** The Lavakip-bar: the economy, the truck in the world and the feeding (v23). */
  lavakip: LavakipEconomy;
  bar: LavakipBar;
  feeder: Feeder;
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

  async function build(world: Game): Promise<{ app: App; sessionStore: SessionStore; moved: boolean }> {
    const db = await openDb();
    const queue = createSaveQueue({ db });
    const records = createRecords(db);
    const progressStore = createProgressStore(db);
    const logStore = createLogStore(db);
    const sessionStore = createSessionStore(db);

    const catalog = await loadCatalog(db);
    const getCatalog = () => catalog;
    // First 0.7.0 start rule (decision 135): before settings are read, so the bubble default is in place.
    const prepared = await prepareMonsters(db);
    // v15: an old save moves into the big world in one transaction. After prepareMonsters: its first start rule
    // counts the `world` record to tell a new install. A failed move plays the start world without saving.
    const move = await moveOldSave(db);
    const [settings, timers] = await Promise.all([prepared ?? records.get('settings'), records.get('timers')]);

    // The monsters (v18) are built below; the timer and the break flow reach them through this reference.
    let monstersRef: MonsterSystem | null = null;
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
      onLock: () => {
        void parentFlow.openBreakEnd();
      },
      onBreakFinished: () => {
        timerDriver.resetPlayTimer();
        monstersRef?.onBreakFinished();
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
      onPlayElapsed: (ms) => monstersRef?.onPlayElapsed(ms),
      onBreakDue: () => {
        // The play timer does not run during an exam, but never start a break over one (AC66).
        if (examFlow.isActive()) return;
        void breakFlow.startBreak();
      },
    });
    // Kijkafstand (AC243): Ver is the quality the renderer was made with, so only Dichtbij has anything to apply at boot.
    applySettingsToRuntime(settings, {
      sound,
      timerDriver,
      renderer: viewDistanceOf(settings) === 'dichtbij' ? world.renderer : undefined,
      search: window.location.search,
    });

    // The Dinofluit button shows once the kid owns the fluit (decision 114).
    const economy = await records.get('economy');
    world.setFluitOwned(ownsFluit(economy));

    // The knights (v17). Every switch and points change happens on another screen, so settings and points are
    // read again each time the screen goes back to the world.
    let knightsRef: KnightSystem | null = null;
    let gearRef: GearEconomy | null = null;
    let feederRef: Feeder | null = null;
    // v22: the world labels, one pool for everything that floats over an animal, a knight or a mole.
    const labels = createActorLabels({ container: world.container });
    let monstersView: MonsterSystem | null = null;
    const knights = createKnightSystem({
      world: world.world,
      player: world.player,
      renderer: world.renderer,
      flow: createKnightFlow({
        screens,
        sound,
        setMode: (id, mode) => knightsRef?.setMode(id, mode),
        animals: () => world.dinoStore.dinos(),
        gear: {
          state: () => gearRef?.state() ?? { owned: [], worn: {} },
          wear: (knightId, itemId, slot) => gearRef?.wear(knightId, itemId, slot) ?? Promise.resolve(false),
        },
        knightList: () => knightsRef?.knights().map((k) => ({ id: k.id })) ?? [],
        feeder: () => feederRef ?? undefined,
      }),
      viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
      animals: () => world.dinoStore.dinos(),
      labels,
      moleAround: () => monstersView?.moleState().moles.some((m) => m.state !== 'caught') === true,
      persist: (change) => {
        // A refused write (a restore is running) is fine: the page reloads and the saved record wins.
        void updateMonsters(db, (m) => ({ ...m, knights: change(m.knights) })).catch(() => {});
      },
    });
    knightsRef = knights;
    const savedMonsters = move === 'failed' ? null : await records.get('monsters');
    knights.load(savedMonsters ? savedMonsters.knights : []);
    // v19: the wapenkast and who wears what; v20: the stones. A save from before 0.10.0 gives empty values.
    const gear = createGearEconomy({ db, knights });
    gearRef = gear;
    if (savedMonsters) gear.load(savedMonsters);
    let startCells: Uint8Array | null = null;
    const stones = createStonesFlow({
      db,
      say: (text) => say(text),
      game: world,
      startBlock: (x, y, z) => (startCells ??= startWorld(WORLD_SEED))[cellIndex(x, y, z)] ?? 0,
    });
    if (savedMonsters) stones.load(savedMonsters);
    const stonesEconomy = createStonesEconomy({ db, flow: stones, clock: systemClock });
    knights.applySwitches(creatureSwitches(settings));
    knights.setPoints(economy.points);
    world.addCreatures(knights, KNIGHT_PRIORITY);
    let moleCard: MoleCard | null = null;
    let moleTapCard: MoleTapCard | null = null;
    const reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // v23: the Lavakip-bar (record, economy, truck in the world, feeding). Nothing shows until V23a to V23c fill them.
    const lavakip = createLavakipEconomy({ db, world: world.world, pose: () => world.player.pose() });
    lavakip.load(readLavakip(move === 'failed' ? null : await records.get('lavakip')));
    const showLavakipCard = () => {
      const card = createLavakipCard({
        carried: () => lavakip.state().carried,
        points: () => knights.points(),
        onOrder: async () => {
          const ok = await lavakip.order();
          // The order paid in the record; the points copy of the knights reads it again (the screen did not change).
          if (ok) knights.setPoints((await records.get('economy')).points);
          return ok;
        },
        onSizzle: () => sound.play('sis'),
        onClose: () => {
          card.destroy();
          screens.showKidOverlay(null);
        },
      });
      screens.showKidOverlay(card.element);
    };
    const bar = createLavakipBar({
      economy: lavakip,
      renderer: world.renderer,
      viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
      player: world.player,
      world: world.world,
      openCard: showLavakipCard,
    });
    const feeder = createFeeder({
      economy: lavakip,
      body: (t) => (t.kind === 'knight' ? knights.knights().find((k) => k.id === t.id)?.body ?? null : world.dinoStore.getDino(t.id) ?? null),
      labels,
      sound,
      project: (p) => labelPoint(world.player.pose(), window.innerWidth, window.innerHeight, p),
      reducedMotion,
    });
    feederRef = feeder;
    // The bubble and Klodder (v18). The clock counts play time only, and only with the bubble switch on.
    const monsters = createMonsterSystem({
      world: world.world,
      player: world.player,
      renderer: world.renderer,
      knights,
      viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
      remainingPlayMs: () => timerDriver.remainingPlayMs(),
      persist: (change) => {
        void updateMonsters(db, change).catch(() => {});
      },
      occupied: (box) => world.dinoSystem.isOccupied(box) || world.villagerSystem.isOccupied(box) || knights.isOccupied?.(box) === true,
      animals: () => world.dinoStore.dinos(),
      moedBar: createMoedBar(),
      say: (text, ms, kind) => say(text, ms, kind),
      labels,
      keepOut: (x, y, z) => bar.keepOut(x, y, z),
      isGuarded: (animal) => knights.guardedBy((animal as WorldDino).id) !== null,
      showMoleTapCard: () => {
        // The card goes in the kid overlay, so the loop and the play timer stop until OK (AC298).
        if (moleTapCard?.element.isConnected) return;
        const card = createMoleTapCard({
          onOk: () => {
            card.destroy();
            moleTapCard = null;
            screens.showKidOverlay(null);
          },
        });
        moleTapCard = card;
        screens.showKidOverlay(card.element);
      },
      showMoleCard: () => {
        // The card goes in the kid overlay, so the loop and the play timer stop until OK (AC244).
        if (moleCard?.element.isConnected) return;
        const card = createMoleCard({
          onOk: () => {
            card.destroy();
            moleCard = null;
            screens.showKidOverlay(null);
          },
        });
        moleCard = card;
        screens.showKidOverlay(card.element);
      },
      shake: reducedMotion ? undefined : (ms) => world.renderer.shake?.(ms),
      sound,
    });
    monstersRef = monsters;
    monstersView = monsters;
    setSpeechClock(() => monsters.moleState().loopMs);
    world.on('mined', (e) => {
      monsters.onMined(e.x, e.y, e.z, e.block);
      stones.onMined(e.x, e.y, e.z, e.block);
    });
    world.on('blockChanged', (e) => monsters.onBlockChanged(e.x, e.z));
    monsters.load(await records.get('monsters'));
    monsters.applySwitches(creatureSwitches(settings));
    world.addCreatures(monsters, MONSTER_PRIORITY);
    // v22 to v24: the bar, the pill and the near sounds are creatures with no tap; the labels count their times down.
    let currentSwitches = creatureSwitches(settings);
    const bubbleHud = createBubbleHudFlow({
      monsters,
      view: createBubblePill(world.hud.bubbleSlot),
      pose: () => {
        const p = world.player.player;
        return { x: p.x, y: p.y, z: p.z, yaw: world.player.yaw };
      },
      switches: () => currentSwitches,
    });
    const nearSounds = createNearSounds({
      sound,
      collectMonsters: (list) => monsters.collectTargets(list),
      collectBar: (list) => bar.collectTargets(list),
      pose: () => {
        const p = world.player.player;
        return { x: p.x, y: p.y, z: p.z, yaw: world.player.yaw };
      },
    });
    world.addCreatures(bar, LAVAKIP_BAR_PRIORITY);
    world.addCreatures(bubbleHud, LAVAKIP_BAR_PRIORITY);
    world.addCreatures(nearSounds, LAVAKIP_BAR_PRIORITY);
    world.addCreatures({ step: (dt) => feeder.step(dt) }, LAVAKIP_BAR_PRIORITY + 5);
    world.addCreatures({ step: (dt) => labels.step(dt) }, LAVAKIP_BAR_PRIORITY + 10);
    // Every pause state (menu, break, portrait, hidden page): labels, pill and near sounds go quiet at once.
    const onRunning = (running: boolean) => {
      labels.setRunning(running);
      bubbleHud.setRunning(running);
      nearSounds.setRunning(running);
    };
    world.onRunningChange(onRunning);
    onRunning(world.isRunning());
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
      knights,
      gear,
      stonesFlow: stones,
      stones: stonesEconomy,
      lavakip,
    });
    screens.subscribe((kind) => {
      if (kind !== 'world') return;
      void Promise.all([records.get('settings'), records.get('economy')])
        .then(([s, e]) => {
          currentSwitches = creatureSwitches(s);
          knights.applySwitches(currentSwitches);
          monsters.applySwitches(currentSwitches);
          knights.setPoints(e.points);
        })
        .catch(() => {});
    });
    if (__E2E__) {
      registerHook('setCreatureSeed', (n: number) => {
        knights.setSeed(n);
        monsters.setSeed(n);
      });
      // Plays time forward in 1000 ms chunks while the game runs. Returns the ms done.
      registerHook('fastForward', (ms: number) => {
        let done = 0;
        while (done < ms && world.isRunning()) {
          const chunk = Math.min(1000, ms - done);
          timerDriver.advancePlayMs(chunk);
          if (world.advanceWorld(chunk) === 0) break;
          done += chunk;
        }
        return done;
      });
    }
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
      renderer: world.renderer,
      search: window.location.search,
      db,
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
        practiceFlow, examFlow, villageFlow, knights, monsters, gear, stones, labels, bubbleHud, nearSounds, lavakip, bar, feeder,
      },
      sessionStore,
      moved: move !== 'failed',
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
        const { app: made, sessionStore, moved } = await build(game);
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
        return createWorldSave({ game, queue: made.queue, records: made.records, moved });
      } catch (e) {
        gate.markFailed();
        rejectApp(e);
        throw e;
      }
    },
  };
}
