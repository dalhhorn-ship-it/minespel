// Saves and restores the world (changed blocks) and the player (spot, look, hotbar, mode).
import type { SaveQueue } from '../storage/save-queue';
import type { Records } from '../storage/records';
import type { PlayerRecord } from '../storage/schema';
import { isPlaceable } from '../world/blocks';
import { CELL_COUNT, WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
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

  queue.register('world', () => ({ diff: game.world.diff() }));
  queue.register('player', readPlayer);

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
    if (inside) {
      const p = game.player.player;
      p.x = r.x; p.y = r.y; p.z = r.z; p.vy = 0; p.onGround = false;
      if (isNum(r.yaw)) game.player.yaw = r.yaw;
      if (isNum(r.pitch)) game.player.pitch = Math.max(-1.5, Math.min(1.5, r.pitch));
    }
  }

  async function restore(): Promise<void> {
    try {
      restoreWorld(await records.get('world'));
    } catch {
      /* a broken world record: play on in the start world */
    }
    try {
      restorePlayer(await records.get('player'));
    } catch {
      /* a broken player record: start at home */
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
    const onHide = () => queue.markDirty('player');
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

  return { restore, start };
}
