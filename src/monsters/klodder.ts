// Klodder, the black monster (v18, V18b): jumps out of the bubble, walks at 1.5 blocks per second, nibbles cells on
// the hidden overlay (nibble.ts), keeps away from the kid, tires after 5 minutes and brings every block back
// (restore.ts) before he is gone. The exported names are the seams of V18a. His own walking and restore state
// lives in a WeakMap, so `KlodderState` and the system do not change.
import { createDino, type DinoState, type Point } from '../dinos/dino-ai';
import { stepToward } from '../knights/knight-ai';
import { AIR, LAVA, VUUR, WATER } from '../world/blocks';
import type { Box } from '../world/build';
import { KLODDER_BOX, KLODDER_TIRED_MS, type KlodderState, type MonsterContext } from './monster-types';
import { boxesOverlap, MAX_NIBBLES, NIBBLE_GAP_MS, canNibble, pickNibbleCell } from './nibble';
import { startRestore, stepRestore, type Restore } from './restore';

export type KlodderResult = 'left' | null;

/** He walks at 1.5 blocks per second (AC214). */
export const KLODDER_SPEED = 1.5;
/** How long the jump pose shows after he comes out. */
const JUMP_MS = 600;
/** He gives up a cell he cannot reach after this long. */
const TARGET_GIVE_UP_MS = 15_000;
/** He nibbles when he is this close to the cell centre. */
const NIBBLE_REACH = 1.6;
/** He keeps this far from the kid, and hops to 3 to 5 blocks when closer. */
const KEEP_AWAY = 1;
const HOP_MIN = 3;
const HOP_MAX = 5;

interface Inner {
  body: DinoState;
  restore: Restore | null;
  greeted: boolean;
  targetMs: number;
  toldTired: boolean;
}
const inner = new WeakMap<KlodderState, Inner>();

function innerOf(k: KlodderState): Inner {
  let i = inner.get(k);
  if (!i) {
    const body = createDino({ kind: 'kip', golden: false, x: k.x, y: k.y, z: k.z }, true);
    i = { body, restore: null, greeted: false, targetMs: 0, toldTired: false };
    inner.set(k, i);
  }
  return i;
}

/** Klodder jumps out of the bubble at `at` (feet position). He says "Hihihi!" on his first step. */
export function createKlodder(at: { x: number; y: number; z: number }): KlodderState {
  return {
    x: at.x, y: at.y, z: at.z, heading: 0, ageMs: 0, nibbled: 0, nibbleWaitMs: 0, target: null,
    moed: 0, pokers: 0, tired: false, leaving: false, pose: 'jump',
  };
}

export function klodderBox(k: KlodderState): Box {
  const h = KLODDER_BOX.side / 2;
  return [k.x - h, k.y, k.z - h, k.x + h, k.y + KLODDER_BOX.height, k.z + h];
}

function standable(ctx: MonsterContext, x: number, y: number, z: number): boolean {
  const { world } = ctx;
  const ground = world.get(Math.floor(x), y - 1, Math.floor(z));
  if (ground === AIR || ground === WATER || ground === LAVA || ground === VUUR) return false;
  for (let dy = 0; dy < 2; dy++) if (world.get(Math.floor(x), y + dy, Math.floor(z)) !== AIR) return false;
  return true;
}

/** Hops to a free spot 3 to 5 blocks from the kid. Returns false when none is found. */
function hopAway(k: KlodderState, body: DinoState, ctx: MonsterContext): boolean {
  const kid: Point = ctx.kid;
  for (let i = 0; i < 16; i++) {
    const a = ctx.rng.next() * Math.PI * 2;
    const d = HOP_MIN + ctx.rng.next() * (HOP_MAX - HOP_MIN);
    const x = kid.x + Math.sin(a) * d;
    const z = kid.z + Math.cos(a) * d;
    if (!ctx.world.inBounds(Math.floor(x), 0, Math.floor(z))) continue;
    let y = Math.floor(kid.y) + 3;
    while (y > 1 && ctx.world.get(Math.floor(x), y - 1, Math.floor(z)) === AIR) y--;
    if (Math.abs(y - kid.y) > 3 || !standable(ctx, x, y, z)) continue;
    const h = KLODDER_BOX.side / 2;
    const box: Box = [x - h, y, z - h, x + h, y + KLODDER_BOX.height, z + h];
    if (ctx.occupied(box)) continue;
    k.x = body.x = x;
    k.y = body.y = y;
    k.z = body.z = z;
    body.vy = 0;
    k.target = null;
    return true;
  }
  return false;
}

/**
 * One step of loop time. Returns 'left' when he is gone for good: only after every hidden cell is back, so the
 * restore plays out while he stays (the system unhides stragglers either way).
 */
export function stepKlodder(k: KlodderState, ctx: MonsterContext): KlodderResult {
  const me = innerOf(k);
  const body = me.body;
  const ms = ctx.dt * 1000;
  if (!me.greeted) {
    me.greeted = true;
    ctx.say('Hihihi!');
  }
  k.ageMs += ms;
  if (k.ageMs >= KLODDER_TIRED_MS && !k.leaving) {
    k.tired = true;
    k.leaving = true;
  }
  if (k.leaving) {
    if (k.tired && !me.toldTired) {
      me.toldTired = true;
      ctx.say('Ik ben moe');
    }
    k.pose = k.tired ? 'yawn' : 'idle';
    k.target = null;
    me.restore ??= startRestore(ctx);
    return stepRestore(me.restore, ctx, [klodderBox(k)]) ? 'left' : null;
  }

  body.x = k.x;
  body.y = k.y;
  body.z = k.z;
  if (k.ageMs > JUMP_MS && k.pose === 'jump') k.pose = 'idle';

  // Keep away from the kid: the boxes never overlap, and he hops off when the kid comes within 1 block.
  if (boxesOverlap(cellBoxOf(klodderBox(k), KEEP_AWAY), ctx.kidBox)) hopAway(k, body, ctx);

  k.nibbleWaitMs = Math.max(0, k.nibbleWaitMs - ms);
  if (k.pokers > 0) {
    // Someone pokes him: he stands still and does not nibble.
    k.pose = 'idle';
    return null;
  }

  if (k.nibbled < MAX_NIBBLES) {
    if (!k.target) {
      const cell = pickNibbleCell(k, ctx);
      if (cell) {
        k.target = { x: cell.x, y: cell.y, z: cell.z };
        me.targetMs = 0;
      }
    }
    if (k.target) {
      me.targetMs += ms;
      const t = k.target;
      const cx = t.x + 0.5;
      const cz = t.z + 0.5;
      if (Math.hypot(cx - k.x, cz - k.z) <= NIBBLE_REACH) {
        if (k.nibbleWaitMs <= 0) {
          if (canNibble(ctx, t.x, t.y, t.z, k) && ctx.world.hide(t.x, t.y, t.z)) {
            ctx.touch(t.x, t.z);
            ctx.play('knabbel');
            k.nibbled++;
            k.nibbleWaitMs = NIBBLE_GAP_MS;
          }
          k.target = null;
        }
        k.pose = 'idle';
      } else if (me.targetMs > TARGET_GIVE_UP_MS) {
        k.target = null;
      } else {
        stepToward(ctx.world, body, { x: cx, y: t.y + 1, z: cz }, ctx.rng, ctx.dt, {
          speed: KLODDER_SPEED, stuckSeconds: 3, arrive: NIBBLE_REACH - 0.1, box: KLODDER_BOX,
        });
        k.x = body.x;
        k.y = body.y;
        k.z = body.z;
        k.heading = body.heading;
        k.pose = 'walk';
      }
    } else {
      k.pose = 'idle';
    }
  } else {
    k.pose = 'idle';
  }
  return null;
}

/** A box grown by `by` blocks on every side. */
function cellBoxOf(b: Box, by: number): Box {
  return [b[0] - by, b[1] - by, b[2] - by, b[3] + by, b[4] + by, b[5] + by];
}

