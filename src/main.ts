import './styles/tokens.css';
import './styles/base.css';
import { createReadyGate, bootApp, type App } from './app/boot';
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
import { createDinoMenu, type DinoMenu } from './ui/dino-menu';
import { el } from './ui/dom';
import { createLesboek } from './ui/learn/lesboek';
import { createPauseMenu, type PauseMenu } from './ui/pause-menu';
import { createShopView } from './ui/shop';

installLockdown();
const guard = startScreenGuard();
const audio = createAudioUnlock();
const sound = createSound({ unlock: audio });
const rng = createRng(Date.now() ^ 0x5f3759df);

const host = document.getElementById('app');
if (!host) throw new Error('Missing #app');
const container = el('div', { class: 'world' });
container.style.cssText =
  'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;touch-action:none';
host.append(el('h1', { text: 'Dino Blokwereld' }), container);

let game: Game | null = null;
let activePauseMenu: PauseMenu | null = null;
let activeDinoMenu: DinoMenu | null = null;
let teleported = 0;
let [userPaused, restored, worldActiveFromScreen] = [false, false, true];
// Closes the Dinowinkel placeholder that shows before the app is ready (AC164).
let cancelWaitingShop = () => {};

// The one ready signal (decision 83): buttons that need a flow go through `whenReady`/`withApp`.
const gate = createReadyGate({
  show: (node) => screens.showKidOverlay(node),
  hide: () => screens.showKidOverlay(null),
  back: () => screens.showWorld(),
});
const whenReady = gate.whenReady;
let giveApp: (app: App) => void = () => {};
const appReady = new Promise<App>((resolve) => (giveApp = resolve));
/** Runs the action with the App, after the app is ready (a waiting card shows until then). */
function withApp(action: (app: App) => void) {
  whenReady(() => void appReady.then(action));
}

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
    withApp((app) => {
      if (app.examFlow.isActive()) return;
      void app.breakFlow.startBreak({ early: true });
    });
  },
});

function closePauseMenu() {
  activePauseMenu?.destroy();
  activePauseMenu = null;
}

function syncGamePauseState() {
  if (userPaused || !worldActiveFromScreen) game?.pause();
  else if (restored) game?.resume();
}

function openDinoMenu(dino: WorldDino, screenX?: number, screenY?: number) {
  if (!game) return;
  activeDinoMenu?.destroy();
  const menu = createDinoMenu({
    dino,
    onModeChange: (mode) => game?.dinoStore.setDinoMode(dino.id, mode),
    onNameSave: (name) => game?.dinoStore.setDinoName(dino.id, name),
    onKnuffel: () => game?.dinoSystem.showHearts(screenX, screenY),
    onClose: () => {
      activeDinoMenu?.destroy();
      activeDinoMenu = null;
      screens.showWorld();
    },
  });
  activeDinoMenu = menu;
  screens.showKidOverlay(menu.element);
}

/** Opens the Dinowinkel at once. Before the app is ready a placeholder shows, then the real shop (AC164). */
function openShop() {
  cancelWaitingShop();
  closePauseMenu();
  if (gate.isReady()) {
    void appReady.then((app) => app.shopFlow.open());
    return;
  }
  let waiting = true;
  cancelWaitingShop = () => {
    waiting = false;
    view.destroy();
  };
  const view = createShopView({
    state: null,
    onBuy: () => {},
    onClose: () => {
      cancelWaitingShop();
      screens.showWorld();
    },
  });
  screens.showKidOverlay(view.element);
  void gate.ready.then(
    () => {
      if (!waiting) return;
      cancelWaitingShop();
      void appReady.then((app) => app.shopFlow.open());
    },
    () => {},
  );
}

/** Opens at once. Before the app is ready it shows the built in topics; practice waits for the app. */
async function openLesboek() {
  const app = gate.isReady() ? await appReady : null;
  const switches = app ? await app.records.get('switches') : { modules: {} };
  closePauseMenu();
  const lesboek = createLesboek({
    catalog: app?.catalog ?? createCatalog(),
    switches,
    onPracticeTopic: (moduleId, topicId) => {
      lesboek.destroy();
      withApp((ready) => void ready.practiceFlow.startTopic(moduleId, topicId));
    },
    onClose: () => {
      lesboek.destroy();
      screens.showWorld();
    },
  });
  screens.showKidOverlay(lesboek.element);
}

/** Opens the pause menu at once. The points show a placeholder until read (AC163). Resolves when the points are filled in. */
async function openPauseMenu(): Promise<void> {
  closePauseMenu();
  const menu = createPauseMenu({
    points: null,
    onResume: () => {
      closePauseMenu();
      screens.showWorld();
    },
    onTeleportHome: () => {
      game?.teleportHome();
      closePauseMenu();
      screens.showWorld();
    },
    onShop: openShop,
    onLesboek: () => void openLesboek(),
    onPractice: () => {
      closePauseMenu();
      withApp((app) => app.practiceFlow.open());
    },
    onParent: () => withApp((app) => void app.parentFlow.open()),
  });
  activePauseMenu = menu;
  screens.showKidOverlay(menu.element);
  // If reading fails the placeholder stays. Every other button still works.
  const economy = await appReady.then((app) => app.records.get('economy')).catch(() => null);
  if (economy && activePauseMenu === menu) menu.setPoints(economy.points);
}

// The real renderer. The e2e build may fall back to a renderer that draws nothing when WebGL is missing.
const probe = document.createElement('canvas');
const noWebGl = __E2E__ && !probe.getContext('webgl2') && !probe.getContext('webgl');
const rendererFactory: RendererFactory = noWebGl ? createNullRenderer : createWebGlRenderer;
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
    onParentPressed: () => withApp((app) => void app.parentFlow.open()),
    onDinoTapped: (dino, sx, sy) => openDinoMenu(dino, sx, sy),
    onBlockGridOpenChange: (open) => screens.setExternalKidOverlay(open),
  });
  game.hud.countdownSlot.append(countdownView.root);
  game.on('teleported', () => teleported++);
} catch {
  container.append(
    el('p', {
      class: 'shell-text',
      text: 'Je iPad kan de 3D wereld nu niet laten zien. Sluit de app en probeer het nog eens.',
    }),
  );
}

// Loads the saved world and player, then builds every flow and starts saving (decision 92 keeps bootSave as is).
const g = game;
const booted = g
  ? bootSave({
      game: g,
      wantsPause: () => userPaused || !worldActiveFromScreen,
      create: () =>
        bootApp({ game: g, screens, guard, sound, rng, countdownView, gate, onApp: giveApp }).catch((e: unknown) => {
          gate.markFailed();
          throw e;
        }),
    })
  : Promise.resolve('not-saving');
if (!game) gate.markFailed();
void booted.finally(() => {
  restored = true;
});

if (__E2E__) {
  registerAppHooks(appReady, game, {
    gate,
    guard,
    audio,
    isRestored: () => restored,
    teleportedCount: () => teleported,
    rendererIsReal: () => !noWebGl,
    setUserPaused: (paused) => {
      userPaused = paused;
      syncGamePauseState();
    },
    openPauseMenu,
    openDinoMenu: (dino) => openDinoMenu(dino),
  });
}
