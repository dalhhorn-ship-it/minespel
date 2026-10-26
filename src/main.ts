import './styles/tokens.css';
import './styles/base.css';
import { createBoot } from './app/boot';
import { createScreenManager } from './app/screens';
import { createSound } from './audio/sound';
import { createCatalog } from './content/catalog';
import { createRng } from './core/rng';
import { registerAppHooks } from './dev/app-hooks';
import type { WorldDino } from './dinos/dino-store';
import { createGame, type Game } from './game/game';
import { bootSave } from './game/world-save';
import { createAudioUnlock } from './platform/audio-unlock';
import { installLockdown } from './platform/lockdown';
import { startScreenGuard } from './platform/screen-guard';
import { createNullRenderer, createWebGlRenderer, type RendererFactory } from './render/renderer';
import { createCountdownView } from './ui/countdown';
import { createDinoMenu } from './ui/dino-menu';
import { el } from './ui/dom';
import { createLesboek } from './ui/learn/lesboek';
import { createPauseMenu } from './ui/pause-menu';
import { createShopView } from './ui/shop';

installLockdown();
const guard = startScreenGuard();
const audio = createAudioUnlock();
const sound = createSound({ unlock: audio });
const rng = createRng(Date.now() ^ 0x5f3759df);

const host = document.getElementById('app') ?? document.body;
let teleported = 0;
let rendererFactoryIsReal = true;
let userPaused = false;
let worldActiveFromScreen = true;
let restored = false;
let game: Game | null = null;
let closePause = () => {};
let closeDinoMenu = () => {};
let closeWaitingShop = () => {};

host.append(el('h1', { text: 'Dino Blokwereld' }));
const container = el('div', { class: 'world' });
container.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;touch-action:none';
host.append(container);

const screens = createScreenManager({
  host,
  onWorldActiveChange: (active) => {
    worldActiveFromScreen = active;
    syncGamePauseState();
  },
});
const countdownView = createCountdownView({
  initialMs: 5 * 60_000,
  warningEnabled: true,
  onStartNow: () => {
    boot.whenApp((app) => {
      if (app.examFlow.isActive()) return;
      void app.breakFlow.startBreak({ early: true });
    });
  },
});
function syncGamePauseState() {
  if (!game) return;
  if (userPaused || !worldActiveFromScreen) game.pause();
  else if (restored) game.resume();
}

function openDinoMenu(dino: WorldDino, screenX?: number, screenY?: number) {
  closeDinoMenu();
  const menu = createDinoMenu({
    dino,
    onModeChange: (mode) => game?.dinoStore.setDinoMode(dino.id, mode),
    onNameSave: (name) => game?.dinoStore.setDinoName(dino.id, name),
    onKnuffel: () => game?.dinoSystem.showHearts(screenX, screenY),
    onClose: () => {
      closeDinoMenu();
      screens.showWorld();
    },
  });
  closeDinoMenu = () => {
    menu.destroy();
    closeDinoMenu = () => {};
  };
  screens.showKidOverlay(menu.element);
}

/**
 * Opens the Dinowinkel at once. Ready: the real shop. Not ready (boot not finished): a placeholder card shows
 * and the real shop opens as soon as the gate is ready (AC164).
 */
function openShop() {
  closePause();
  closeWaitingShop();
  const app = boot.current();
  if (app) {
    void app.shopFlow.open();
    return;
  }
  const waiting = createShopView({
    state: null,
    onBuy: () => {},
    onClose: () => {
      closeWaitingShop();
      screens.showWorld();
    },
  });
  closeWaitingShop = () => {
    waiting.destroy();
    closeWaitingShop = () => {};
  };
  const mine = closeWaitingShop;
  screens.showKidOverlay(waiting.element);
  void boot.app.then(
    (ready) => {
      if (closeWaitingShop !== mine) return;
      closeWaitingShop();
      void ready.shopFlow.open();
    },
    () => {},
  );
}

/** Opens the pause menu at once. The points show a placeholder until read (AC163). Resolves when the points are filled in. */
async function openPauseMenu(): Promise<void> {
  closePause();
  const back = () => {
    closePause();
    screens.showWorld();
  };
  const menu = createPauseMenu({
    points: null,
    onResume: back,
    onTeleportHome: () => {
      game?.teleportHome();
      back();
    },
    onShop: openShop,
    onLesboek: () => {
      void (async () => {
        const app = boot.current();
        const switches = app ? await app.records.get('switches') : { modules: {} };
        closePause();
        const lesboek = createLesboek({
          catalog: app ? app.catalog() : createCatalog(),
          switches,
          onPracticeTopic: (moduleId, topicId) => {
            lesboek.destroy();
            boot.whenApp((ready) => void ready.practiceFlow.startTopic(moduleId, topicId));
          },
          onClose: () => {
            lesboek.destroy();
            screens.showWorld();
          },
        });
        screens.showKidOverlay(lesboek.element);
      })();
    },
    onPractice: () => {
      closePause();
      boot.whenApp((app) => app.practiceFlow.open());
    },
    onParent: () => boot.whenApp((app) => void app.parentFlow.open()),
  });
  closePause = () => {
    menu.destroy();
    closePause = () => {};
  };
  const mine = closePause;
  screens.showKidOverlay(menu.element);
  try {
    const app = await boot.app;
    const economy = await app.records.get('economy');
    if (closePause === mine) menu.setPoints(economy.points);
  } catch {
    // The placeholder stays. Every other button still works.
  }
}

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
    onPausePressed: () => void openPauseMenu(),
    onShopPressed: openShop,
    onParentPressed: () => boot.whenApp((app) => void app.parentFlow.open()),
    onDinoTapped: openDinoMenu,
    onBlockGridOpenChange: (open) => screens.setExternalKidOverlay(open),
    onVillageBubbleTapped: () => boot.current()?.villageFlow.onBubbleTapped(),
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

// The one ready signal (decision 83). Buttons that need a flow go through `boot.whenApp`.
const boot = createBoot({ screens, game, guard, sound, rng, countdownView });

// Loads the saved world and player, then starts saving. `boot.create` builds the flows (timers, breaks, dinos, shop, practice, parental controls).
const booted = game
  ? bootSave({ game, wantsPause: () => userPaused || !worldActiveFromScreen, create: boot.create })
  : Promise.resolve('not-saving');
if (!game) boot.gate.markFailed();
void booted.finally(() => {
  // The saved world has loaded: no villager may stand inside a block the kid built (AC180).
  game?.villagerSystem.fixPlaces();
  restored = true;
});

if (__E2E__) {
  registerAppHooks(boot.app, game, {
    guard,
    audio,
    ready: boot.gate.ready,
    isRestored: () => restored,
    openPauseMenu,
    openDinoMenu: (dino) => openDinoMenu(dino),
    setUserPaused: (paused) => {
      userPaused = paused;
      if (!paused) syncGamePauseState();
    },
    teleportedCount: () => teleported,
    usesRealRenderer: () => rendererFactoryIsReal,
  });
}
