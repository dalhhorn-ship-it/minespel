// The stones flow (v20): which vein stones the kid found and bought. SKELETON from V19a: `load`, `state`,
// `isBought`, `markBought` and the hook `stonesState` work, `onMined` is an empty body until V20b fills in the found
// rule. Stones live in `monsters.stones` (optional, left out of the defaults), read only through `readStones`.
import { registerHook } from '../dev/e2e-hooks';
import type { Game } from '../game/game';
import { updateMonsters } from '../storage/monsters-store';
import type { MonstersRecord } from '../storage/schema';
import { WORLD_SIZE } from '../world/terrain';
import { STONE_IDS, stoneById } from '../world/stones';

export interface StonesState {
  found: number[];
  bought: number[];
}

const FIRST_STONE = STONE_IDS[0]!;
const LAST_STONE = STONE_IDS[STONE_IDS.length - 1]!;

/** The stones of a `monsters` record. Empty for a missing field; drops anything that is not a stone id, and a bought stone that was not found. */
export function readStones(m: { stones?: unknown }): StonesState {
  const raw = m.stones;
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return { found: [], bought: [] };
  const clean = (v: unknown): number[] => {
    if (!Array.isArray(v)) return [];
    const ids = v.filter((n): n is number => Number.isInteger(n) && n >= FIRST_STONE && n <= LAST_STONE);
    return [...new Set(ids)].sort((a, b) => a - b);
  };
  const found = clean((raw as { found?: unknown }).found);
  const bought = clean((raw as { bought?: unknown }).bought).filter((id) => found.includes(id));
  return { found, bought };
}

export interface StonesFlowOptions {
  db: IDBDatabase;
  say: (text: string) => void;
  game: Pick<Game, 'setStones'>;
  /** The block of the untouched start world at a cell, for the hook `veinCells`. */
  startBlock: (x: number, y: number, z: number) => number;
}

export interface StonesFlow {
  /** Takes the stones of a loaded `monsters` record and tells the game. */
  load(m: { stones?: unknown }): void;
  state(): StonesState;
  isBought(id: number): boolean;
  /** The economy calls it after the commit: the stone is bought now. */
  markBought(id: number): void;
  /** The kid mined a block (`world.on('mined')`). The first mine of a stone vein marks it found, says so and saves it. */
  onMined(x: number, y: number, z: number, block: number): void;
}

export function createStonesFlow(options: StonesFlowOptions): StonesFlow {
  let current: StonesState = { found: [], bought: [] };
  const tell = () => options.game.setStones([...current.found], [...current.bought]);

  const flow: StonesFlow = {
    load(m) {
      current = readStones(m as Pick<MonstersRecord, 'stones'>);
      tell();
    },
    state: () => ({ found: [...current.found], bought: [...current.bought] }),
    isBought: (id) => current.bought.includes(id),
    markBought(id) {
      if (current.bought.includes(id)) return;
      current = {
        found: current.found.includes(id) ? current.found : [...current.found, id].sort((a, b) => a - b),
        bought: [...current.bought, id].sort((a, b) => a - b),
      };
      tell();
    },
    onMined(_x, _y, _z, block) {
      // Never looks at a monster switch (AC272): finding a stone is part of Hakken.
      if (!STONE_IDS.includes(block) || current.found.includes(block)) return;
      current = { found: [...current.found, block].sort((a, b) => a - b), bought: current.bought };
      tell();
      options.say(`Je hebt ${stoneById(block)?.name ?? 'een steen'} ontdekt!`);
      void updateMonsters(options.db, (m) => {
        const stored = readStones(m);
        const found = [...new Set([...stored.found, block])].sort((a, b) => a - b);
        return { ...m, stones: { found, bought: stored.bought } };
      }).catch(() => {});
    },
  };

  if (__E2E__) {
    registerHook('stonesState', () => flow.state());
    // The cells of one stone in the start world (y 1 to 4, under the stripes), as [x, y, z].
    registerHook('veinCells', (id: number) => {
      const cells: Array<[number, number, number]> = [];
      for (let y = 1; y <= 4; y++)
        for (let z = 0; z < WORLD_SIZE; z++)
          for (let x = 0; x < WORLD_SIZE; x++) if (options.startBlock(x, y, z) === id) cells.push([x, y, z]);
      return cells;
    });
  }

  return flow;
}
