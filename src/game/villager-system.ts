// The villagers of v11 Dorp (V11c, AC180), beside the dino system and never part of it.
// Steps villagers in `stay` mode within 3 blocks of home, skips the ones far away, turns and waves at the
// player, dances on request, and says which box a villager fills. Never moves the player, never changes a block.
import { createRng, type Rng } from '../core/rng';
import { boxCollides, stepDino, type Point } from '../dinos/dino-ai';
import type { GameRenderer } from '../render/renderer';
import {
  createVillagers,
  DANCE_SECONDS,
  VILLAGER_BOX,
  VILLAGER_WANDER,
  type VillagerState,
} from '../villagers/villager';
import type { Box } from '../world/build';
import type { World } from '../world/world';

/** Villagers farther than this from the player are not stepped. */
export const STEP_DISTANCE = 24;
/** A villager turns to a player closer than this. */
export const TURN_DISTANCE = 6;
/** A villager waves at a player closer than this. */
export const WAVE_DISTANCE = 4;
/** `nearest` default: the question bubble shows within 3 blocks. */
export const NEAR_DISTANCE = 3;
const TURN_SPEED = 6;
const EPS = 1e-3;

export interface VillagerSystemOptions {
  world: World;
  player: { player: Point };
  renderer?: Pick<GameRenderer, 'syncVillagers'>;
  rng?: Rng;
  /** Fallback for a slow iPad (AC190): villagers stand at home and only turn to the player. */
  stillMode?: boolean;
}

export interface VillagerSystem {
  villagers(): readonly VillagerState[];
  step(dt: number): void;
  /** The closest villager within `radius` blocks (default 3) of the player spot, or null. */
  nearest(player: Point, radius?: number): VillagerState | null;
  /** Starts the silly dance (about 2 seconds, model only). False for an unknown id. */
  dance(id: string): boolean;
  isOccupied(box: Box): boolean;
  /** Puts every villager back at its home spot. */
  reset(): void;
  setStillMode(on: boolean): void;
  stillMode(): boolean;
}

function bounds(v: VillagerState): Box {
  const h = VILLAGER_BOX.side / 2;
  return [v.x - h, v.y, v.z - h, v.x + h, v.y + VILLAGER_BOX.height, v.z + h];
}

function overlap(a: Box, b: Box): boolean {
  return (
    a[0] < b[3] - EPS && a[3] > b[0] + EPS &&
    a[1] < b[4] - EPS && a[4] > b[1] + EPS &&
    a[2] < b[5] - EPS && a[5] > b[2] + EPS
  );
}

function turnTowards(v: VillagerState, tx: number, tz: number, dt: number): void {
  const want = Math.atan2(tx - v.x, tz - v.z);
  let diff = want - v.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const step = TURN_SPEED * dt;
  v.heading = Math.abs(diff) <= step ? want : v.heading + Math.sign(diff) * step;
}

export function createVillagerSystem(options: VillagerSystemOptions): VillagerSystem {
  const rng = options.rng ?? createRng(0x56494c4c);
  const list = createVillagers();
  let still = options.stillMode ?? false;
  let needsHome = true;

  /** Stands the villager on the ground at its home column (a site without houses has its own ground, AC179). */
  function settle(v: VillagerState): void {
    const { side, height } = VILLAGER_BOX;
    const base = Math.floor(v.home.y);
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8];
    let y = v.home.y;
    for (const dy of offsets) {
      const cy = base + dy;
      if (cy < 1) continue;
      if (!boxCollides(options.world, v.home.x, cy, v.home.z, side, height) &&
          boxCollides(options.world, v.home.x, cy - 0.05, v.home.z, side, height)) {
        y = cy;
        break;
      }
    }
    v.home.y = y;
    v.x = v.home.x; v.y = y; v.z = v.home.z;
    v.stayX = v.home.x; v.stayZ = v.home.z;
    v.vy = 0; v.onGround = true; v.goal = null; v.goalLeft = 0; v.idleLeft = 1;
    v.stuckTime = 0; v.waving = false;
  }

  function reset(): void {
    for (const v of list) { settle(v); v.danceLeft = 0; }
    needsHome = false;
    sync();
  }

  function sync(): void {
    options.renderer?.syncVillagers?.(list);
  }

  reset();
  needsHome = true; // the saved world loads after this, so the first step settles them again

  return {
    villagers: () => list,
    step(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      if (needsHome) {
        for (const v of list) settle(v);
        needsHome = false;
      }
      const p = options.player.player;
      for (const v of list) {
        v.clock += dt;
        if (v.danceLeft > 0) v.danceLeft = Math.max(0, v.danceLeft - dt);
        const dancing = v.danceLeft > 0;
        const dist = Math.hypot(p.x - v.x, p.z - v.z);
        if (dist > STEP_DISTANCE) { v.waving = false; continue; }

        if (!still) {
          if (dancing) { v.goal = null; v.idleLeft = 1; }
          // The "player" for rescue is the home spot, so a villager never pops next to the kid.
          stepDino(options.world, v, v.home, rng, dt, { box: VILLAGER_BOX, radius: VILLAGER_WANDER });
        }
        if (!v.goal && !dancing && dist <= TURN_DISTANCE) turnTowards(v, p.x, p.z, dt);
        v.waving = !still && !dancing && dist <= WAVE_DISTANCE;
      }
      sync();
    },
    nearest(player, radius = NEAR_DISTANCE) {
      let best: VillagerState | null = null;
      let bestDist = radius;
      for (const v of list) {
        if (Math.abs(player.y - v.y) > 3) continue;
        const d = Math.hypot(player.x - v.x, player.z - v.z);
        if (d <= bestDist) { best = v; bestDist = d; }
      }
      return best;
    },
    dance(id) {
      const v = list.find((x) => x.id === id);
      if (!v) return false;
      v.danceLeft = DANCE_SECONDS;
      v.waving = false;
      sync();
      return true;
    },
    isOccupied(box) {
      for (const v of list) if (overlap(box, bounds(v))) return true;
      return false;
    },
    reset,
    setStillMode(on) {
      still = on;
      if (on) { for (const v of list) { settle(v); v.danceLeft = 0; } sync(); }
    },
    stillMode: () => still,
  };
}
