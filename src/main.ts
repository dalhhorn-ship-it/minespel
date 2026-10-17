import './styles/tokens.css';
import './styles/base.css';
import { registerHook } from './dev/e2e-hooks';
import { createAudioUnlock } from './platform/audio-unlock';
import { installLockdown } from './platform/lockdown';
import { startScreenGuard } from './platform/screen-guard';
import { createGame, type Game } from './game/game';
import { createNullRenderer, createWebGlRenderer, type RendererFactory } from './render/renderer';
import { createWorldSave } from './game/world-save';
import { openDb } from './storage/db';
import { createRecords } from './storage/records';
import { createSaveQueue, type SaveQueue } from './storage/save-queue';
import { el } from './ui/dom';

installLockdown();
const guard = startScreenGuard();
const audio = createAudioUnlock();

const app = document.getElementById('app');
let game: Game | null = null;
let queue: SaveQueue | null = null;
let teleported = 0;
let rendererFactoryIsReal = true;
if (app) {
  app.append(el('h1', { text: 'Dino Blokwereld' }));
  const container = el('div', { class: 'world' });
  container.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;touch-action:none';
  app.append(container);

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
    game = createGame({ container, rendererFactory, guard, search: window.location.search, audioUnlock: audio });
    game.on('teleported', () => {
      teleported++;
    });
  } catch {
    container.append(el('p', { class: 'shell-text', text: 'Je iPad kan de 3D wereld nu niet laten zien. Sluit de app en probeer het nog eens.' }));
  }
}

// Loads the saved world and player, then starts saving. Without storage or with a broken save the game still plays.
async function startSaving(g: Game): Promise<void> {
  try {
    const db = await openDb();
    const q = createSaveQueue({ db });
    queue = q;
    const save = createWorldSave({ game: g, queue: q, records: createRecords(db) });
    await save.restore();
    save.start();
  } catch {
    /* no storage: play without saving */
  }
}
let restored = false;
const booted = game ? startSaving(game) : Promise.resolve();
void booted.finally(() => {
  restored = true;
});

if (__E2E__) {
  registerHook('ready', () => restored);
  registerHook('screenGuard', () => guard.state());
  registerHook('audioUnlocked', () => audio.isUnlocked());
  if (game) {
    const g = game;
    registerHook('player', () => ({
      x: g.player.player.x, y: g.player.player.y, z: g.player.player.z,
      onGround: g.player.player.onGround, yaw: g.player.yaw, pitch: g.player.pitch,
    }));
    registerHook('gameRunning', () => g.isRunning());
    registerHook('frameCount', () => g.frameCount());
    registerHook('pauseGame', () => g.pause());
    registerHook('resumeGame', () => g.resume());
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
      p.x = x; p.y = y; p.z = z; p.vy = 0; p.onGround = false;
      g.player.yaw = yaw;
    });
    // Test blocks are set straight in the world, so they tell the save queue themselves.
    registerHook('markWorldDirty', () => queue?.markDirty('world'));
    registerHook('flushSave', () => queue?.flushNow());
    registerHook('resetWorld', () => g.resetWorld());
    registerHook('buildState', () => g.getBuildState());
    registerHook('setBuildState', (s: Partial<ReturnType<Game['getBuildState']>>) => g.setBuildState(s));
    registerHook('usesRealRenderer', () => rendererFactoryIsReal);
  }
}
