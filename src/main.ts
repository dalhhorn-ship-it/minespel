import './styles/tokens.css';
import './styles/base.css';
import { createBreakFlow, type BreakFlow } from './app/break-flow';
import { loadCatalog } from './app/content-loader';
import { createExamFlow } from './app/exam-flow';
import { createParentFlow, type ParentFlow } from './app/parent-flow';
import { createPracticeFlow, type PracticeFlow } from './app/practice-flow';
import { resumeSessionIfAny } from './app/resume';
import { createScreenManager, type ScreenManager } from './app/screens';
import { applySettingsToRuntime } from './app/settings-apply';
import { createShopFlow, type ShopFlow } from './app/shop-flow';
import { createTimerDriver, type TimerDriver } from './app/timer-driver';
import { createSound } from './audio/sound';
import { createCatalog, type Catalog } from './content/catalog';
import { systemClock } from './core/clock';
import { createRng } from './core/rng';
import { registerHook } from './dev/e2e-hooks';
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
import { el } from './ui/dom';
import { createLesboek } from './ui/learn/lesboek';
import { createLockIcon } from './ui/lock-icon';
import { createPauseMenu, type PauseMenu } from './ui/pause-menu';

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
let activePauseMenu: PauseMenu | null = null;

let teleported = 0;
let rendererFactoryIsReal = true;
let userPaused = false;
let worldActiveFromScreen = true;
let restored = false;

const countdownView = createCountdownView({ initialMs: 5 * 60_000, warningEnabled: true });

function syncGamePauseState() {
  if (!game) return;
  if (userPaused || !worldActiveFromScreen) {
    game.pause();
  } else if (restored) {
    game.resume();
  }
}

async function openPauseMenu() {
  if (!screens || !game) return;
  if (activePauseMenu) {
    activePauseMenu.destroy();
    activePauseMenu = null;
  }
  const economy = records ? await records.get('economy') : { points: 0 };
  const menu = createPauseMenu({
    points: economy.points,
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
    onShop: () => {
      activePauseMenu?.destroy();
      activePauseMenu = null;
      void shopFlow?.open();
    },
    onLesboek: () => {
      void (async () => {
        const switches = records ? await records.get('switches') : { modules: {} };
        activePauseMenu?.destroy();
        activePauseMenu = null;
        const lesboek = createLesboek({
          catalog,
          switches,
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
      practiceFlow?.open();
    },
    onParent: () => {
      void parentFlow?.open();
    },
  });
  activePauseMenu = menu;
  screens.showKidOverlay(menu.element);
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

  // Floating parental controls lock button visible during kid overlays/breaks so parents can always enter the gate.
  const floatingLock = createLockIcon({
    floating: true,
    onOpenParent: () => {
      void parentFlow?.open();
    },
  });
  floatingLock.element.hidden = true;
  app.append(floatingLock.element);
  screens.subscribe((kind) => {
    floatingLock.element.hidden = kind === 'world' || kind === 'parent';
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
      onParentPressed: () => {
        void parentFlow?.open();
      },
      onBlockGridOpenChange: (open) => {
        screens?.setExternalKidOverlay(open);
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

// Loads the saved world and player, then starts saving and initializes M2 flows (timers, breaks, parental controls).
const booted = game
  ? bootSave({
      game,
      wantsPause: () => userPaused || !worldActiveFromScreen,
      create: async () => {
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
          const examFlow = createExamFlow();
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
              void breakFlow?.startBreak();
            },
          });

          applySettingsToRuntime(settings, { sound, timerDriver });

          shopFlow = createShopFlow({
            screens,
            getPoints: async () => (await recs.get('economy')).points,
          });
          practiceFlow = createPracticeFlow({
            screens,
          });
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
            sound,
            onResetWorld: () => {
              game?.resetWorld();
            },
          });

          await resumeSessionIfAny({
            sessionStore,
            records: recs,
            breakFlow,
            examFlow,
          });
        }

        return createWorldSave({ game: game as Game, queue: q, records: recs });
      },
    })
  : Promise.resolve('not-saving');
void booted.finally(() => {
  restored = true;
});

if (__E2E__) {
  registerHook('ready', () => restored);
  registerHook('screenGuard', () => guard.state());
  registerHook('audioUnlocked', () => audio.isUnlocked());
  registerHook('openPauseMenu', () => openPauseMenu());
  registerHook('openParentControls', () => parentFlow?.open());
  registerHook('points', async () => (records ? (await records.get('economy')).points : 0));
  registerHook('setPoints', async (pts: number) => {
    if (records) {
      await records.update('economy', (e) => ({ ...e, points: pts }));
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
  if (game) {
    const g = game;
    registerHook('player', () => ({
      x: g.player.player.x,
      y: g.player.player.y,
      z: g.player.player.z,
      onGround: g.player.player.onGround,
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
    registerHook('setLookInput', (tx: number, ty: number) => g.player.setLookInput(tx, ty));
    registerHook('nudgeLook', (tx: number, ty: number) => g.player.nudgeLook(tx, ty));
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
