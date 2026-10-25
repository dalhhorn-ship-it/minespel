// Test hooks for the e2e build (R2a), moved out of `main.ts`. `main.ts` calls this only inside
// `if (__E2E__)`, so Vite drops the file from `dist/`. Keep every hook name: the e2e specs use them.
import type { App, ReadyGate } from '../app/boot';
import { systemClock, today } from '../core/clock';
import type { WorldDino } from '../dinos/dino-store';
import type { DinoKindId } from '../dinos/kinds';
import type { Game } from '../game/game';
import type { AudioUnlock } from '../platform/audio-unlock';
import type { ScreenGuard } from '../platform/screen-guard';
import { openDb } from '../storage/db';
import { createLogStore, type LogStore } from '../storage/log-store';
import { registerHook } from './e2e-hooks';

/** The few things only `main.ts` knows. */
export interface AppHookExtras {
  gate: ReadyGate;
  guard: ScreenGuard;
  audio: AudioUnlock;
  isRestored: () => boolean;
  teleportedCount: () => number;
  rendererIsReal: () => boolean;
  setUserPaused: (paused: boolean) => void;
  openPauseMenu: () => Promise<void>;
  openDinoMenu: (dino: WorldDino) => void;
}

export function registerAppHooks(appReady: Promise<App>, game: Game | null, extras: AppHookExtras): void {
  const { gate, guard, audio } = extras;
  registerHook('ready', () => extras.isRestored());
  registerHook('screenGuard', () => guard.state());
  registerHook('audioUnlocked', () => audio.isUnlocked());
  registerHook('openPauseMenu', () => extras.openPauseMenu());
  // Tests call these after the save loaded, which can be before the ready gate on a slow machine (the save
  // gives up after 3 s). Waiting for the gate keeps these hooks free of the waiting card.
  registerHook('openParentControls', async () => {
    await gate.ready;
    await (await appReady).parentFlow.open();
  });
  registerHook('openPractice', async () => {
    await gate.ready;
    (await appReady).practiceFlow.open();
  });
  registerHook('points', async () => (await (await appReady).records.get('economy')).points);
  registerHook('setPoints', async (pts: number) => {
    await (await appReady).records.update('economy', (e) => ({ ...e, points: pts }));
  });
  registerHook('setPracticeUsed', async (n: number) => {
    await (
      await appReady
    ).records.update('economy', (e) => ({
      ...e,
      practicePointsToday: n,
      practiceDay: today(systemClock),
    }));
  });
  // The logs are read through a fresh connection, so they show what is really saved.
  const readLog = async <T>(read: (store: LogStore) => Promise<T>): Promise<T> => {
    await appReady;
    const db = await openDb();
    const list = await read(createLogStore(db));
    db.close();
    return list;
  };
  registerHook('breaksLog', () => readLog((s) => s.listBreaks()));
  registerHook('answersLog', () => readLog((s) => s.listAnswers()));
  registerHook('ledgerLog', () => readLog((s) => s.listLedger()));
  if (!game) return;
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
    extras.setUserPaused(true);
    g.pause();
  });
  registerHook('resumeGame', () => extras.setUserPaused(false));
  registerHook('teleportHome', () => g.teleportHome());
  registerHook('teleportedCount', () => extras.teleportedCount());
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
  registerHook('openDinoMenuFor', (id: string) => {
    const d = g.dinoStore.getDino(id);
    if (d) extras.openDinoMenu(d);
  });
  // Test blocks are set straight in the world, so they tell the save queue themselves.
  registerHook('markWorldDirty', async () => (await appReady).queue.markDirty('world'));
  registerHook('flushSave', async () => (await appReady).queue.flushNow());
  registerHook('resetWorld', () => g.resetWorld());
  registerHook('buildState', () => g.getBuildState());
  registerHook('setBuildState', (s: Partial<ReturnType<Game['getBuildState']>>) => g.setBuildState(s));
  registerHook('usesRealRenderer', () => extras.rendererIsReal());
}
