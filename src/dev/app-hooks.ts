// Test hooks for the whole app (e2e build only). main.ts calls registerAppHooks inside `if (__E2E__)`,
// so Vite drops this file from the production build. Hook names and return values are used by tests/e2e.
import type { App } from '../app/boot';
import type { AudioUnlock } from '../platform/audio-unlock';
import type { ScreenGuard } from '../platform/screen-guard';
import { systemClock, today } from '../core/clock';
import type { WorldDino } from '../dinos/dino-store';
import type { DinoKindId } from '../dinos/kinds';
import type { Game } from '../game/game';
import { openDb } from '../storage/db';
import { createLogStore } from '../storage/log-store';
import { registerHook } from './e2e-hooks';

/** What the hooks need from main.ts: its small shell state and a few of its functions. */
export interface AppHookShell {
  guard: ScreenGuard;
  audio: AudioUnlock;
  /** Resolves when boot is done; the hooks that need flows wait for it. */
  ready: Promise<void>;
  isRestored(): boolean;
  openPauseMenu(): Promise<void>;
  openDinoMenu(dino: WorldDino): void;
  setUserPaused(paused: boolean): void;
  teleportedCount(): number;
  usesRealRenderer(): boolean;
}

export function registerAppHooks(app: Promise<App>, game: Game | null, shell: AppHookShell): void {
  // Before boot, or when storage failed, these hooks do nothing, as they did when the App was a nullable variable.
  const withApp = async <T>(fn: (a: App) => T | Promise<T>): Promise<T | undefined> => {
    let a: App;
    try {
      a = await app;
    } catch {
      return undefined;
    }
    return fn(a);
  };
  const readLog = async <T>(list: (store: ReturnType<typeof createLogStore>) => Promise<T[]>) => {
    try {
      await app;
    } catch {
      return [];
    }
    const db = await openDb();
    const rows = await list(createLogStore(db));
    db.close();
    return rows;
  };

  registerHook('ready', () => shell.isRestored());
  registerHook('screenGuard', () => shell.guard.state());
  registerHook('audioUnlocked', () => shell.audio.isUnlocked());
  registerHook('openPauseMenu', () => shell.openPauseMenu());
  // Tests call these after the save loaded, which can be before the ready gate on a slow machine (the save
  // gives up after 3 s). Waiting for the gate keeps these hooks free of the waiting card.
  registerHook('openParentControls', async () => {
    await shell.ready;
    await (await app).parentFlow.open();
  });
  registerHook('openPractice', async () => {
    await shell.ready;
    (await app).practiceFlow.open();
  });
  registerHook('points', async () => {
    return (await withApp(async (a) => (await a.records.get('economy')).points)) ?? 0;
  });
  registerHook('setPoints', async (pts: number) => {
    await withApp((a) => a.records.update('economy', (e) => ({ ...e, points: pts })));
  });
  registerHook('setPracticeUsed', async (n: number) => {
    await withApp((a) =>
      a.records.update('economy', (e) => ({ ...e, practicePointsToday: n, practiceDay: today(systemClock) })),
    );
  });
  registerHook('breaksLog', () => readLog((s) => s.listBreaks()));
  registerHook('answersLog', () => readLog((s) => s.listAnswers()));
  registerHook('ledgerLog', () => readLog((s) => s.listLedger()));
  // Voortgang e2e (decision 115): writes answers straight into the log, as a finished break would.
  registerHook('logAnswers', async (rows: Parameters<ReturnType<typeof createLogStore>['appendAnswer']>[0][]) => {
    await app;
    const db = await openDb();
    const store = createLogStore(db);
    for (const r of rows) await store.appendAnswer(r);
    db.close();
  });

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
    shell.setUserPaused(true);
    g.pause();
  });
  registerHook('resumeGame', () => shell.setUserPaused(false));
  registerHook('teleportHome', () => g.teleportHome());
  registerHook('teleportedCount', () => shell.teleportedCount());
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
  registerHook('setDinoMode', (id: string, mode: 'follow' | 'stay') => g.dinoStore.setDinoMode(id, mode));
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
    if (d) shell.openDinoMenu(d);
  });
  // Test blocks are set straight in the world, so they tell the save queue themselves.
  registerHook('markWorldDirty', () => withApp((a) => a.queue.markDirty('world')));
  registerHook('flushSave', () => withApp((a) => a.queue.flushNow()));
  registerHook('resetWorld', () => g.resetWorld());
  registerHook('buildState', () => g.getBuildState());
  registerHook('setBuildState', (s: Partial<ReturnType<Game['getBuildState']>>) => g.setBuildState(s));
  registerHook('usesRealRenderer', () => shell.usesRealRenderer());
}
