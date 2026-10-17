// The dinos and eggs of the kid, as plain data. No DOM, no three.js, no database.
// The game steps them (dino-system), the renderer draws them (dino-render), the save queue
// writes `toRecord()` to the `dinos` record. Dinos and eggs are only ever removed by `clear()`
// and `load()`, which the full reset paths use (AC152).
import { WORLD_SIZE } from '../world/terrain';
import type { DinosRecord } from '../storage/schema';
import { createDino, type DinoMode, type DinoState } from './dino-ai';
import { GROW_SECONDS, createEgg, hatchSpot, type EggState } from './egg';
import { isDinoKindId, type DinoKindId } from './kinds';

export const NAME_MAX = 12;
/** A save with more than this many of each is cut (a broken or hostile backup). */
const MAX_LOADED = 200;

export interface DinoEntry {
  id: number;
  name: string;
  state: DinoState;
}

export interface EggEntry {
  id: number;
  egg: EggState;
}

export interface DinoStore {
  readonly dinos: DinoEntry[];
  readonly eggs: EggEntry[];
  /** A new egg. It gets its place next to the player at the next game step. */
  addEgg(kind: DinoKindId, golden?: boolean): EggEntry;
  /** Takes an egg back out. Only the purchase uses it, when its commit failed. Null when the egg is not there. */
  removeEgg(eggId: number): boolean;
  /** Turns an egg into a baby dino at the same spot. Null when the egg is not there. */
  hatch(eggId: number): DinoEntry | null;
  findDino(id: number): DinoEntry | undefined;
  rename(id: number, name: string): void;
  setMode(id: number, mode: DinoMode): void;
  /** Tells the listeners that something worth saving changed. */
  touch(): void;
  /** Listener runs on every change worth saving. Returns a remover. */
  subscribe(listener: () => void): () => void;
  /** What the save queue writes. */
  toRecord(): DinosRecord;
  /** Replaces everything with a saved record. Bad entries are fixed or skipped, never thrown on. */
  load(raw: unknown): void;
  /** Removes everything. Only the full reset paths call this. */
  clear(): void;
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const orNull = (v: number): number | null => (Number.isFinite(v) ? v : null);

/** Trims to 12 characters. Which characters are allowed is the keyboard's job. */
export function cleanDinoName(name: unknown): string {
  if (typeof name !== 'string') return '';
  return Array.from(name.replace(/\s+/g, ' ').trim()).slice(0, NAME_MAX).join('');
}

/** Free of the world: a position the system has not placed yet is NaN. */
export function isPlaced(p: { x: number; y: number; z: number }): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
}

function inWorld(x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < WORLD_SIZE && z < WORLD_SIZE;
}

export function createDinoStore(): DinoStore {
  const dinos: DinoEntry[] = [];
  const eggs: EggEntry[] = [];
  const listeners = new Set<() => void>();
  let nextId = 1;

  const touch = () => {
    for (const l of [...listeners]) l();
  };
  const takeId = () => nextId++;

  function dinoFromRaw(raw: unknown): DinoEntry | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (!isDinoKindId(r.kind)) return null;
    const x = num(r.x, NaN), y = num(r.y, NaN), z = num(r.z, NaN);
    const ok = inWorld(x, z) && y >= 0;
    const state = createDino({ kind: r.kind, golden: r.golden === true, x: ok ? x : NaN, y: ok ? y : NaN, z: ok ? z : NaN });
    state.growth = Math.min(GROW_SECONDS, Math.max(0, num(r.growth, GROW_SECONDS)));
    state.mode = r.mode === 'stay' ? 'stay' : 'follow';
    state.stayX = num(r.stayX, state.x);
    state.stayZ = num(r.stayZ, state.z);
    return { id: 0, name: cleanDinoName(r.name), state };
  }

  function eggFromRaw(raw: unknown): EggEntry | null {
    if (typeof raw !== 'object' || raw === null) return null;
    const r = raw as Record<string, unknown>;
    if (!isDinoKindId(r.kind)) return null;
    const x = num(r.x, NaN), y = num(r.y, NaN), z = num(r.z, NaN);
    const ok = inWorld(x, z) && y >= 0;
    const egg = createEgg(r.kind, r.golden === true, ok ? x : NaN, ok ? y : NaN, ok ? z : NaN, num(r.playSeconds, 0));
    return { id: 0, egg };
  }

  return {
    dinos,
    eggs,
    addEgg(kind, golden = false) {
      const entry: EggEntry = { id: takeId(), egg: createEgg(kind, golden, NaN, NaN, NaN) };
      eggs.push(entry);
      touch();
      return entry;
    },
    removeEgg(eggId) {
      const i = eggs.findIndex((e) => e.id === eggId);
      if (i < 0) return false;
      eggs.splice(i, 1);
      touch();
      return true;
    },
    hatch(eggId) {
      const i = eggs.findIndex((e) => e.id === eggId);
      if (i < 0) return null;
      const egg = eggs[i]!.egg;
      const state = createDino(hatchSpot(egg));
      const entry: DinoEntry = { id: takeId(), name: '', state };
      // The dino is in the list before the egg leaves it, so a save never sees neither.
      dinos.push(entry);
      eggs.splice(i, 1);
      touch();
      return entry;
    },
    findDino: (id) => dinos.find((d) => d.id === id),
    rename(id, name) {
      const d = dinos.find((e) => e.id === id);
      if (!d) return;
      d.name = cleanDinoName(name);
      touch();
    },
    setMode(id, mode) {
      const d = dinos.find((e) => e.id === id);
      if (!d) return;
      d.state.mode = mode;
      d.state.stayX = d.state.x;
      d.state.stayZ = d.state.z;
      d.state.goal = null;
      d.state.chasing = false;
      touch();
    },
    touch,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toRecord() {
      return {
        dinos: dinos.map((d) => ({
          id: d.id, kind: d.state.kind, golden: d.state.golden, name: d.name, mode: d.state.mode,
          x: orNull(d.state.x), y: orNull(d.state.y), z: orNull(d.state.z),
          stayX: orNull(d.state.stayX), stayZ: orNull(d.state.stayZ), growth: d.state.growth,
        })),
        eggs: eggs.map((e) => ({
          id: e.id, kind: e.egg.kind, golden: e.egg.golden,
          x: orNull(e.egg.x), y: orNull(e.egg.y), z: orNull(e.egg.z), playSeconds: e.egg.playSeconds,
        })),
      };
    },
    load(raw) {
      dinos.length = 0;
      eggs.length = 0;
      const r = (typeof raw === 'object' && raw !== null ? raw : {}) as { dinos?: unknown; eggs?: unknown };
      for (const item of Array.isArray(r.dinos) ? r.dinos.slice(0, MAX_LOADED) : []) {
        const d = dinoFromRaw(item);
        if (d) dinos.push(d);
      }
      for (const item of Array.isArray(r.eggs) ? r.eggs.slice(0, MAX_LOADED) : []) {
        const e = eggFromRaw(item);
        if (e) eggs.push(e);
      }
      // Fresh ids, unique across both lists. Saved ids are not trusted.
      nextId = 1;
      for (const d of dinos) d.id = takeId();
      for (const e of eggs) e.id = takeId();
      touch();
    },
    clear() {
      dinos.length = 0;
      eggs.length = 0;
      touch();
    },
  };
}

// ---- The one store of the running game, for code that has no game object (the shop, the exam) ----

let active: DinoStore | null = null;
const pending: { kind: DinoKindId; golden: boolean }[] = [];

/** The game sets its store here when it starts and clears it when it stops. */
export function setActiveDinoStore(store: DinoStore | null): void {
  active = store;
  if (!store) return;
  for (const p of pending.splice(0)) store.addEgg(p.kind, p.golden);
}

export function getActiveDinoStore(): DinoStore | null {
  return active;
}

/**
 * Gives the kid an egg. It lies next to the player after the next game step and hatches after
 * 5 seconds of play. Used by the Dinowinkel (T47) and the golden egg of an exam (T51a).
 * The store tells the save queue by itself, nobody has to mark anything dirty.
 * Without a running game the egg waits and appears when the game starts.
 */
export function addEgg(kind: DinoKindId, golden = false): void {
  if (!isDinoKindId(kind)) return;
  if (active) active.addEgg(kind, golden === true);
  else pending.push({ kind, golden: golden === true });
}
