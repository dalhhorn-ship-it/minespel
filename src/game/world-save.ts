// Saves and restores the world (changed blocks) and the player (spot, look, hotbar, mode).
// v15: an old save is moved into the big world at boot by `world-move-store.ts` before this runs; restore only
// reads records that are already terrain version 3. The v1 village stamp lives in `world-move.ts` now.
import { registerHook } from '../dev/e2e-hooks';
import type { SaveQueue } from '../storage/save-queue';
import type { Records } from '../storage/records';
import type { PlayerRecord, WorldRecord } from '../storage/schema';
import { isPlaceable } from '../world/blocks';
import { isSolid } from '../world/blocks';
import { CELL_COUNT, CURRENT_TERRAIN_VERSION, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { VILLAGE_SITES, houseCells, siteHasHouses, siteRegion } from '../world/village-layout';
import { HOTBAR_SIZE } from './build-controller';
import type { Game } from './game';

export interface WorldSaveOptions {
  game: Game;
  queue: SaveQueue;
  records: Records;
  /** Test seams. */
  doc?: Document;
  win?: Window;
  /** How often the player's spot is compared with the saved one. Default 1000 ms. */
  pollMs?: number;
  /**
   * False when the boot move of an old save failed (v15). Then `restore()` throws at once, so `bootSave` plays the
   * start world without saving and the next start tries the move again. Default true.
   */
  moved?: boolean;
}

export interface WorldSave {
  /** Loads the saved world and player into the game. Never throws: a bad save is ignored. */
  restore(): Promise<void>;
  /** Starts watching for changes. Returns a stop function. */
  start(): () => void;
  /** A restore that is still waiting will not touch the game any more. */
  cancel(): void;
}

export interface BootSaveOptions {
  game: Pick<Game, 'pause' | 'resume'>;
  /** Opens the storage and builds the save. May hang or throw. */
  create: () => Promise<WorldSave>;
  /** After this long the kid plays without saving. Default 3000 ms. */
  timeoutMs?: number;
  /** True when someone else asked for a pause meanwhile. Then no resume. */
  wantsPause?: () => boolean;
}

/**
 * Keeps the game paused while the saved world loads, so nothing the kid does is wiped by the restore.
 * If storage is slow, broken or hangs, the game starts anyway and does NOT save (so a save that could not be read is never overwritten).
 */
export async function bootSave(options: BootSaveOptions): Promise<'saving' | 'not-saving'> {
  const { game } = options;
  const timeoutMs = options.timeoutMs ?? 3000;
  game.pause();
  let result: 'saving' | 'not-saving' = 'not-saving';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let save: WorldSave | null = null;
  let timedOut = false;
  try {
    const load = (async () => {
      save = await options.create();
      await save.restore();
    })();
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve();
      }, timeoutMs);
    });
    await Promise.race([load, timeout]);
    if (timedOut) {
      (save as WorldSave | null)?.cancel();
      load.catch(() => {});
    } else {
      (save as unknown as WorldSave).start();
      result = 'saving';
    }
  } catch {
    /* no storage: play without saving */
  } finally {
    clearTimeout(timer);
    if (!options.wantsPause?.()) game.resume();
  }
  return result;
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Keeps only valid entries of a saved diff. Works for typed arrays from any realm. */
export function cleanDiff(raw: unknown, cellCount: number = CELL_COUNT): number[] {
  if (!(ArrayBuffer.isView(raw) || Array.isArray(raw))) return [];
  const out: number[] = [];
  for (const e of Array.from(raw as ArrayLike<number>)) {
    if (!Number.isInteger(e) || e < 0) continue;
    if (Math.floor(e / 256) >= cellCount) continue;
    out.push(e);
  }
  return out;
}

export function createWorldSave(options: WorldSaveOptions): WorldSave {
  const { game, queue, records } = options;
  const doc = options.doc ?? document;
  const win = options.win ?? window;
  const pollMs = options.pollMs ?? 1000;

  function readPlayer(): PlayerRecord {
    const p = game.player.player;
    const b = game.getBuildState();
    return {
      x: p.x, y: p.y, z: p.z,
      yaw: game.player.yaw, pitch: game.player.pitch,
      hotbar: [...b.hotbar], selectedSlot: b.selected,
      mode: b.mode === 'bouwen' ? 'build' : 'mine',
    };
  }

  queue.register('world', (): WorldRecord => ({ diff: game.world.diff(), terrainVersion: CURRENT_TERRAIN_VERSION }));
  queue.register('player', readPlayer);
  game.dinoStore?.attachPersistence(records, queue);

  function restoreWorld(raw: unknown): void {
    const diff = cleanDiff((raw as { diff?: unknown } | null)?.diff);
    if (diff.length === 0) return;
    game.world.applyDiff(diff);
    game.renderer.setWorld(game.world);
  }

  function restorePlayer(r: PlayerRecord): void {
    const hotbarOk = Array.isArray(r.hotbar) && r.hotbar.length === HOTBAR_SIZE && r.hotbar.every((b) => Number.isInteger(b) && isPlaceable(b));
    game.setBuildState({
      ...(hotbarOk ? { hotbar: r.hotbar } : {}),
      ...(r.mode === 'build' ? { mode: 'bouwen' as const } : r.mode === 'mine' ? { mode: 'hakken' as const } : {}),
      ...(hotbarOk && Number.isInteger(r.selectedSlot) ? { selected: r.selectedSlot } : {}),
    });
    // The empty default has y = 0. A real save always stands above the floor.
    const inside = isNum(r.x) && isNum(r.y) && isNum(r.z) && r.x >= 0 && r.x < WORLD_SIZE && r.z >= 0 && r.z < WORLD_SIZE && r.y > 0 && r.y < WORLD_HEIGHT;
    // AC237: never inside a solid block (feet or head), the start spot is used instead.
    const free = inside && !isSolid(game.world.get(Math.floor(r.x), Math.floor(r.y), Math.floor(r.z))) &&
      !isSolid(game.world.get(Math.floor(r.x), Math.floor(r.y + 1), Math.floor(r.z)));
    if (free) {
      const p = game.player.player;
      p.x = r.x; p.y = r.y; p.z = r.z; p.vy = 0; p.onGround = false;
      if (isNum(r.yaw)) game.player.yaw = r.yaw;
      if (isNum(r.pitch)) game.player.pitch = Math.max(-1.5, Math.min(1.5, r.pitch));
    }
  }

  let cancelled = false;

  async function restore(): Promise<void> {
    try {
      // The kept 0.4.0 copy is not written any more and is removed when a save opens (AC194).
      if ((await records.get('worldV1')) !== null) await records.put('worldV1', null);
    } catch {
      /* the copy stays: harmless, nothing reads it */
    }
    // A failed move, or a world record that is not version 3: never read an old diff into the big world.
    if (options.moved === false) throw new Error('the old save was not moved');
    let raw: unknown;
    try {
      raw = await records.get('world');
    } catch {
      raw = null; // a record that cannot be read: play on in the start world
    }
    if (cancelled) return;
    if (raw !== null) {
      const version = (raw as { terrainVersion?: unknown }).terrainVersion;
      if (version !== CURRENT_TERRAIN_VERSION) throw new Error('the world record is not terrain version 3');
      restoreWorld(raw);
    }
    try {
      const raw = await records.get('player');
      if (cancelled) return;
      restorePlayer(raw);
    } catch {
      /* a broken player record: start at home */
    }
    try {
      if (cancelled) return;
      await game.dinoStore?.load();
      if (!cancelled && game.dinoStore) {
        game.renderer.syncDinos?.(game.dinoStore.dinos(), game.dinoStore.eggs());
      }
    } catch {
      /* broken dinos record: start with no dinos */
    }
  }

  function start(): () => void {
    const off = game.on('changed', (e) => queue.markDirty(e.kind === 'world' ? 'world' : 'player'));
    let last = '';
    const signature = () => {
      const p = game.player.player;
      return [p.x, p.y, p.z, game.player.yaw, game.player.pitch].map((n) => n.toFixed(2)).join(',');
    };
    last = signature();
    const timer = setInterval(() => {
      const s = signature();
      if (s !== last) {
        last = s;
        queue.markDirty('player');
      }
    }, pollMs);
    // Listeners are added in this order: first mark the spot dirty, then the queue flushes (not after a simulated kill).
    const onHide = () => {
      queue.markDirty('player');
      if (game.dinoStore && (game.dinoStore.dinos().length > 0 || game.dinoStore.eggs().length > 0)) {
        queue.markDirty('dinos');
      }
    };
    doc.addEventListener('visibilitychange', onHide);
    win.addEventListener('pagehide', onHide);
    const detach = queue.attachPageListeners(doc, win);
    return () => {
      off();
      clearInterval(timer);
      doc.removeEventListener('visibilitychange', onHide);
      win.removeEventListener('pagehide', onHide);
      detach();
    };
  }

  if (__E2E__) {
    registerHook('terrainVersion', async () => {
      const raw = await records.get('world');
      return typeof raw.terrainVersion === 'number' ? raw.terrainVersion : 1;
    });
    registerHook('hasWorldV1', async () => (await records.get('worldV1')) !== null);
    registerHook('villageSites', () =>
      VILLAGE_SITES.map((site) => ({
        id: site.id,
        rect: { x0: site.x0, z0: site.z0, x1: site.x1, z1: site.z1 },
        region: siteRegion(site),
        padY: site.padY,
        homes: site.homes.map((h) => ({ ...h })),
        houseCells: houseCells(site),
        hasHouses: siteHasHouses((x, y, z) => game.world.get(x, y, z), site),
      })),
    );
  }

  return { restore, start, cancel: () => { cancelled = true; } };
}
