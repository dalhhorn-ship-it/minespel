// The stones flow (v20): which vein stones the kid found and bought. SKELETON from V19a: `load`, `state`,
// `isBought`, `markBought` and the hook `stonesState` work, `onMined` is an empty body until V20b fills in the found
// rule. Stones live in `monsters.stones` (optional, left out of the defaults), read only through `readStones`.
import { registerHook } from '../dev/e2e-hooks';
import type { Game } from '../game/game';
import type { MonstersRecord } from '../storage/schema';

export interface StonesState {
  found: number[];
  bought: number[];
}

/** The vein block ids of the stones (decision 142: 43 to 50). V20a's `stones.ts` holds the table. */
const FIRST_STONE = 43;
const LAST_STONE = 50;

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
  /** The block of the untouched start world at a cell, for `veinCells` (V20b). */
  startBlock: (x: number, y: number, z: number) => number;
}

export interface StonesFlow {
  /** Takes the stones of a loaded `monsters` record and tells the game. */
  load(m: { stones?: unknown }): void;
  state(): StonesState;
  isBought(id: number): boolean;
  /** The economy calls it after the commit: the stone is bought now. */
  markBought(id: number): void;
  /** The kid mined a block (`world.on('mined')`). V20b: the first mine of a stone vein marks it found. */
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
    onMined() {},
  };

  if (__E2E__) registerHook('stonesState', () => flow.state());

  return flow;
}
