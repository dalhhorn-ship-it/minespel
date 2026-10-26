// World dino system (T42, AC6, AC12, AC16, AC17, AC21, AC104, AC106, AC150).
// Steps eggs and dinos during active world play, checks block-placement overlap,
// raycasts dino taps before blocks, brings `follow` dinos along on `teleported`, and shows hearts/puff.

import type { Sound } from '../audio/sound';
import { createRng, type Rng } from '../core/rng';
import {
  dinoBounds,
  popNextTo,
  stepDino,
  type Point,
} from '../dinos/dino-ai';
import {
  EGG_BOX_HEIGHT,
  EGG_BOX_SIDE,
  type DinoStore,
  type WorldDino,
  type WorldEgg,
} from '../dinos/dino-store';
import { stepEgg } from '../dinos/egg';
import type { Effects } from '../render/effects';
import type { GameRenderer } from '../render/renderer';
import { WOL_GEEL, WOL_WIT } from '../world/blocks';
import type { Aim, Box } from '../world/build';
import { raycast, REACH } from '../world/raycast';
import type { World } from '../world/world';
import { aimFromScreen } from './build-controller';
import type { PlayerController } from './player-controller';

const EPS = 1e-3;

function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a[0] < b[3] - EPS &&
    a[3] > b[0] + EPS &&
    a[1] < b[4] - EPS &&
    a[4] > b[1] + EPS &&
    a[2] < b[5] - EPS &&
    a[5] > b[2] + EPS
  );
}

export function eggBounds(e: Pick<WorldEgg, 'x' | 'y' | 'z'>): Box {
  const h = EGG_BOX_SIDE / 2;
  return [e.x - h, e.y, e.z - h, e.x + h, e.y + EGG_BOX_HEIGHT, e.z + h];
}

/** True when `box` overlaps any dino or egg in the world (AC6). */
export function isBoxOccupiedByDinoOrEgg(
  box: Box,
  dinos: readonly WorldDino[],
  eggs: readonly WorldEgg[],
): boolean {
  for (const d of dinos) {
    if (boxesOverlap(box, dinoBounds(d))) return true;
  }
  for (const e of eggs) {
    if (boxesOverlap(box, eggBounds(e))) return true;
  }
  return false;
}

/**
 * Ray-AABB intersection along `aim`. Returns the distance along the normalized ray in `[0, maxDistance]`,
 * or `null` when the ray misses `box` or hits beyond `maxDistance`.
 */
export function rayHitsBox(aim: Aim, box: Box, maxDistance: number = REACH): number | null {
  const len = Math.hypot(aim.dx, aim.dy, aim.dz);
  if (!(len > 0) || !Number.isFinite(len)) return null;
  const ux = aim.ox;
  const uy = aim.oy;
  const uz = aim.oz;
  const dx = aim.dx / len;
  const dy = aim.dy / len;
  const dz = aim.dz / len;

  let tMin = 0;
  let tMax = maxDistance;

  const axes: Array<[number, number, number, number]> = [
    [ux, dx, box[0], box[3]],
    [uy, dy, box[1], box[4]],
    [uz, dz, box[2], box[5]],
  ];

  for (const [origin, dir, minB, maxB] of axes) {
    if (Math.abs(dir) < 1e-8) {
      if (origin < minB || origin > maxB) return null;
    } else {
      let t1 = (minB - origin) / dir;
      let t2 = (maxB - origin) / dir;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return null;
    }
  }

  return tMin <= maxDistance ? Math.max(0, tMin) : null;
}

function insideBox(aim: Aim, box: Box): boolean {
  return (
    aim.ox > box[0] && aim.ox < box[3] && aim.oy > box[1] && aim.oy < box[4] && aim.oz > box[2] && aim.oz < box[5]
  );
}

/**
 * Picks the closest dino hit by `aim` within `maxDistance` that stands in front of any solid block (`AC104`).
 */
export function pickDinoAtAim(
  world: World,
  dinos: readonly WorldDino[],
  aim: Aim,
  maxDistance: number = REACH,
): WorldDino | null {
  const blockHit = raycast(world, aim.ox, aim.oy, aim.oz, aim.dx, aim.dy, aim.dz, maxDistance);
  const maxT = blockHit ? blockHit.distance : maxDistance;

  let bestDino: WorldDino | null = null;
  let bestDist = maxT;

  for (const d of dinos) {
    // Slightly generous tap padding (+0.15 block) so excited kid taps on a moving dino feel responsive.
    const b = dinoBounds(d);
    const padded: Box = [b[0] - 0.15, b[1], b[2] - 0.15, b[3] + 0.15, b[4] + 0.15, b[5] + 0.15];
    // The eye inside a dino (the kid stands in a big one): that dino would take every tap, so skip it (decision 112).
    if (insideBox(aim, padded)) continue;
    const t = rayHitsBox(aim, padded, maxDistance);
    if (t !== null && t <= bestDist) {
      bestDist = t;
      bestDino = d;
    }
  }

  return bestDino;
}

export interface DinoSystemOptions {
  world: World;
  player: PlayerController;
  store: DinoStore;
  renderer: GameRenderer;
  container: HTMLElement;
  sound?: Pick<Sound, 'play'>;
  effects?: Pick<Effects, 'pop'>;
  viewport: () => { width: number; height: number };
  onDinoTapped?: (dino: WorldDino, screenX: number, screenY: number) => void;
  rng?: Rng;
  doc?: Document;
}

export interface DinoSystem {
  readonly store: DinoStore;
  step(dt: number): void;
  /** Returns true when the tap hit a dino (opening the dino menu instead of mining/placing a block). */
  handleTap(screenX: number, screenY: number): boolean;
  isOccupied(box: Box): boolean;
  onPlayerTeleported(spot: Point): void;
  showHearts(screenX?: number, screenY?: number): void;
  dispose(): void;
}

export function createDinoSystem(options: DinoSystemOptions): DinoSystem {
  const rng = options.rng ?? createRng(0x44494e4f);
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : undefined);
  const heartTimers = new Set<ReturnType<typeof setTimeout>>();
  let dirtyTimer = 0;

  const unsubscribeStore = options.store.subscribe(() => {
    options.renderer.syncDinos?.(options.store.dinos(), options.store.eggs());
  });

  function showPuff(golden = false) {
    const { width, height } = options.viewport();
    options.effects?.pop(width / 2, height / 2, golden ? WOL_GEEL : WOL_WIT);
  }

  function showHearts(screenX?: number, screenY?: number) {
    options.sound?.play('chirp');
    if (!doc) return;
    const { width, height } = options.viewport();
    const cx = screenX ?? width / 2;
    const cy = screenY ?? height / 2;
    for (let i = 0; i < 6; i++) {
      const heart = doc.createElement('div');
      heart.className = 'dino-heart';
      heart.textContent = '\u{2764}\u{FE0F}';
      heart.setAttribute('aria-hidden', 'true');
      const offsetX = (i - 2.5) * 24;
      heart.style.cssText =
        `position:fixed;left:${cx + offsetX}px;top:${cy}px;font-size:28px;pointer-events:none;z-index:45;` +
        'transition:transform 650ms ease-out,opacity 650ms ease-in;';
      options.container.append(heart);
      const t1 = setTimeout(() => {
        heartTimers.delete(t1);
        heart.style.transform = `translate(${offsetX * 0.5}px, -70px) scale(1.25)`;
        heart.style.opacity = '0';
      }, 16);
      const t2 = setTimeout(() => {
        heartTimers.delete(t2);
        heart.remove();
      }, 700);
      heartTimers.add(t1);
      heartTimers.add(t2);
    }
  }

  return {
    store: options.store,
    step(dt) {
      if (!(dt > 0) || !Number.isFinite(dt)) return;
      const p = options.player.player;
      const playerSpot: Point = { x: p.x, y: p.y, z: p.z };
      const playerYaw = options.player.pose().yaw;

      // 1. Step eggs (only during active world play, AC150)
      const eggsSnapshot = [...options.store.eggs()];
      for (const egg of eggsSnapshot) {
        const ready = stepEgg(egg, dt);
        if (ready) {
          const hatched = options.store.hatchEgg(egg.id);
          if (hatched) {
            options.sound?.play('crack');
            options.sound?.play('chirp');
            showPuff(hatched.golden);
          }
        }
      }

      // 2. Step dinos
      const dinosList = options.store.dinos();
      for (const dino of dinosList) {
        const ev = stepDino(options.world, dino, playerSpot, rng, dt, { playerYaw });
        if (ev === 'popped') {
          showPuff(dino.golden);
        }
      }

      // 3. Periodically mark dirty when eggs or dinos exist so playSeconds and positions save
      if (eggsSnapshot.length > 0 || dinosList.length > 0) {
        dirtyTimer += dt;
        if (dirtyTimer >= 1) {
          dirtyTimer = 0;
          options.store.markDirty();
        }
      }

      options.renderer.syncDinos?.(options.store.dinos(), options.store.eggs());
    },
    handleTap(screenX, screenY) {
      const { width, height } = options.viewport();
      const aim = aimFromScreen(options.player.pose(), width, height, screenX, screenY);
      const hitDino = pickDinoAtAim(options.world, options.store.dinos(), aim, REACH);
      if (!hitDino) return false;
      options.sound?.play('chirp');
      options.onDinoTapped?.(hitDino, screenX, screenY);
      return true;
    },
    isOccupied(box) {
      return isBoxOccupiedByDinoOrEgg(box, options.store.dinos(), options.store.eggs());
    },
    onPlayerTeleported(spot) {
      let moved = false;
      for (const d of options.store.dinos()) {
        if (d.mode === 'follow') {
          if (popNextTo(options.world, d, spot, rng, undefined, options.player.pose().yaw)) {
            moved = true;
          }
        }
      }
      if (moved) {
        options.store.markDirty();
        options.renderer.syncDinos?.(options.store.dinos(), options.store.eggs());
      }
    },
    showHearts,
    dispose() {
      unsubscribeStore();
      for (const t of heartTimers) clearTimeout(t);
      heartTimers.clear();
    },
  };
}
