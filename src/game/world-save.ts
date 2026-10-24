// Saves and restores the world (changed blocks) and the player (spot, look, hotbar, mode).
// v11: a world saved by 0.4.0 or earlier (terrain version 1) gets the villages stamped in once,
// only at sites the kid did not change and where nobody stands (AC179).
import { registerHook } from '../dev/e2e-hooks';
import type { SaveQueue } from '../storage/save-queue';
import type { Records } from '../storage/records';
import type { PlayerRecord, WorldRecord } from '../storage/schema';
import { isPlaceable } from '../world/blocks';
import {
  CELL_COUNT, CURRENT_TERRAIN_VERSION, WORLD_HEIGHT, WORLD_SEED, WORLD_SIZE, cellIndex, generateTerrain,
} from '../world/terrain';
import { VILLAGE_SITES, houseCells, siteHasHouses, siteRegion, type VillageSite } from '../world/village-layout';
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
export function cleanDiff(raw: unknown): number[] {
  if (!(ArrayBuffer.isView(raw) || Array.isArray(raw))) return [];
  const out: number[] = [];
  for (const e of Array.from(raw as ArrayLike<number>)) {
    if (!Number.isInteger(e) || e < 0) continue;
    if (Math.floor(e / 256) >= CELL_COUNT) continue;
    out.push(e);
  }
  return out;
}

/** A spot where the player, a dino, an egg or a chicken stands (only x and z matter). */
export interface StandingSpot {
  x: number;
  z: number;
}

/** Bodies are up to about 2 blocks long, so a spot this close to a site also blocks it. */
export const STANDING_SLACK = 2;

export interface VillageUpgrade {
  /** The new diff against terrain version 2. */
  diff: number[];
  /** Per site in VILLAGE_SITES order: true when its houses were stamped in. */
  stamped: boolean[];
}

/** True when the old diff (against version 1) has any cell in the site, at any height, or someone stands in or next to it. */
export function siteBlocked(site: VillageSite, oldDiff: readonly number[], standing: readonly StandingSpot[]): boolean {
  const r = siteRegion(site);
  for (const e of oldDiff) {
    const index = Math.floor(e / 256);
    const x = index % WORLD_SIZE;
    const z = Math.floor(index / WORLD_SIZE) % WORLD_SIZE;
    if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
  }
  return standing.some(
    (p) => p.x >= r.x0 - STANDING_SLACK && p.x < r.x1 + 1 + STANDING_SLACK && p.z >= r.z0 - STANDING_SLACK && p.z < r.z1 + 1 + STANDING_SLACK,
  );
}

/**
 * Pure. Rebuilds the kid's real world (version 1 terrain plus the old diff), puts the village of every
 * site that is not blocked into it, and returns the diff of that world against version 2.
 * Cells outside the sites and every cell of a blocked site stay exactly as they were.
 * `stamp: false` keeps every site as it was (used when the copy of the old record cannot be written).
 */
export function upgradeV1World(
  oldDiff: readonly number[],
  standing: readonly StandingSpot[],
  options: { seed?: number; stamp?: boolean } = {},
): VillageUpgrade {
  const seed = options.seed ?? WORLD_SEED;
  const real = generateTerrain(seed, 1);
  for (const e of oldDiff) {
    const index = Math.floor(e / 256);
    if (index >= 0 && index < CELL_COUNT) real[index] = e % 256;
  }
  const v2 = generateTerrain(seed, 2);
  const stamped = VILLAGE_SITES.map((site) => options.stamp !== false && !siteBlocked(site, oldDiff, standing));
  VILLAGE_SITES.forEach((site, k) => {
    if (!stamped[k]) return;
    const r = siteRegion(site);
    for (let z = Math.max(0, r.z0); z <= Math.min(WORLD_SIZE - 1, r.z1); z++) {
      for (let x = Math.max(0, r.x0); x <= Math.min(WORLD_SIZE - 1, r.x1); x++) {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const i = cellIndex(x, y, z);
          real[i] = v2[i] ?? 0;
        }
      }
    }
  });
  const diff: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const b = real[i] ?? 0;
    if (b !== v2[i]) diff.push(i * 256 + b);
  }
  return { diff, stamped };
}

/** The spots of the saved player, dinos, eggs and chickens. Anything broken is left out. */
export function standingSpots(player: unknown, dinos: unknown): StandingSpot[] {
  const out: StandingSpot[] = [];
  const p = player as Partial<PlayerRecord> | null;
  if (p && isNum(p.x) && isNum(p.y) && isNum(p.z) && p.y > 0) out.push({ x: p.x, z: p.z });
  const d = dinos as { dinos?: unknown; eggs?: unknown } | null;
  for (const list of [d?.dinos, d?.eggs]) {
    if (!Array.isArray(list)) continue;
    for (const e of list as { x?: unknown; z?: unknown }[]) {
      if (e && isNum(e.x) && isNum(e.z)) out.push({ x: e.x, z: e.z });
    }
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

  /**
   * Once per save: a version 1 world gets the villages. The old record is copied to worldV1 first, then the
   * new world record is written. A kill in between leaves the old record in `world`, so the next start does
   * the same stamp again. If the writes fail, the kid gets the old world exactly, without new houses.
   */
  async function upgradeWorld(raw: unknown): Promise<void> {
    const oldDiff = cleanDiff((raw as { diff?: unknown } | null)?.diff);
    let player: unknown = null;
    let dinos: unknown = null;
    try { player = await records.get('player'); } catch { /* broken: the player starts at home, outside every site */ }
    try { dinos = await records.get('dinos'); } catch { /* broken: no dinos are loaded */ }
    if (cancelled) return;
    const standing = standingSpots(player, dinos);
    let result = upgradeV1World(oldDiff, standing);
    try {
      await records.put('worldV1', raw as WorldRecord);
      await records.put('world', { diff: Uint32Array.from(result.diff), terrainVersion: CURRENT_TERRAIN_VERSION });
    } catch {
      result = upgradeV1World(oldDiff, standing, { stamp: false });
    }
    if (cancelled) return;
    game.world.applyDiff(result.diff);
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
    if (inside) {
      const p = game.player.player;
      p.x = r.x; p.y = r.y; p.z = r.z; p.vy = 0; p.onGround = false;
      if (isNum(r.yaw)) game.player.yaw = r.yaw;
      if (isNum(r.pitch)) game.player.pitch = Math.max(-1.5, Math.min(1.5, r.pitch));
    }
  }

  let cancelled = false;

  async function restore(): Promise<void> {
    try {
      const raw = await records.get('world');
      if (cancelled) return;
      const version = (raw as { terrainVersion?: unknown } | null)?.terrainVersion;
      if (typeof version === 'number' && version >= CURRENT_TERRAIN_VERSION) restoreWorld(raw);
      else await upgradeWorld(raw);
    } catch {
      /* a broken world record: play on in the start world */
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
