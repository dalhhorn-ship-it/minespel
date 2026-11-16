// The knight system (v17, decision 135): a real skeleton with a stub AI. It keeps the list of live knights, adds and
// removes them, changes modes, applies the switches, brings them home on a world reset, answers taps and the build
// overlap check, and tells the renderer every frame. Behaviour comes from knight-ai.ts (stub until V17b).
// Only mode and spot are saved, through `persist`; the live position never is.
import { registerHook } from '../dev/e2e-hooks';
import { createRng, type Rng } from '../core/rng';
import { pickActor, screenPointOf } from '../game/actor-hit';
import { aimFromScreen } from '../game/build-controller';
import type { CreatureSystem } from '../game/game';
import type { Point } from '../dinos/dino-ai';
import type { ActorView, CameraPose, GameRenderer } from '../render/renderer';
import type { ActorLabels } from '../ui/actor-labels';
import type { CreatureSwitches } from '../storage/monsters-store';
import type { Box } from '../world/build';
import type { World } from '../world/world';
import type { KnightFlow } from '../app/knight-flow';
import { lookKey, type Worn } from './gear';
import { createGuardSet, type GuardAnimal } from './guard-set';
import { createKnightBody, defaultKnightRng, placeAtSpot, placeNearKid, stepKnight } from './knight-ai';
import {
  KNIGHT_BOX, KNIGHT_TAP_REACH, MAX_KNIGHTS, SALUTE_GAP_MS, toRecord,
  type KnightMode, type KnightRecord, type KnightState,
} from './knight-types';

/** Priority in `game.addCreatures`: monsters 10, knights 20. */
export const KNIGHT_PRIORITY = 20;

export interface KnightSystemOptions {
  world: World;
  player: { player: Point; yaw: number; pose(): { x: number; y: number; z: number; yaw: number; pitch: number } };
  renderer?: Pick<GameRenderer, 'syncActors'>;
  flow: KnightFlow;
  viewport: () => { width: number; height: number };
  /** Saves a change of the knight list in the `monsters` record (one transaction, see `updateMonsters`). */
  persist?: (change: (knights: KnightRecord[]) => KnightRecord[]) => void;
  rng?: Rng;
  /** The live dinos and chickens a guard may watch (v22, AC331). Boot passes `dinoStore.dinos()`; missing: nobody is guarded. */
  animals?: () => readonly GuardAnimal[];
  /** The shared label pool for the shield marks (AC333). */
  labels?: ActorLabels;
  /** True while a free or away mole exists: the shield marks show. */
  moleAround?: () => boolean;
}

export interface KnightSystem extends CreatureSystem {
  /** The live knights, switched off ones included. */
  knights(): readonly KnightState[];
  /** Loads the saved knights at boot. No event: a follower stands next to the kid and a stay or guard knight at his spot on the first step. */
  load(records: readonly KnightRecord[]): void;
  /** A knight was bought: he stands within 3 blocks of the kid and `arrived` is emitted. The caller saved the record. False at the cap or for a known id. */
  add(record: KnightRecord): boolean;
  /** A knight was traded in. False for an unknown id. */
  remove(id: string): boolean;
  /** Stay and guard take the spot where he stands, follow clears it. Saved at once. */
  setMode(id: string, mode: KnightMode): boolean;
  /** The switches from settings. Knights off: they hide. On again: back with their modes. */
  applySwitches(switches: CreatureSwitches): void;
  /** What a knight wears now (v19), set after every gear write and on load. Missing or empty: bare. False for an unknown id. */
  setGear(id: string, worn: Worn | undefined): boolean;
  setSeed(seed: number): void;
  /** Points of the kid, re-read every time the screen goes back to the world (V18 reads it for the bubble rule). */
  setPoints(points: number): void;
  points(): number;
  /** The id of the knight who guards this animal (a dino or chicken id), or null (v22).  */
  guardedBy(animalId: string): string | null;
  /** Every guarded animal and who guards it, for the e2e hook `guardState` (v22). */
  guardState(): GuardEntry[];
}

/** One row of `guardState()`. */
export interface GuardEntry {
  animalId: string;
  knightId: string;
}

function bounds(k: KnightState): Box {
  const h = KNIGHT_BOX.side / 2;
  return [k.body.x - h, k.body.y, k.body.z - h, k.body.x + h, k.body.y + KNIGHT_BOX.height, k.body.z + h];
}

const EPS = 1e-3;
function overlap(a: Box, b: Box): boolean {
  return a[0] < b[3] - EPS && a[3] > b[0] + EPS && a[1] < b[4] - EPS && a[4] > b[1] + EPS && a[2] < b[5] - EPS && a[5] > b[2] + EPS;
}

export function createKnightSystem(options: KnightSystemOptions): KnightSystem {
  let rng = options.rng ?? defaultKnightRng();
  const list: KnightState[] = [];
  /** Knights that stand where they should. Others are placed on the next step. */
  const placed = new Set<string>();
  let on = true;
  let points = 0;
  let drawn = 0;
  /** Who guards whom, recomputed every 1000 ms of loop time and nowhere else (v22, AC331). */
  const guards = createGuardSet({
    knights: () => list,
    animals: options.animals,
    labels: options.labels,
    moleAround: options.moleAround,
    pose: () => options.player.pose() as CameraPose,
    viewport: options.viewport,
  });

  const stateFrom = (r: KnightRecord): KnightState => ({
    id: r.id, mode: r.mode, spot: r.spot ? { ...r.spot } : null, boughtFor: r.boughtFor,
    body: createKnightBody(r.spot ?? kid()),
    chase: null, saluteClockMs: SALUTE_GAP_MS, visible: true,
  });
  function kid(): Point {
    const p = options.player.player;
    return { x: p.x, y: p.y, z: p.z };
  }
  const visible = (): KnightState[] => (on ? list.filter((k) => k.visible) : []);

  function nearKid(k: KnightState): void {
    placeNearKid(options.world, k, kid(), rng, options.player.yaw);
    k.chase = null;
    k.saluteClockMs = 0;
    if (k.mode !== 'follow') takeSpot(k);
    placed.add(k.id);
  }
  function takeSpot(k: KnightState): void {
    k.spot = { x: k.body.x, y: k.body.y, z: k.body.z };
    k.body.stayX = k.body.x;
    k.body.stayZ = k.body.z;
  }
  function placeOnLoad(k: KnightState): void {
    if (k.mode === 'follow' || !k.spot) nearKid(k);
    else {
      placeAtSpot(k);
      placed.add(k.id);
    }
  }
  const saveAll = () => {
    const now = new Map(list.map((k) => [k.id, toRecord(k)]));
    options.persist?.((rows) => rows.map((r) => now.get(r.id) ?? r));
  };
  const find = (id: string) => list.find((k) => k.id === id);

  function sync(): void {
    const shown = visible();
    if (shown.length === 0 && drawn === 0) return;
    const views: ActorView[] = shown.map((k) => ({
      id: k.id, model: 'knight', x: k.body.x, y: k.body.y, z: k.body.z, heading: k.body.heading,
      look: lookKey(k.gear), pose: k.poking ? 'poke' : undefined,
    }));
    drawn = views.length;
    options.renderer?.syncActors?.('knights', views);
  }

  const system: KnightSystem = {
    knights: () => list,
    load(records) {
      list.length = 0;
      placed.clear();
      for (const r of records.slice(0, MAX_KNIGHTS)) list.push(stateFrom(r));
    },
    add(record) {
      if (list.length >= MAX_KNIGHTS || find(record.id)) return false;
      const k = stateFrom(record);
      list.push(k);
      nearKid(k);
      options.flow.onEvent('arrived', k);
      sync();
      return true;
    },
    remove(id) {
      const i = list.findIndex((k) => k.id === id);
      if (i < 0) return false;
      list.splice(i, 1);
      placed.delete(id);
      sync();
      return true;
    },
    setMode(id, mode) {
      const k = find(id);
      if (!k) return false;
      k.mode = mode;
      k.chase = null;
      if (mode === 'follow') k.spot = null;
      else takeSpot(k);
      saveAll();
      return true;
    },
    applySwitches(sw) {
      const was = on;
      on = sw.knights;
      if (on && !was) {
        for (const k of list) {
          k.visible = true;
          placed.delete(k.id);
        }
      }
      // Off: no knight is in the world, so none may poke Klodder or the mole either (they read `visible`).
      if (!on) for (const k of list) k.visible = false;
      sync();
    },
    setGear(id, worn) {
      const k = find(id);
      if (!k) return false;
      k.gear = worn ? { ...worn } : undefined;
      sync();
      return true;
    },
    setSeed(seed) {
      rng = createRng(seed);
    },
    setPoints(p) {
      points = p;
    },
    points: () => points,
    guardedBy: (animalId) => guards.guardedBy(animalId),
    guardState: () => guards.state(),
    step(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      for (const k of visible()) {
        if (!placed.has(k.id)) placeOnLoad(k);
        const event = stepKnight(k, { world: options.world, rng, player: kid(), playerYaw: options.player.yaw, dt });
        if (event) options.flow.onEvent(event, k);
      }
      guards.step(dt);
      sync();
      // The Moed steps (priority 10) set `poking` for this frame; the views above carried it.
      for (const k of list) k.poking = false;
    },
    handleTap(x, y) {
      const shown = visible();
      if (shown.length === 0) return false;
      const { width, height } = options.viewport();
      const aim = aimFromScreen(options.player.pose(), width, height, x, y);
      const id = pickActor(aim, shown.map((k) => ({ id: k.id, box: bounds(k) })), KNIGHT_TAP_REACH, options.world);
      const hit = id ? find(id) : undefined;
      if (!hit) return false;
      if (hit.mode === 'guard') guards.tapped(hit.id);
      options.flow.openMenu(hit);
      return true;
    },
    isOccupied(box) {
      return visible().some((k) => overlap(box, bounds(k)));
    },
    onWorldReset() {
      for (const k of list) {
        k.visible = on;
        nearKid(k);
      }
      saveAll();
      sync();
    },
  };

  if (__E2E__) {
    let n = 0;
    registerHook('knights', () =>
      list.map((k) => ({ id: k.id, mode: k.mode, x: k.body.x, y: k.body.y, z: k.body.z, spot: k.spot ? { ...k.spot } : null })));
    registerHook('guardState', () => system.guardState());
    registerHook('addKnight', (mode: KnightMode = 'follow') => {
      if (list.length >= MAX_KNIGHTS) return null;
      const id = `test-knight-${Date.now()}-${n++}`;
      system.add({ id, mode, spot: null, boughtFor: 0 });
      const k = find(id);
      if (!k) return null;
      options.persist?.((rows) => [...rows, toRecord(k)]);
      return id;
    });
    registerHook('knightScreenPoint', (id: string) => {
      const k = find(id);
      if (!k) return null;
      const { width, height } = options.viewport();
      return screenPointOf(options.player.pose(), width, height, { x: k.body.x, y: k.body.y + KNIGHT_BOX.height / 2, z: k.body.z });
    });
  }

  return system;
}
