// The mole (v16, decision 138): walks by path (mole-path.ts, path-follow.ts) to the nearest animal on Vrij rondlopen,
// "Boe!" and the tease, the fence rule, "Niemand om mee te spelen...", tired after MOLE_TIRED_MS and keeping clear
// of the kid. He never sets, breaks or hides a block.
//
// The contract with the monster system:
//  * `stepMole` is called every step while `phase` is `out` or `leaving`, with the loop dt in `ctx.dt` (seconds).
//  * The system adds `dt` to `phaseMs` (rumble, leaving) and `outMs` (out) BEFORE the call.
//  * To make him go, set `mole.phase = 'leaving'` (and `pose = 'sink'`); the system sees the change, plays `plop`,
//    resets `phaseMs` and removes him after LEAVE_MS. In `leaving`, `stepMole` only moves `y` down and sets the pose.
//  * `mole.x`, `y`, `z` are the feet centre; only `stepMole` (the follower) moves him, never physics.
import type { DinoState, Point } from '../dinos/dino-ai';
import type { Box } from '../world/build';
import { isSolid } from '../world/blocks';
import type { World } from '../world/world';
import { freeMoleChasers } from './mole-moed';
import { isMoleTarget } from './mole-wake';
import { findMolePath, nearKid, stepCells, isStandCell } from './mole-path';
import { followPath } from './path-follow';
import { teaseAnimal } from './tease';
import {
  FENCE_MS, LEAVE_MS, LONELY_MS, MOLE_BOX, MOLE_SPEED, MOLE_TIRED_MS, SEARCH_EVERY_MS,
  type Cell, type MoleState, type MonsterContext,
} from './monster-types';

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

/** One step of loop time: the walk, the tease, the fence rule and the reasons to leave. */
export function stepMole(mole: MoleState, ctx: MonsterContext): void {
  if (mole.phase === 'leaving') {
    // He sinks into the ground over LEAVE_MS; the system plays `plop` and removes him.
    mole.pose = 'sink';
    mole.path = null;
    freeMoleChasers(ctx);
    mole.y -= (ctx.dt * 1000 / LEAVE_MS) * MOLE_BOX.height;
    return;
  }
  if (mole.phase !== 'out') return;
  const ms = ctx.dt * 1000;
  const leave = (line: string, sound: Parameters<MonsterContext['play']>[0]): void => {
    ctx.say(line, 3000);
    ctx.play(sound);
    mole.phase = 'leaving';
    mole.path = null;
    mole.pose = 'sink';
  };
  if (mole.outMs >= MOLE_TIRED_MS) return leave('Ik ga slapen', 'geeuw');
  if (mole.pose === 'rise' && mole.phaseMs >= RISE_MS) mole.pose = 'walk';
  // While a knight pokes him he stands still (V16d).
  if (mole.pokers > 0) {
    mole.path = null;
    mole.searchMs = 0;
    return;
  }

  const here: Cell = { x: Math.floor(mole.x), y: Math.round(mole.y), z: Math.floor(mole.z) };
  const kid: Cell = { x: Math.floor(ctx.kid.x), y: Math.floor(ctx.kid.y), z: Math.floor(ctx.kid.z) };
  const all = (ctx.animals?.() ?? []).filter(isMoleTarget);
  const candidates = all.filter((a) => idOf(a) !== mole.lastTeased
    && Math.abs(a.x - mole.x) <= REACH_XZ && Math.abs(a.z - mole.z) <= REACH_XZ && Math.abs(a.y - mole.y) <= REACH_Y);

  // No one to play with: 60 seconds.
  if (all.filter((a) => idOf(a) !== mole.lastTeased).length === 0) {
    mole.lonelyMs += ms;
    mole.target = null;
    mole.path = null;
    if (mole.lonelyMs >= LONELY_MS) return leave('Niemand om mee te spelen...', 'hmpf');
    return;
  }
  mole.lonelyMs = 0;

  // Keep clear of the kid: step to the neighbour cell farthest from him, or stand.
  if (nearKid(here, kid)) {
    const dist = (c: Cell): number => Math.max(Math.abs(c.x - kid.x), Math.abs(c.z - kid.z));
    let best: Cell | null = null;
    for (const c of stepCells(ctx.world, here, 1)) {
      if (dist(c) > dist(here) && (!best || dist(c) > dist(best))) best = c;
    }
    mole.path = best ? [best] : null;
    mole.target = null;
    mole.searchMs = 0;
  }

  // The tease: within 1 block (cells) of a target animal.
  for (const a of candidates) {
    if (canTeaseFrom(ctx.world, here, { x: Math.floor(a.x), y: Math.floor(a.y), z: Math.floor(a.z) })) {
      ctx.say('Boe!', 2000);
      ctx.play('boe');
      teaseAnimal(ctx.world, a, ctx.rng, ctx.play);
      mole.lastTeased = idOf(a);
      mole.target = null;
      mole.path = null;
      mole.noPathMs = 0;
      mole.searchMs = SEARCH_EVERY_MS;
      mole.pose = 'boe';
      return;
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
  if (!mole.path) {
    // Nothing to walk: with a target around but no way, the fence rule counts (not while he keeps clear of the kid).
    if (!nearKid(here, kid)) mole.noPathMs += ms;
    if (mole.noPathMs >= FENCE_MS) leave('Hmpf! Ik kan er niet bij.', 'hmpf');
    return;
  }

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
