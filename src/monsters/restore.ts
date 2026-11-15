// Bringing every nibbled block back (v18 V18b, AC217). One cell at a time, spread over about 2 seconds; a cell with
// the kid, an animal, a knight or Klodder in it waits and retries; a cell the kid built in is dropped (the kid's block
// stays, `World.set` already cleared the overlay).
import type { Box } from '../world/build';
import { boxesOverlap, cellBox } from './nibble';
import type { MonsterContext } from './monster-types';

/** The whole restore takes about this long. */
export const RESTORE_TOTAL_MS = 2000;
/** The longest gap between two cells. */
export const RESTORE_MAX_GAP_MS = 150;
/** A blocked cell is asked again after this long (a bit under the 1000 ms of the AC, so it is back in time). */
export const RESTORE_RETRY_MS = 500;

interface Pending {
  x: number;
  y: number;
  z: number;
  waitMs: number;
}

export interface Restore {
  pending: Pending[];
  emitMs: number;
  intervalMs: number;
}

/** Starts a restore of every hidden cell now. */
export function startRestore(ctx: Pick<MonsterContext, 'world'>): Restore {
  const cells = ctx.world.hiddenCells();
  return {
    pending: cells.map((c) => ({ ...c, waitMs: 0 })),
    emitMs: 0,
    intervalMs: Math.min(RESTORE_MAX_GAP_MS, RESTORE_TOTAL_MS / Math.max(1, cells.length)),
  };
}

/**
 * One step of loop time. `extra` are boxes that also block a cell (Klodder himself). Returns true when nothing is
 * left to restore.
 */
export function stepRestore(r: Restore, ctx: MonsterContext, extra: readonly Box[] = []): boolean {
  const ms = ctx.dt * 1000;
  for (const p of r.pending) p.waitMs = Math.max(0, p.waitMs - ms);
  r.emitMs += ms;
  while (r.pending.length > 0 && r.emitMs >= r.intervalMs) {
    // Drop cells the kid built in.
    r.pending = r.pending.filter((p) => ctx.world.isHidden(p.x, p.y, p.z));
    const i = r.pending.findIndex((p) => p.waitMs <= 0);
    if (i < 0) {
      r.emitMs = Math.min(r.emitMs, r.intervalMs);
      break;
    }
    r.emitMs -= r.intervalMs;
    const p = r.pending[i]!;
    const box = cellBox(p.x, p.y, p.z);
    if (boxesOverlap(box, ctx.kidBox) || ctx.occupied(box) || extra.some((b) => boxesOverlap(box, b))) {
      p.waitMs = RESTORE_RETRY_MS;
      continue;
    }
    ctx.world.unhide(p.x, p.y, p.z);
    ctx.touch(p.x, p.z);
    r.pending.splice(i, 1);
  }
  r.pending = r.pending.filter((p) => ctx.world.isHidden(p.x, p.y, p.z));
  return r.pending.length === 0;
}
