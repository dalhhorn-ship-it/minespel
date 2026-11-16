// The mole (v16, decision 138, changed in v22, decision 144): walks by path (mole-path.ts, path-follow.ts) to the nearest
// unguarded animal on Vrij rondlopen, "Boe!" and the tease (at most once per 15 s), the fence rule, "Niemand om mee te
// spelen..." and keeping clear of the kid. From v22 he never leaves by himself: with nobody to play with he waddles within
// 6 blocks of where he came up and says the lonely line once; a closed pen (hmpf, at most once a minute) only makes him
// wait; with every animal guarded he teases nobody and keeps more than 16 (22 with the Koningsbanier) blocks from every
// guard knight when he can. He never sets, breaks or hides a block.
//
// The contract with the slot (mole-slot.ts):
//  * `stepMole` is called every step while `phase` is `out` or `leaving`, with the loop dt in `ctx.dt` (seconds).
//  * The slot adds `dt` to `phaseMs` and `outMs` BEFORE the call and does the pen check, the away state and the save.
//  * A caught mole is not moved here. In `leaving`, `stepMole` only moves `y` down and sets the pose.
//  * `mole.x`, `y`, `z` are the feet centre; only `stepMole` (the follower) moves him, never physics.
import type { DinoState, Point } from '../dinos/dino-ai';
import type { Box } from '../world/build';
import { isSolid } from '../world/blocks';
import type { World } from '../world/world';
import { noticeBonus } from '../knights/gear';
import { NOTICE_GUARD } from './moed';
import { LINE_LONELY, LINE_NO_REACH } from './mole-lines';
import { freeMoleChasers } from './mole-moed';
import { isMoleTarget } from './mole-wake';
import { findMolePath, nearKid, stepCells, isStandCell } from './mole-path';
import { followPath } from './path-follow';
import { teaseAnimal } from './tease';
import {
  FENCE_MS, LEAVE_MS, LONELY_MS, MOLE_BOX, MOLE_SPEED, SEARCH_EVERY_MS,
  type Cell, type MoleState, type MonsterContext,
} from './monster-types';

/** His line when every animal has a guard knight (AC332). */
export const LINE_ALL_GUARDED = 'Hmpf! Overal ridders...';
/** Loop ms between two teases (AC295). */
export const TEASE_GAP_MS = 15_000;
/** Loop ms between two of his "can't reach" or "ridders" lines (AC295, AC332). */
export const HMPF_GAP_MS = 60_000;
/** With nobody to play with he stays within this many blocks of where he came up (AC295). */
export const HOME_RADIUS = 6;

/** Targets within this many blocks along x and z, and up or down, of him (decision 138). */
const REACH_XZ = 24;
const REACH_Y = 8;
/** Loop ms the "rise" pose lasts. */
const RISE_MS = 1000;

const ids = new WeakMap<DinoState, string>();
let nextId = 1;
/** A stable id for an animal (the list has no ids of its own). */
function idOf(a: DinoState): string {
  let id = ids.get(a);
  if (!id) {
    id = `a${nextId++}`;
    ids.set(a, id);
  }
  return id;
}

/**
 * True when the mole in cell `here` may tease the animal in cell `a`: the same cell or a side neighbour, or a diagonal
 * one with at least one of the two cells between free (not blocked 2 high). A fence 2 high stops him (AC249); he never
 * teases across a wall corner.
 */
export function canTeaseFrom(world: World, here: Cell, a: Cell): boolean {
  if (Math.abs(a.x - here.x) > 1 || Math.abs(a.z - here.z) > 1 || Math.abs(a.y - here.y) > 1) return false;
  if (a.x === here.x || a.z === here.z) return true;
  const y = Math.max(here.y, a.y);
  const open = (x: number, z: number): boolean => !isSolid(world.get(x, y, z)) && !isSolid(world.get(x, y + 1, z));
  return open(a.x, here.z) || open(here.x, a.z);
}

/** He comes up at `at` (feet centre) after the rumble. */
export function createMole(at: Point, digColumn: { x: number; z: number }): MoleState {
  return {
    id: 0, caught: false, home: { x: at.x, z: at.z }, dove: null, awayMs: 0, teaseWaitMs: 0, hmpfWaitMs: 0,
    lonelySaid: false, reach: null, dirty: false, saveMs: 0,
    phase: 'out', x: at.x, y: at.y, z: at.z, heading: 0, phaseMs: 0, outMs: 0, noPathMs: 0, lonelyMs: 0, searchMs: 0,
    target: null, lastTeased: null, path: null, moed: 0, pokers: 0, digColumn: { ...digColumn }, pose: 'rise',
  };
}

/** The mole during the rumble: not in the world yet, only the dig column is known. */
export function createRumble(digColumn: { x: number; z: number }, y: number): MoleState {
  return { ...createMole({ x: digColumn.x + 0.5, y, z: digColumn.z + 0.5 }, digColumn), phase: 'rumble', pose: undefined };
}

export function moleBox(m: MoleState): Box {
  const h = MOLE_BOX.side / 2;
  return [m.x - h, m.y, m.z - h, m.x + h, m.y + MOLE_BOX.height, m.z + h];
}


type PlayState = 'lonely' | 'guarded' | 'far' | 'play';
const lastState = new WeakMap<MoleState, PlayState>();
/** Loop ms until the next waddle step. */
const waddleClock = new WeakMap<MoleState, number>();

/** True when the point is farther than every visible guard knight's watch (16, or 22 with the Koningsbanier) along x and z. */
export function awayFromGuards(ctx: MonsterContext, x: number, z: number): boolean {
  for (const kn of ctx.knights()) {
    if (kn.mode !== 'guard' || !kn.visible) continue;
    const limit = NOTICE_GUARD + noticeBonus(kn.gear);
    if (Math.abs(x - kn.body.x) <= limit && Math.abs(z - kn.body.z) <= limit) return false;
  }
  return true;
}

const homeDistance = (mole: MoleState, c: Cell): number => Math.hypot(c.x + 0.5 - mole.home.x, c.z + 0.5 - mole.home.z);

/**
 * One small step now and then, so he looks alive: every 1.5 to 4 s one neighbour cell, never next to the kid, never on
 * the Lavakip-bar's cells and only where `ok` says. Does nothing while he walks a path.
 */
function waddle(mole: MoleState, ctx: MonsterContext, here: Cell, kid: Cell, ms: number, ok: (c: Cell) => boolean): void {
  if (mole.path) return;
  const left = (waddleClock.get(mole) ?? 0) - ms;
  if (left > 0) {
    waddleClock.set(mole, left);
    return;
  }
  waddleClock.set(mole, 1500 + Math.floor(ctx.rng.next() * 2500));
  const options = stepCells(ctx.world, here, 1).filter((c) => !nearKid(c, kid) && ok(c) && !ctx.keepOut?.(c.x, c.y, c.z));
  if (options.length === 0) return;
  mole.path = [options[Math.floor(ctx.rng.next() * options.length)] as Cell];
}

/** Stand cells farther than the guards' watch, within the search box of `here`: where he goes when every animal is guarded. */
function farGoals(ctx: MonsterContext, here: Cell, kid: Cell): Cell[] {
  const goals: Cell[] = [];
  for (let x = here.x - REACH_XZ; x <= here.x + REACH_XZ; x++) {
    for (let z = here.z - REACH_XZ; z <= here.z + REACH_XZ; z++) {
      if (!awayFromGuards(ctx, x + 0.5, z + 0.5)) continue;
      for (let y = here.y + 7; y >= here.y - 7; y--) {
        if (!isStandCell(ctx.world, x, y, z, 1)) continue;
        const c: Cell = { x, y, z };
        if (!nearKid(c, kid) && !ctx.keepOut?.(x, y, z)) goals.push(c);
        break;
      }
    }
  }
  return goals;
}

/** One step of loop time: the walk, the tease, the fence rule and the waits. He never leaves by himself (AC295). */
export function stepMole(mole: MoleState, ctx: MonsterContext): void {
  if (mole.phase === 'leaving') {
    // He sinks into the ground over LEAVE_MS; the slot plays `plop` and removes him or sends him away.
    mole.pose = 'sink';
    mole.path = null;
    freeMoleChasers(ctx);
    mole.y -= (ctx.dt * 1000 / LEAVE_MS) * MOLE_BOX.height;
    return;
  }
  if (mole.phase !== 'out' || mole.caught) return;
  const ms = ctx.dt * 1000;
  mole.teaseWaitMs = Math.max(0, mole.teaseWaitMs - ms);
  mole.hmpfWaitMs = Math.max(0, mole.hmpfWaitMs - ms);
  if (mole.pose === 'rise' && mole.phaseMs >= RISE_MS) mole.pose = 'walk';
  // While a knight pokes him he stands still (V16d).
  if (mole.pokers > 0) {
    mole.path = null;
    mole.searchMs = 0;
    return;
  }

  const here: Cell = { x: Math.floor(mole.x), y: Math.round(mole.y), z: Math.floor(mole.z) };
  const kid: Cell = { x: Math.floor(ctx.kid.x), y: Math.floor(ctx.kid.y), z: Math.floor(ctx.kid.z) };
  const alive = (ctx.animals?.() ?? []).filter(isMoleTarget);
  const unguarded = alive.filter((a) => ctx.isGuarded?.(a) !== true);
  let pool = unguarded.filter((a) => idOf(a) !== mole.lastTeased);
  // One animal only: after the wait he may tease it again (nobody else to pick).
  if (pool.length === 0 && unguarded.length === 1 && mole.teaseWaitMs <= 0) {
    mole.lastTeased = null;
    pool = unguarded;
  }
  const candidates = pool.filter((a) => Math.abs(a.x - mole.x) <= REACH_XZ && Math.abs(a.z - mole.z) <= REACH_XZ && Math.abs(a.y - mole.y) <= REACH_Y);
  const state: PlayState = alive.length === 0 ? 'lonely' : unguarded.length === 0 ? 'guarded' : candidates.length === 0 ? 'far' : 'play';
  if (lastState.get(mole) !== state) {
    lastState.set(mole, state);
    mole.path = null;
    mole.target = null;
    mole.searchMs = 0;
    mole.noPathMs = 0;
  }

  // Nobody to play with: the lonely line once, after 60 s.
  if (state === 'lonely') {
    mole.lonelyMs += ms;
    if (mole.lonelyMs >= LONELY_MS && !mole.lonelySaid) {
      mole.lonelySaid = true;
      ctx.say(LINE_LONELY, 3000, 'mole');
      ctx.play('hmpf');
    }
  } else mole.lonelyMs = 0;

  // Keep clear of the kid: step to the neighbour cell farthest from him, or stand.
  if (nearKid(here, kid)) {
    const dist = (c: Cell): number => Math.max(Math.abs(c.x - kid.x), Math.abs(c.z - kid.z));
    const homeBound = state === 'lonely';
    let best: Cell | null = null;
    let bestHome = false;
    for (const c of stepCells(ctx.world, here, 1)) {
      if (dist(c) <= dist(here)) continue;
      const inHome = !homeBound || homeDistance(mole, c) <= HOME_RADIUS;
      if (!best || (inHome && !bestHome) || (inHome === bestHome && dist(c) > dist(best))) {
        best = c;
        bestHome = inHome;
      }
    }
    mole.path = best ? [best] : null;
    mole.target = null;
    mole.searchMs = 0;
  }

  if (state === 'lonely') {
    waddle(mole, ctx, here, kid, ms, (c) => homeDistance(mole, c) <= HOME_RADIUS || homeDistance(mole, c) < homeDistance(mole, here));
  } else if (state === 'far') {
    waddle(mole, ctx, here, kid, ms, () => true);
  } else if (state === 'guarded') {
    if (mole.hmpfWaitMs <= 0) {
      mole.hmpfWaitMs = HMPF_GAP_MS;
      ctx.say(LINE_ALL_GUARDED, 3000, 'mole');
      ctx.play('hmpf');
    }
    mole.searchMs -= ms;
    const safe = awayFromGuards(ctx, mole.x, mole.z);
    if (safe) {
      waddle(mole, ctx, here, kid, ms, (c) => awayFromGuards(ctx, c.x + 0.5, c.z + 0.5));
    } else if (mole.searchMs <= 0 && !(mole.path && nearKid(here, kid))) {
      mole.searchMs = SEARCH_EVERY_MS;
      const goals = farGoals(ctx, here, kid);
      mole.path = goals.length > 0 ? findMolePath(ctx.world, here, goals, { headroom: 1, avoid: kid }) : null;
    }
  } else {
    // The tease: within 1 block (cells) of a target animal, at most once per 15 s.
    if (mole.teaseWaitMs <= 0) {
      for (const a of candidates) {
        if (canTeaseFrom(ctx.world, here, { x: Math.floor(a.x), y: Math.floor(a.y), z: Math.floor(a.z) })) {
          ctx.say('Boe!', 2000);
          ctx.play('boe');
          teaseAnimal(ctx.world, a, ctx.rng, ctx.play);
          mole.lastTeased = idOf(a);
          mole.teaseWaitMs = TEASE_GAP_MS;
          mole.target = null;
          mole.path = null;
          mole.noPathMs = 0;
          mole.searchMs = SEARCH_EVERY_MS;
          mole.pose = 'boe';
          return;
        }
      }
    }

    // A search every SEARCH_EVERY_MS; the nearest target by path.
    mole.searchMs -= ms;
    if (mole.searchMs <= 0 && !(mole.path && nearKid(here, kid))) {
      mole.searchMs = SEARCH_EVERY_MS;
      const goals: Cell[] = [];
      const owner: Array<{ cell: Cell; id: string }> = [];
      for (const a of candidates) {
        const ax = Math.floor(a.x);
        const az = Math.floor(a.z);
        const ay = Math.floor(a.y);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            for (let y = ay - 1; y <= ay + 1; y++) {
              if (!isStandCell(ctx.world, ax + dx, y, az + dz, 1)) continue;
              if (!canTeaseFrom(ctx.world, { x: ax + dx, y, z: az + dz }, { x: ax, y: ay, z: az })) continue;
              goals.push({ x: ax + dx, y, z: az + dz });
              owner.push({ cell: { x: ax + dx, y, z: az + dz }, id: idOf(a) });
            }
          }
        }
      }
      const found = candidates.length > 0 ? findMolePath(ctx.world, here, goals, { headroom: 1, avoid: kid }) : null;
      if (found) {
        const last = found[found.length - 1] as Cell;
        mole.target = owner.find((o) => o.cell.x === last.x && o.cell.y === last.y && o.cell.z === last.z)?.id ?? null;
        mole.path = found;
        mole.noPathMs = 0;
      } else {
        mole.path = null;
        mole.target = null;
      }
    }
    if (!mole.path || mole.target === null) {
      // A target around but no way: the fence rule. He only waits (or waddles) and says so, at most once a minute
      // (AC295); it does not count while he keeps clear of the kid.
      if (!nearKid(here, kid)) mole.noPathMs += ms;
      if (mole.noPathMs >= FENCE_MS && mole.hmpfWaitMs <= 0) {
        mole.hmpfWaitMs = HMPF_GAP_MS;
        ctx.say(LINE_NO_REACH, 3000, 'mole');
        ctx.play('hmpf');
      }
      waddle(mole, ctx, here, kid, ms, (c) => homeDistance(mole, c) <= HOME_RADIUS || homeDistance(mole, c) < homeDistance(mole, here));
    }
  }
  if (!mole.path) return;

  const result = followPath(ctx.world, mole, mole.path, ctx.dt, MOLE_SPEED, { headroom: 1, kid });
  if (result === 'replan') {
    mole.searchMs = 0;
    mole.path = null;
  } else if (result === 'arrived') {
    mole.path = null;
  } else if (result === 'moving' && mole.pose !== 'rise') {
    mole.pose = 'walk';
  }
}
