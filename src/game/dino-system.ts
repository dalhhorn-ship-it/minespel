// Dinos and eggs in the world: steps them every frame, hatches eggs after 5 seconds of play,
// brings Volg mij dinos along when the player goes home, answers "is a dino here?" for building,
// and "which dino is under this tap?" for taps (AC104).
import { createRng, type Rng } from '../core/rng';
import { registerHook } from '../dev/e2e-hooks';
import { boxCollides, createDino, dinoBounds, popNextTo, stepDino, type Point } from '../dinos/dino-ai';
import { isPlaced, type DinoEntry, type DinoStore, type EggEntry } from '../dinos/dino-store';
import { isDinoKindId } from '../dinos/kinds';
import { hatchSpot, stepEgg, type EggState } from '../dinos/egg';
import type { Records } from '../storage/records';
import type { SaveQueue } from '../storage/save-queue';
import { isSolid } from '../world/blocks';
import { raycast, REACH } from '../world/raycast';
import type { Aim, Box, IsOccupied } from '../world/build';
import { MAX_FRAME_TIME } from '../world/physics';
import type { World } from '../world/world';

/** A tap on a dino or egg counts when the ray passes this close to the box. Kids tap loosely. */
const TAP_MARGIN = 0.15;
const EGG_SIDE = 0.4;
const EGG_HEIGHT = 0.66;
/** While dinos or eggs exist their spots are saved this often (play seconds). */
const SAVE_EVERY = 3;

export type DinoTarget =
  | { kind: 'dino'; id: number; distance: number }
  | { kind: 'egg'; id: number; distance: number };

/** Something the renderer can show once: a cloud where a dino pops or an egg hatches. */
export interface DinoWorldEvent {
  type: 'puff';
  x: number;
  y: number;
  z: number;
}

export interface DinoSystemOptions {
  world: World;
  /** Feet position of the player. Read every step. */
  player: () => Point;
  store: DinoStore;
  rng?: Rng;
  onEvent?: (event: DinoWorldEvent) => void;
}

export interface DinoSystem {
  readonly store: DinoStore;
  /** One frame of play time. Eggs count, dinos walk. */
  step(dt: number): void;
  /** Volg mij dinos jump next to the player (the player was put back on the start spot). */
  teleported(): void;
  /** True when a dino or egg overlaps the box. Passed to `placeBlock` (AC6). */
  isOccupied: IsOccupied;
  /** The nearest dino or egg under the aim within 6 blocks, unless a block is in front of it. */
  hitTest(aim: Aim): DinoTarget | null;
}

export function eggBounds(e: Pick<EggState, 'x' | 'y' | 'z'>): Box {
  const h = EGG_SIDE / 2;
  return [e.x - h, e.y, e.z - h, e.x + h, e.y + EGG_HEIGHT, e.z + h];
}

function boxesOverlap(a: Box, b: Box): boolean {
  return a[0] < b[3] && a[3] > b[0] && a[1] < b[4] && a[4] > b[1] && a[2] < b[5] && a[5] > b[2];
}

/** Distance along a unit ray to a box, or null. Slab method. */
function rayBox(aim: Aim, box: Box, margin: number): number | null {
  const o = [aim.ox, aim.oy, aim.oz];
  const d = [aim.dx, aim.dy, aim.dz];
  let tMin = 0;
  let tMax = Infinity;
  for (let i = 0; i < 3; i++) {
    const lo = box[i]! - margin;
    const hi = box[i + 3]! + margin;
    if (Math.abs(d[i]!) < 1e-9) {
      if (o[i]! < lo || o[i]! > hi) return null;
    } else {
      let t1 = (lo - o[i]!) / d[i]!;
      let t2 = (hi - o[i]!) / d[i]!;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }
  return tMin;
}

export function createDinoSystem(options: DinoSystemOptions): DinoSystem {
  const { world, store } = options;
  const rng = options.rng ?? createRng(Date.now() >>> 0);
  const emit = (type: DinoWorldEvent['type'], p: Point) => options.onEvent?.({ type, x: p.x, y: p.y + 0.4, z: p.z });
  let sinceSave = 0;

  /** Finds a free spot on the ground next to the player for something of this size. */
  function spotNextTo(kind: DinoEntry['state']['kind'], player: Point): Point | null {
    const probe = createDino({ kind, golden: false, x: player.x, y: player.y, z: player.z });
    return popNextTo(world, probe, player, rng) ? { x: probe.x, y: probe.y, z: probe.z } : null;
  }

  function placeEgg(e: EggEntry, player: Point): void {
    const spot = spotNextTo(e.egg.kind, player) ?? player;
    e.egg.x = spot.x; e.egg.y = spot.y; e.egg.z = spot.z;
    store.touch();
  }

  /** Keeps an egg on solid ground: it falls when the floor is mined, and moves out of a block. */
  function settleEgg(e: EggEntry, player: Point): void {
    const g = e.egg;
    if (boxCollides(world, g.x, g.y, g.z, EGG_SIDE, EGG_HEIGHT)) {
      for (let up = 1; up <= 3; up++) {
        if (!boxCollides(world, g.x, g.y + up, g.z, EGG_SIDE, EGG_HEIGHT)) { g.y += up; return; }
      }
      placeEgg(e, player);
      return;
    }
    if (g.y > 0 && !boxCollides(world, g.x, g.y - 0.05, g.z, EGG_SIDE, EGG_HEIGHT)) {
      let y = Math.floor(g.y) - 1;
      while (y > 0 && !boxCollides(world, g.x, y - 0.05, g.z, EGG_SIDE, EGG_HEIGHT)) y--;
      g.y = Math.max(0, y);
    }
  }

  const system: DinoSystem = {
    store,
    step(dtRaw) {
      if (!(dtRaw > 0) || !Number.isFinite(dtRaw)) return;
      const dt = Math.min(dtRaw, MAX_FRAME_TIME);
      const player = options.player();

      // New and loaded eggs and dinos get their place first.
      for (const e of store.eggs) if (!isPlaced(e.egg)) placeEgg(e, player);
      for (const d of store.dinos) {
        if (isPlaced(d.state)) continue;
        const s = d.state;
        if (!popNextTo(world, s, player, rng)) { s.x = player.x; s.y = player.y; s.z = player.z; }
        s.stayX = s.x; s.stayZ = s.z;
        store.touch();
      }

      for (const e of [...store.eggs]) {
        settleEgg(e, player);
        if (stepEgg(e.egg, dt)) {
          const spot = hatchSpot(e.egg);
          store.hatch(e.id);
          emit('puff', spot);
        }
      }
      for (const d of store.dinos) {
        if (stepDino(world, d.state, player, rng, dt) === 'popped') emit('puff', d.state);
      }

      sinceSave += dt;
      if (sinceSave >= SAVE_EVERY) {
        sinceSave = 0;
        if (store.dinos.length > 0 || store.eggs.length > 0) store.touch();
      }
    },
    teleported() {
      const player = options.player();
      for (const d of store.dinos) {
        if (d.state.mode !== 'follow' || !isPlaced(d.state)) continue;
        if (popNextTo(world, d.state, player, rng)) emit('puff', d.state);
      }
      store.touch();
    },
    isOccupied(box) {
      for (const d of store.dinos) if (isPlaced(d.state) && boxesOverlap(box, dinoBounds(d.state))) return true;
      for (const e of store.eggs) if (isPlaced(e.egg) && boxesOverlap(box, eggBounds(e.egg))) return true;
      return false;
    },
    hitTest(aim) {
      const len = Math.hypot(aim.dx, aim.dy, aim.dz);
      if (!(len > 0) || !Number.isFinite(len)) return null;
      const unit: Aim = { ...aim, dx: aim.dx / len, dy: aim.dy / len, dz: aim.dz / len };
      const found: DinoTarget[] = [];
      const consider = (target: DinoTarget['kind'], id: number, box: Box) => {
        const t = rayBox(unit, box, TAP_MARGIN);
        if (t !== null && t <= REACH) found.push({ kind: target, id, distance: t });
      };
      for (const d of store.dinos) if (isPlaced(d.state)) consider('dino', d.id, dinoBounds(d.state));
      for (const e of store.eggs) if (isPlaced(e.egg)) consider('egg', e.id, eggBounds(e.egg));
      found.sort((a, b) => a.distance - b.distance);
      const best = found[0];
      if (!best) return null;
      // A block in front of it wins: a kid tapping a wall must not open the menu of a dino behind it.
      const hit = raycast(world, unit.ox, unit.oy, unit.oz, unit.dx, unit.dy, unit.dz, REACH);
      if (hit && isSolid(world.get(hit.x, hit.y, hit.z)) && hit.distance < best.distance - 0.05) return null;
      return best;
    },
  };

  if (__E2E__) {
    const round = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
    registerHook('dinoState', () => ({
      dinos: store.dinos.map((d) => ({
        id: d.id, kind: d.state.kind, golden: d.state.golden, name: d.name, mode: d.state.mode,
        x: round(d.state.x), y: round(d.state.y), z: round(d.state.z), growth: round(d.state.growth),
      })),
      eggs: store.eggs.map((e) => ({
        id: e.id, kind: e.egg.kind, golden: e.egg.golden,
        x: round(e.egg.x), y: round(e.egg.y), z: round(e.egg.z), playSeconds: round(e.egg.playSeconds),
      })),
    }));
    registerHook('placeDino', (id: number, x: number, y: number, z: number) => {
      const d = store.findDino(id);
      if (!d) return false;
      d.state.x = x; d.state.y = y; d.state.z = z; d.state.vy = 0;
      d.state.stayX = x; d.state.stayZ = z; d.state.goal = null;
      return true;
    });
    registerHook('placeEgg', (id: number, x: number, y: number, z: number) => {
      const e = store.eggs.find((g) => g.id === id);
      if (!e) return false;
      e.egg.x = x; e.egg.y = y; e.egg.z = z;
      return true;
    });
    registerHook('addTestEgg', (kind: string, golden: boolean) => {
      if (isDinoKindId(kind)) store.addEgg(kind, golden === true);
    });
    registerHook('renameDino', (id: number, name: string) => store.rename(id, name));
    registerHook('dinoRecord', () => store.toRecord());
  }

  return system;
}

// ---- Saving ----

export interface DinoSaveOptions {
  store: DinoStore;
  queue: Pick<SaveQueue, 'register' | 'markDirty'>;
  records: Pick<Records, 'get'>;
}

export interface DinoSave {
  /** Loads the saved dinos and eggs. Never throws: a bad record is ignored. */
  restore(): Promise<void>;
  /** Marks the `dinos` record dirty whenever the store changes. Returns a stop function. */
  start(): () => void;
  /** A restore that is still waiting will not touch the store any more. */
  cancel(): void;
}

export function createDinoSave(options: DinoSaveOptions): DinoSave {
  const { store, queue, records } = options;
  queue.register('dinos', () => store.toRecord());
  let cancelled = false;
  return {
    async restore() {
      try {
        const raw = await records.get('dinos');
        if (cancelled) return;
        store.load(raw);
      } catch {
        /* a broken dinos record: start with none, the old record stays on disk until something changes */
      }
    },
    start() {
      return store.subscribe(() => queue.markDirty('dinos'));
    },
    cancel() {
      cancelled = true;
    },
  };
}
