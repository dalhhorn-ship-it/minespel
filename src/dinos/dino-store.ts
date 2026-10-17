// Dino & egg persistence and live state store (T42, AC12, AC18, AC150, AC152).
// Holds the live dinos and incubating eggs in the world, serializes to/from `kv.dinos`,
// hooks into SaveQueue (`queue.register('dinos', ...)`), and exports `addEgg(kind, golden)`.

import { shopDinoCount } from '../core/economy';
import { createRng, type Rng } from '../core/rng';
import { cleanName } from '../render/name-tag';
import type { Records } from '../storage/records';
import type { SaveQueue } from '../storage/save-queue';
import type { DinosRecord } from '../storage/schema';
import type { World } from '../world/world';
import {
  boxCollides,
  createDino,
  type DinoMode,
  type DinoState,
  type Point,
} from './dino-ai';
import {
  createEgg,
  GROW_SECONDS,
  hatchSpot,
  type EggState,
} from './egg';
import { isDinoKindId, type DinoKindId } from './kinds';

export interface WorldDino extends DinoState {
  id: string;
  name: string;
}

export interface WorldEgg extends EggState {
  id: string;
}

export const EGG_BOX_SIDE = 0.45;
export const EGG_BOX_HEIGHT = 0.65;

/** Finds a free ground spot 1.5 to 2.5 blocks from the player for a new egg (AC12). */
export function findEggSpawnSpot(world: World, player: Point, rng: Rng): Point {
  const baseY = Math.floor(player.y);
  const start = rng.next() * Math.PI * 2;
  const radii = [1.8, 2.2, 1.5, 2.5, 1.2];
  for (const r of radii) {
    for (let i = 0; i < 16; i++) {
      const a = start + (i / 16) * Math.PI * 2;
      const x = player.x + Math.cos(a) * r;
      const z = player.z + Math.sin(a) * r;
      for (const dy of [0, 1, -1, 2, -2, 3, -3]) {
        const y = baseY + dy;
        if (y < 1) continue;
        if (
          !boxCollides(world, x, y, z, EGG_BOX_SIDE, EGG_BOX_HEIGHT) &&
          boxCollides(world, x, y - 0.05, z, EGG_BOX_SIDE, EGG_BOX_HEIGHT)
        ) {
          return { x, y, z };
        }
      }
    }
  }
  return {
    x: player.x + 1.5,
    y: Math.max(1, baseY),
    z: player.z,
  };
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function serializeDino(d: WorldDino): Record<string, unknown> {
  return {
    id: d.id,
    kind: d.kind,
    golden: d.golden,
    name: d.name,
    mode: d.mode,
    x: d.x,
    y: d.y,
    z: d.z,
    heading: d.heading,
    growth: d.growth,
    stayX: d.stayX,
    stayZ: d.stayZ,
  };
}

export function deserializeDino(raw: Record<string, unknown>, idx: number): WorldDino | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind;
  if (!isDinoKindId(kind)) return null;
  const x = num(raw.x, 32.5);
  const y = num(raw.y, 10);
  const z = num(raw.z, 32.5);
  const golden = Boolean(raw.golden);
  const base = createDino({ kind, golden, x, y, z }, true);
  base.mode = raw.mode === 'stay' ? 'stay' : 'follow';
  base.heading = num(raw.heading, 0);
  base.growth = Math.max(0, Math.min(GROW_SECONDS, num(raw.growth, GROW_SECONDS)));
  base.stayX = num(raw.stayX, x);
  base.stayZ = num(raw.stayZ, z);
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `dino-${idx}-${Date.now()}`;
  const name = typeof raw.name === 'string' ? cleanName(raw.name) : '';
  return { ...base, id, name };
}

export function serializeEgg(e: WorldEgg): Record<string, unknown> {
  return {
    id: e.id,
    kind: e.kind,
    golden: e.golden,
    x: e.x,
    y: e.y,
    z: e.z,
    playSeconds: e.playSeconds,
  };
}

export function deserializeEgg(raw: Record<string, unknown>, idx: number): WorldEgg | null {
  if (!raw || typeof raw !== 'object') return null;
  const kind = raw.kind;
  if (!isDinoKindId(kind)) return null;
  const x = num(raw.x, 32.5);
  const y = num(raw.y, 10);
  const z = num(raw.z, 32.5);
  const golden = Boolean(raw.golden);
  const playSeconds = num(raw.playSeconds, 0);
  const base = createEgg(kind, golden, x, y, z, playSeconds);
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `egg-${idx}-${Date.now()}`;
  return { ...base, id };
}

export interface DinoStoreOptions {
  world: World;
  getPlayerSpot: () => Point;
  records?: Records | null;
  queue?: SaveQueue | null;
  rng?: Rng;
}

export interface DinoStore {
  dinos(): readonly WorldDino[];
  eggs(): readonly WorldEgg[];
  getDino(id: string): WorldDino | undefined;
  shopCount(): number;
  toRecord(): DinosRecord;
  restoreFromRecord(raw: DinosRecord | null | undefined): void;
  load(): Promise<void>;
  saveNow(): Promise<void>;
  markDirty(): void;
  /** Creates an egg next to the player in memory and returns it (used by atomic shop transactions). */
  spawnEggInMemory(kind: DinoKindId, golden?: boolean): WorldEgg;
  /** Removes an egg by id in memory (used if an atomic transaction aborts). */
  removeEggInMemory(eggId: string): void;
  /** Spawns an egg next to the player and persists immediately to storage. */
  addEgg(kind: DinoKindId, golden?: boolean): Promise<WorldEgg>;
  /** Spawns live chickens ('kip') next to the player and persists immediately to storage (CR3). */
  deployChicken(count?: number): Promise<WorldDino[]>;
  /** Hatches an egg into a baby dino at the egg's spot. */
  hatchEgg(eggId: string): WorldDino | null;
  setDinoMode(id: string, mode: DinoMode): WorldDino | undefined;
  setDinoName(id: string, name: string): WorldDino | undefined;
  subscribe(listener: () => void): () => void;
  attachPersistence(records: Records, queue?: SaveQueue | null): void;
}

let activeStore: DinoStore | null = null;

/** Registers the active DinoStore so `addEgg(kind, golden)` works across modules (T42, T47, T51a). */
export function setActiveDinoStore(store: DinoStore | null): void {
  activeStore = store;
}

export function getActiveDinoStore(): DinoStore | null {
  return activeStore;
}

/** Spawns a dino egg next to the player and saves it (T42 export for T47 and T51a). */
export async function addEgg(kind: DinoKindId, golden = false): Promise<WorldEgg> {
  if (!activeStore) {
    throw new Error('No active DinoStore initialized');
  }
  return activeStore.addEgg(kind, golden);
}

/** Spawns live chickens next to the player and saves them (CR3). */
export async function deployChicken(count = 1): Promise<WorldDino[]> {
  if (!activeStore) {
    throw new Error('No active DinoStore initialized');
  }
  return activeStore.deployChicken(count);
}

export function createDinoStore(options: DinoStoreOptions): DinoStore {
  const rng = options.rng ?? createRng(0x64696e6f);
  let records: Records | null = options.records ?? null;
  let queue: SaveQueue | null = options.queue ?? null;
  let dinosList: WorldDino[] = [];
  let eggsList: WorldEgg[] = [];
  let nextSeq = 1;
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of [...listeners]) l();
  }

  function toRecord(): DinosRecord {
    return {
      dinos: dinosList.map(serializeDino),
      eggs: eggsList.map(serializeEgg),
    };
  }

  if (queue) {
    queue.register('dinos', toRecord);
  }

  function markDirty() {
    if (queue) {
      queue.markDirty('dinos');
    } else if (records) {
      void records.put('dinos', toRecord());
    }
  }

  async function saveNow(): Promise<void> {
    if (records) {
      await records.put('dinos', toRecord());
    }
    if (queue) {
      await queue.flushNow();
    }
  }

  function spawnEggInMemory(kind: DinoKindId, golden = false): WorldEgg {
    const spot = findEggSpawnSpot(options.world, options.getPlayerSpot(), rng);
    const base = createEgg(kind, golden, spot.x, spot.y, spot.z, 0);
    const egg: WorldEgg = {
      ...base,
      id: `egg-${Date.now()}-${nextSeq++}`,
    };
    eggsList.push(egg);
    notify();
    return egg;
  }

  const store: DinoStore = {
    dinos: () => dinosList,
    eggs: () => eggsList,
    getDino: (id) => dinosList.find((d) => d.id === id),
    shopCount: () => shopDinoCount(dinosList, eggsList),
    toRecord,
    restoreFromRecord(raw) {
      if (!raw || typeof raw !== 'object') {
        dinosList = [];
        eggsList = [];
        notify();
        return;
      }
      dinosList = Array.isArray(raw.dinos)
        ? raw.dinos
            .map((r, i) => deserializeDino(r as Record<string, unknown>, i))
            .filter((d): d is WorldDino => d !== null)
        : [];
      eggsList = Array.isArray(raw.eggs)
        ? raw.eggs
            .map((r, i) => deserializeEgg(r as Record<string, unknown>, i))
            .filter((e): e is WorldEgg => e !== null)
        : [];
      notify();
    },
    async load() {
      if (!records) return;
      const raw = await records.get('dinos');
      store.restoreFromRecord(raw);
    },
    saveNow,
    markDirty,
    spawnEggInMemory,
    removeEggInMemory(eggId) {
      const idx = eggsList.findIndex((e) => e.id === eggId);
      if (idx >= 0) {
        eggsList.splice(idx, 1);
        notify();
      }
    },
    async addEgg(kind, golden = false) {
      const egg = spawnEggInMemory(kind, golden);
      markDirty();
      await saveNow();
      return egg;
    },
    async deployChicken(count = 1) {
      const n = Math.max(1, Math.min(10, Math.floor(count)));
      const spawned: WorldDino[] = [];
      for (let i = 0; i < n; i++) {
        const spot = findEggSpawnSpot(options.world, options.getPlayerSpot(), rng);
        const base = createDino({ kind: 'kip', golden: false, x: spot.x, y: spot.y, z: spot.z }, true);
        const chicken: WorldDino = {
          ...base,
          id: `kip-${Date.now()}-${nextSeq++}`,
          name: '',
        };
        dinosList.push(chicken);
        spawned.push(chicken);
      }
      notify();
      markDirty();
      await saveNow();
      return spawned;
    },
    hatchEgg(eggId) {
      const idx = eggsList.findIndex((e) => e.id === eggId);
      if (idx < 0) return null;
      const [egg] = eggsList.splice(idx, 1);
      if (!egg) return null;
      const spot = hatchSpot(egg);
      const base = createDino(spot, false);
      const dino: WorldDino = {
        ...base,
        id: `dino-${Date.now()}-${nextSeq++}`,
        name: '',
      };
      dinosList.push(dino);
      markDirty();
      void saveNow();
      notify();
      return dino;
    },
    setDinoMode(id, mode) {
      const d = dinosList.find((item) => item.id === id);
      if (!d) return undefined;
      d.mode = mode;
      if (mode === 'stay') {
        d.stayX = d.x;
        d.stayZ = d.z;
      }
      markDirty();
      void saveNow();
      notify();
      return d;
    },
    setDinoName(id, name) {
      const d = dinosList.find((item) => item.id === id);
      if (!d) return undefined;
      d.name = cleanName(name);
      markDirty();
      void saveNow();
      notify();
      return d;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    attachPersistence(nextRecords, nextQueue) {
      records = nextRecords;
      queue = nextQueue ?? null;
      if (queue) {
        queue.register('dinos', toRecord);
      }
    },
  };

  setActiveDinoStore(store);
  return store;
}
