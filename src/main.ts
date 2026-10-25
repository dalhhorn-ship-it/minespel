import './styles/tokens.css';
import './styles/base.css';
import { createReadyGate } from './app/boot';
import { createBreakFlow, type BreakFlow } from './app/break-flow';
import { loadCatalog } from './app/content-loader';
import { createExamFlow, type ExamFlow } from './app/exam-flow';
import { createParentFlow, type ParentFlow } from './app/parent-flow';
import { createPracticeFlow, type PracticeFlow } from './app/practice-flow';
import { resumeSessionIfAny } from './app/resume';
import { createScreenManager, type ScreenManager } from './app/screens';
import { applySettingsToRuntime } from './app/settings-apply';
import { createShopFlow, type ShopFlow } from './app/shop-flow';
import { createTimerDriver, type TimerDriver } from './app/timer-driver';
import { createVillageFlow, type VillageFlow } from './app/village-flow';
import { createSound } from './audio/sound';
import { createCatalog, type Catalog } from './content/catalog';
import { systemClock, today } from './core/clock';
import { createRng } from './core/rng';
import { registerHook } from './dev/e2e-hooks';
import type { WorldDino } from './dinos/dino-store';
import type { DinoKindId } from './dinos/kinds';
import { createGame, type Game } from './game/game';
import { bootSave, createWorldSave } from './game/world-save';
import { createAudioUnlock } from './platform/audio-unlock';
import { installLockdown } from './platform/lockdown';
import { startScreenGuard } from './platform/screen-guard';
import { createNullRenderer, createWebGlRenderer, type RendererFactory } from './render/renderer';
import { openDb } from './storage/db';
import { createLogStore } from './storage/log-store';
import { createProgressStore } from './storage/progress-store';
import { createRecords, type Records } from './storage/records';
import { createSaveQueue, type SaveQueue } from './storage/save-queue';
import { createSessionStore } from './storage/session-store';
import { createCountdownView } from './ui/countdown';
import { createDinoMenu, type DinoMenu } from './ui/dino-menu';
import { el } from './ui/dom';
import { createLesboek } from './ui/learn/lesboek';
import { createPauseMenu, type PauseMenu } from './ui/pause-menu';
import { createShopView, type ShopView } from './ui/shop';

installLockdown();
const guard = startScreenGuard();
const audio = createAudioUnlock();
const sound = createSound({ unlock: audio });
const rng = createRng(Date.now() ^ 0x5f3759df);

const app = document.getElementById('app');
let game: Game | null = null;
let queue: SaveQueue | null = null;
let records: Records | null = null;
let catalog: Catalog = createCatalog();
let screens: ScreenManager | null = null;
let timerDriver: TimerDriver | null = null;
let breakFlow: BreakFlow | null = null;
let parentFlow: ParentFlow | null = null;
let shopFlow: ShopFlow | null = null;
let practiceFlow: PracticeFlow | null = null;
let examFlow: ExamFlow | null = null;
let villageFlow: VillageFlow | null = null;
let activePauseMenu: PauseMenu | null = null;
let activeDinoMenu: DinoMenu | null = null;
// The Dinowinkel placeholder shown when it was tapped before boot made the shop flow (AC164).
let waitingShop: ShopView | null = null;
// The one ready signal (decision 83). Buttons that need a flow go through `whenReady`.
// Pause and shop fill their points once `ready` resolves.
const gate = createReadyGate({
  show: (node) => screens?.showKidOverlay(node),
  hide: () => screens?.showKidOverlay(null),
  back: () => screens?.showWorld(),
});
const whenReady = gate.whenReady;

let teleported = 0;
let rendererFactoryIsReal = true;
let userPaused = false;
let worldActiveFromScreen = true;
let restored = false;

const countdownView = createCountdownView({
  initialMs: 5 * 60_000,
  warningEnabled: true,
  onStartNow: () => {
    whenReady(() => {
      if (examFlow?.isActive()) return;
      void breakFlow?.startBreak({ early: true });
    });
  },
});

function syncGamePauseState() {
  if (!game) return;
  if (userPaused || !worldActiveFromScreen) {
    game.pause();
  } else if (restored) {
    game.resume();
  }
}

function openDinoMenu(dino: WorldDino, screenX?: number, screenY?: number) {
  if (!screens || !game) return;
  if (activeDinoMenu) {
    activeDinoMenu.destroy();
    activeDinoMenu = null;
  }
  const menu = createDinoMenu({
    dino,
    onModeChange: (mode) => {
      game?.dinoStore.setDinoMode(dino.id, mode);
    },
    onNameSave: (name) => {
      game?.dinoStore.setDinoName(dino.id, name);
    },
    onKnuffel: () => {
      game?.dinoSystem.showHearts(screenX, screenY);
    },
    onClose: () => {
      activeDinoMenu?.destroy();
      activeDinoMenu = null;
      screens?.showWorld();
    },
  });
  activeDinoMenu = menu;
  screens.showKidOverlay(menu.element);
}

/**
 * Opens the Dinowinkel at once. With the shop flow ready it shows a placeholder and fills in the points when read.
 * Without it (boot not finished) a waiting card shows and the real shop opens as soon as the flow exists (AC164).
 */
function openShop() {
  if (!screens) return;
  activePauseMenu?.destroy();
  activePauseMenu = null;
  waitingShop?.destroy();
  waitingShop = null;
  if (shopFlow) {
    void shopFlow.open();
    return;
  }
  const waiting = createShopView({
    state: null,
    onBuy: () => {},
    onClose: () => {
      waitingShop?.destroy();
      waitingShop = null;
      screens?.showWorld();
    },
  });
  waitingShop = waiting;
  screens.showKidOverlay(waiting.element);
}

/** Called when the app is ready: a waiting card, if the kid is looking at one, becomes the real shop. */
function shopFlowReady() {
  if (!waitingShop) return;
  waitingShop.destroy();
  waitingShop = null;
  void shopFlow?.open();
}

/** Opens the pause menu at once. The points show a placeholder until read (AC163). Resolves when the points are filled in. */
async function openPauseMenu(): Promise<void> {
  if (!screens) return;
  if (activePauseMenu) {
    activePauseMenu.destroy();
    activePauseMenu = null;
  }
  const menu = createPauseMenu({
    points: null,
    onResume: () => {
      activePauseMenu?.destroy();
      activePauseMenu = null;
      screens?.showWorld();
    },
    onTeleportHome: () => {
      game?.teleportHome();
      activePauseMenu?.destroy();
      activePauseMenu = null;
      screens?.showWorld();
    },
    onShop: openShop,
    onLesboek: () => {
      void (async () => {
        const switches = records ? await records.get('switches') : { modules: {} };
        activePauseMenu?.destroy();
        activePauseMenu = null;
        const lesboek = createLesboek({
          catalog,
          switches,
          onPracticeTopic: (moduleId, topicId) => {
            lesboek.destroy();
            whenReady(() => {
              void practiceFlow?.startTopic(moduleId, topicId);
            });
          },
          onClose: () => {
            lesboek.destroy();
            screens?.showWorld();
          },
        });
        screens?.showKidOverlay(lesboek.element);
      })();
    },
    onPractice: () => {
      activePauseMenu?.destroy();
      activePauseMenu = null;
      whenReady(() => practiceFlow?.open());
    },
    onParent: () => {
      whenReady(() => {
        void parentFlow?.open();
      });
    },
  });
  activePauseMenu = menu;
  screens.showKidOverlay(menu.element);
  try {
    await gate.ready;
    const economy = await (records as Records).get('economy');
    if (activePauseMenu === menu) menu.setPoints(economy.points);
  } catch {
    // The placeholder stays. Every other button still works.
  }
}

if (app) {
  app.append(el('h1', { text: 'Dino Blokwereld' }));
  const container = el('div', { class: 'world' });
  container.style.cssText =
    'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;touch-action:none';
  app.append(container);

  screens = createScreenManager({
    host: app,
    onWorldActiveChange: (active) => {
      worldActiveFromScreen = active;
      syncGamePauseState();
    },
  });

  // The real renderer. The e2e build may fall back to a renderer that draws nothing when WebGL is missing.
  let rendererFactory: RendererFactory = createWebGlRenderer;
  if (__E2E__) {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      rendererFactory = createNullRenderer;
      rendererFactoryIsReal = false;
    }
  }
  try {
    game = createGame({
      container,
      rendererFactory,
      guard,
      search: window.location.search,
      audioUnlock: audio,
      sound,
      onPausePressed: () => {
        void openPauseMenu();
      },
      onShopPressed: openShop,
      onParentPressed: () => {
        whenReady(() => {
          void parentFlow?.open();
        });
      },
      onDinoTapped: (dino, sx, sy) => {
        openDinoMenu(dino, sx, sy);
      },
      onBlockGridOpenChange: (open) => {
        screens?.setExternalKidOverlay(open);
      },
      onVillageBubbleTapped: () => {
        villageFlow?.onBubbleTapped();
      },
    });
    game.hud.countdownSlot.append(countdownView.root);
    game.on('teleported', () => {
      teleported++;
    });
  } catch {
    container.append(
      el('p', {
        class: 'shell-text',
        text: 'Je iPad kan de 3D wereld nu niet laten zien. Sluit de app en probeer het nog eens.',
      }),
    );
  }
}

/** Opens storage and builds every store and flow. Marks the app ready once the flows exist. */
async function createApp() {
  const db = await openDb();
  const q = createSaveQueue({ db });
  queue = q;
  const recs = createRecords(db);
  records = recs;
  const progressStore = createProgressStore(db);
  const logStore = createLogStore(db);
  const sessionStore = createSessionStore(db);

  catalog = await loadCatalog(db);
  const [settings, timers] = await Promise.all([recs.get('settings'), recs.get('timers')]);

  if (screens) {
    breakFlow = createBreakFlow({
      clock: systemClock,
      rng,
      screens,
      records: recs,
      progressStore,
      logStore,
      sessionStore,
      getCatalog: () => catalog,
      sound,
      onBreakFinished: () => {
        timerDriver?.resetPlayTimer();
      },
    });

    timerDriver = createTimerDriver({
      clock: systemClock,
      screens,
      guard,
      records: recs,
      sound,
      countdownView,
      initialBreakEveryMinutes: settings.breakEveryMinutes || 5,
      initialPlayMsLeft: timers.playMsLeft,
      initialWarningEnabled: settings.breakWarningEnabled !== false,
      onBreakDue: () => {
        // The play timer does not run during an exam, but never start a break over one (AC66).
        if (examFlow?.isActive()) return;
        void breakFlow?.startBreak();
      },
    });

    applySettingsToRuntime(settings, { sound, timerDriver });

    shopFlow = createShopFlow({
      screens,
      db,
      records: recs,
      logStore,
      dinoStore: game?.dinoStore,
      clock: systemClock,
      sound,
      onEarnCoins: () => {
        void breakFlow?.startBreak({ early: true });
      },
    });
    practiceFlow = createPracticeFlow({
      screens,
      clock: systemClock,
      rng,
      records: recs,
      progressStore,
      logStore,
      getCatalog: () => catalog,
      sound,
      onStartBreakRound: async () => {
        await breakFlow?.startBreak({ early: true });
      },
    });
    const exams = createExamFlow({
      clock: systemClock,
      rng,
      screens,
      records: recs,
      progressStore,
      logStore,
      sessionStore,
      timerDriver,
      dinoStore: game?.dinoStore ?? null,
      getCatalog: () => catalog,
      onLock: () => {
        void parentFlow?.openExamStop();
      },
      sound,
    });
    examFlow = exams;
    parentFlow = createParentFlow({
      clock: systemClock,
      rng,
      screens,
      records: recs,
      progressStore,
      logStore,
      getCatalog: () => catalog,
      breakFlow,
      timerDriver,
      exams: {
        isActive: () => exams.isActive(),
        plan: (m, e) => exams.plan(m, e),
        start: (m, e) => exams.start(m, e),
        stop: () => exams.stop(),
      },
      sound,
      onResetWorld: () => {
        game?.resetWorld();
      },
    });

    // Villagers ask their question only once the app is ready (AC182).
    if (game) {
      villageFlow = createVillageFlow({
        game,
        screens,
        timerDriver,
        records: recs,
        progressStore,
        logStore,
        getCatalog: () => catalog,
        sound,
        clock: systemClock,
        rng,
      });
    }

    // Every flow exists: buttons that waited can run now.
    gate.markReady();
    void villageFlow?.start();
    await resumeSessionIfAny({
      sessionStore,
      records: recs,
      breakFlow,
      examFlow: exams,
    });
  }

  return createWorldSave({ game: game as Game, queue: q, records: recs });
}

// Loads the saved world and player, then starts saving and initializes M2 + M3 flows (timers, breaks, dinos, shop, practice, parental controls).
const booted = game
  ? bootSave({
      game,
      wantsPause: () => userPaused || !worldActiveFromScreen,
      create: () =>
        createApp().catch((e: unknown) => {
          gate.markFailed();
          throw e;
        }),
    })
  : Promise.resolve('not-saving');
if (!game) gate.markFailed();
void gate.ready.then(shopFlowReady, () => {});
void booted.finally(() => {
  // The saved world has loaded: no villager may stand inside a block the kid built (AC180).
  game?.villagerSystem.fixPlaces();
  restored = true;
});

if (__E2E__) {
  registerHook('ready', () => restored);
  registerHook('screenGuard', () => guard.state());
  registerHook('audioUnlocked', () => audio.isUnlocked());
  registerHook('openPauseMenu', () => openPauseMenu());
  // Tests call these after the save loaded, which can be before the ready gate on a slow machine (the save
  // gives up after 3 s). Waiting for the gate keeps these hooks free of the waiting card.
  registerHook('openParentControls', async () => {
    await gate.ready;
    await parentFlow?.open();
  });
  registerHook('openPractice', async () => {
    await gate.ready;
    practiceFlow?.open();
  });
  registerHook('points', async () => (records ? (await records.get('economy')).points : 0));
  registerHook('setPoints', async (pts: number) => {
    if (records) {
      await records.update('economy', (e) => ({ ...e, points: pts }));
    }
  });
  registerHook('setPracticeUsed', async (n: number) => {
    if (records) {
      await records.update('economy', (e) => ({
        ...e,
        practicePointsToday: n,
        practiceDay: today(systemClock),
      }));
    }
  });
  registerHook('breaksLog', async () => {
    if (!records) return [];
    const db = await openDb();
    const list = await createLogStore(db).listBreaks();
    db.close();
    return list;
  });
  registerHook('answersLog', async () => {
    if (!records) return [];
    const db = await openDb();
    const list = await createLogStore(db).listAnswers();
    db.close();
    return list;
  });
  registerHook('ledgerLog', async () => {
    if (!records) return [];
    const db = await openDb();
    const list = await createLogStore(db).listLedger();
    db.close();
    return list;
  });
  if (game) {
    const g = game;
    registerHook('player', () => ({
      x: g.player.player.x,
      y: g.player.player.y,
      z: g.player.player.z,
      onGround: g.player.player.onGround,
      floating: g.player.isFloating(),
      yaw: g.player.yaw,
      pitch: g.player.pitch,
    }));
    registerHook('gameRunning', () => g.isRunning());
    registerHook('frameCount', () => g.frameCount());
    registerHook('pauseGame', () => {
      userPaused = true;
      g.pause();
    });
    registerHook('resumeGame', () => {
      userPaused = false;
      syncGamePauseState();
    });
    registerHook('teleportHome', () => g.teleportHome());
    registerHook('teleportedCount', () => teleported);
    registerHook('blockAt', (x: number, y: number, z: number) => g.world.get(x, y, z));
    // quiet = 1 skips the chunk rebuild, so a test can change many blocks and call rebuildWorld once.
    registerHook('setBlock', (x: number, y: number, z: number, id: number, quiet?: number) => {
      g.world.set(x, y, z, id);
      if (!quiet) g.renderer.blockChanged(x, z);
    });
    registerHook('rebuildWorld', () => g.renderer.setWorld(g.world));
    registerHook('placePlayer', (x: number, y: number, z: number, yaw: number) => {
      const p = g.player.player;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vy = 0;
      p.onGround = false;
      g.player.yaw = yaw;
    });
    registerHook('ascendPlayer', (active: boolean) => g.player.setAscending(active));
    registerHook('descendPlayer', (active: boolean) => g.player.setDescending(active));
    registerHook('isPlayerFloating', () => g.player.isFloating());
    registerHook('setLookInput', (tx: number, ty: number) => g.player.setLookInput(tx, ty));
    registerHook('nudgeLook', (tx: number, ty: number) => g.player.nudgeLook(tx, ty));
    // Dinos & eggs hooks (M3)
    registerHook('dinos', () => g.dinoStore.dinos());
    registerHook('eggs', () => g.dinoStore.eggs());
    registerHook('addEgg', (kind: DinoKindId, golden?: boolean) => g.dinoStore.addEgg(kind, golden));
    registerHook('stepDinos', (dt: number) => g.dinoSystem.step(dt));
    // Villagers (V11c): plain copies, so a test reads them without touching the live state.
    registerHook('villagers', () =>
      g.villagerSystem.villagers().map((v) => ({
        id: v.id, site: v.site, home: { ...v.home }, position: { x: v.x, y: v.y, z: v.z },
        shirt: v.look.shirt, style: v.look.style, gives: v.gives, dancing: v.danceLeft > 0,
      })),
    );
    registerHook('stepVillagers', (dt: number) => g.villagerSystem.step(dt));
    registerHook('danceVillager', (id: string) => g.villagerSystem.dance(id));
    registerHook('openDinoMenuFor', (id: string) => {
      const d = g.dinoStore.getDino(id);
      if (d) openDinoMenu(d);
    });
    // Test blocks are set straight in the world, so they tell the save queue themselves.
    registerHook('markWorldDirty', () => queue?.markDirty('world'));
    registerHook('flushSave', () => queue?.flushNow());
    registerHook('resetWorld', () => g.resetWorld());
    registerHook('buildState', () => g.getBuildState());
    registerHook('setBuildState', (s: Partial<ReturnType<Game['getBuildState']>>) =>
      g.setBuildState(s),
    );
    registerHook('usesRealRenderer', () => rendererFactoryIsReal);
  }
}
