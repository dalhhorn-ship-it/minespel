// The boot time move of an old save (v15, decision 138): ONE readwrite transaction on `kv`.
// A kill or an error before the commit leaves every old record as it was; the next start moves it again.
import { moveRecords } from '../game/world-move';
import { request, transact } from './db';

export type MoveResult = 'none' | 'new' | 'moved' | 'failed';

export interface MoveOptions {
  /** Runs after every put, still inside the transaction. A throw aborts everything (the kill test). */
  afterPut?: () => void;
}

const missing = (v: unknown): boolean => v === undefined || v === null;

/**
 * Decides what the stored save is and moves it.
 * A `world` record with terrain version 3 is done: 'none'. No `world` and none of `player`, `dinos`, `economy` is a
 * new install: a version 3 world record is written at once so a later open never takes its player for an old one: 'new'.
 * Anything else is an old save: world, player, dinos and monsters move together: 'moved'. Any error: 'failed'.
 */
export async function moveOldSave(db: IDBDatabase, options: MoveOptions = {}): Promise<MoveResult> {
  const kill = options.afterPut ?? (__E2E__ ? e2eKill : undefined);
  try {
    return await transact(db, 'kv', 'readwrite', async (tx): Promise<MoveResult> => {
      const kv = tx.objectStore('kv');
      const read = (key: string) => request<unknown>(kv.get(key));
      const world = await read('world');
      const version = (world as { terrainVersion?: unknown } | null | undefined)?.terrainVersion;
      if (typeof version === 'number' && version >= 3) return 'none';
      const player = await read('player');
      const dinos = await read('dinos');
      const economy = await read('economy');
      const monsters = await read('monsters');
      if (missing(world) && missing(player) && missing(dinos) && missing(economy)) {
        await request(kv.put({ diff: new Uint32Array(0), terrainVersion: 3 }, 'world'));
        kill?.();
        return 'new';
      }
      const moved = moveRecords({ world: missing(world) ? undefined : world, player, dinos, monsters });
      await request(kv.put(moved.world, 'world'));
      if (!missing(player)) await request(kv.put(moved.player, 'player'));
      if (!missing(dinos)) await request(kv.put(moved.dinos, 'dinos'));
      if (!missing(monsters)) await request(kv.put(moved.monsters, 'monsters'));
      kill?.();
      return 'moved';
    });
  } catch {
    return 'failed';
  }
}

/** E2E builds only: `window.__e2eMoveKill === true` makes the move throw after its puts, like a kill halfway. */
function e2eKill(): void {
  if ((window as unknown as { __e2eMoveKill?: unknown }).__e2eMoveKill === true) throw new Error('simulated kill');
}
