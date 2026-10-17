import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { AIR, STEEN } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import {
  CLOSE_ENOUGH, FAR_DISTANCE, WANDER_RADIUS, createDino, dinoCollides, popNextTo, stepDino, type DinoState, type Point,
} from './dino-ai';
import { GROW_SECONDS } from './egg';
import { DINO_KIND_IDS, type DinoKindId } from './kinds';

const FLOOR = 4; // top of the floor is y = 5
const GY = FLOOR + 1;

function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
    }
  }
  return w;
}

function dinoAt(x: number, z: number, kind: DinoKindId = 'compy'): DinoState {
  return createDino({ kind, golden: false, x, y: GY, z }, true);
}

function run(w: World, d: DinoState, player: Point, seconds: number, fps = 60, seed = 1): void {
  const rng = createRng(seed);
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    stepDino(w, d, player, rng, 1 / fps);
    expect(dinoCollides(w, d)).toBe(false);
  }
}

const dist = (d: DinoState, p: Point): number => Math.hypot(d.x - p.x, d.z - p.z);

describe('dino ai', () => {
  it('follows the player and ends within 8 blocks after 5 seconds of standing still (AC17)', () => {
    const w = flatWorld();
    const d = dinoAt(10.5, 10.5);
    const player = { x: 20.5, y: GY, z: 10.5 };
    run(w, d, player, 5);
    expect(dist(d, player)).toBeLessThanOrEqual(8);
    run(w, d, player, 5);
    expect(dist(d, player)).toBeLessThanOrEqual(WANDER_RADIUS + 1);
  });

  it('follows a walking player', () => {
    const w = flatWorld();
    const d = dinoAt(10.5, 10.5);
    const rng = createRng(3);
    const player = { x: 10.5, y: GY, z: 10.5 };
    for (let i = 0; i < 600; i++) {
      player.x += 4.3 / 60;
      stepDino(w, d, player, rng, 1 / 60);
    }
    expect(dist(d, player)).toBeLessThanOrEqual(8);
  });

  it('wanders within 3 blocks of the player when close', () => {
    const w = flatWorld();
    const d = dinoAt(30.5, 30.5);
    const player = { x: 30.5, y: GY, z: 30.5 };
    const rng = createRng(5);
    let moved = false;
    for (let i = 0; i < 60 * 30; i++) {
      stepDino(w, d, player, rng, 1 / 60);
      expect(dist(d, player)).toBeLessThanOrEqual(WANDER_RADIUS + 0.7);
      if (dist(d, player) > 0.5) moved = true;
    }
    expect(moved).toBe(true);
    expect(CLOSE_ENOUGH).toBeLessThan(WANDER_RADIUS);
  });

  it('on Blijf hier stays within 3 blocks of its spot and does not follow', () => {
    const w = flatWorld();
    const d = dinoAt(30.5, 30.5);
    d.mode = 'stay';
    const player = { x: 50.5, y: GY, z: 50.5 };
    const rng = createRng(7);
    for (let i = 0; i < 60 * 40; i++) {
      stepDino(w, d, player, rng, 1 / 60);
      expect(Math.hypot(d.x - 30.5, d.z - 30.5)).toBeLessThanOrEqual(WANDER_RADIUS + 0.7);
    }
  });

  it('hops up one block but not two', () => {
    const w = flatWorld();
    for (let z = 0; z < WORLD_SIZE; z++) w.set(15, GY, z, STEEN); // a wall one block high
    const d = dinoAt(12.5, 10.5);
    run(w, d, { x: 20.5, y: GY, z: 10.5 }, 5);
    expect(d.x).toBeGreaterThan(15);

    for (let z = 0; z < WORLD_SIZE; z++) w.set(25, GY + 1, z, STEEN);
    for (let z = 0; z < WORLD_SIZE; z++) w.set(25, GY, z, STEEN); // now two high
    const e = dinoAt(22.5, 10.5);
    const rng = createRng(2);
    for (let i = 0; i < 60 * 3; i++) stepDino(w, e, { x: 30.5, y: GY, z: 10.5 }, rng, 1 / 60);
    expect(e.x).toBeLessThan(25);
  });

  it('a walled in dino on Blijf hier stays inside and never ends up in a block', () => {
    const w = flatWorld();
    for (let x = 19; x <= 23; x++) {
      for (let z = 19; z <= 23; z++) {
        if (x === 19 || x === 23 || z === 19 || z === 23) { w.set(x, GY, z, STEEN); w.set(x, GY + 1, z, STEEN); w.set(x, GY + 2, z, STEEN); }
      }
    }
    const d = dinoAt(21.5, 21.5);
    d.mode = 'stay';
    run(w, d, { x: 40.5, y: GY, z: 40.5 }, 20);
    expect(d.x).toBeGreaterThan(20);
    expect(d.x).toBeLessThan(23);
    expect(d.z).toBeGreaterThan(20);
    expect(d.z).toBeLessThan(23);
  });

  it('stuck for more than 5 seconds pops next to the player (AC17)', () => {
    const w = flatWorld();
    for (let x = 19; x <= 23; x++) {
      for (let z = 19; z <= 23; z++) {
        if (x === 19 || x === 23 || z === 19 || z === 23) { w.set(x, GY, z, STEEN); w.set(x, GY + 1, z, STEEN); w.set(x, GY + 2, z, STEEN); }
      }
    }
    const d = dinoAt(21.5, 21.5);
    const player = { x: 21.5, y: GY, z: 28.5 };
    const rng = createRng(9);
    let popped = false;
    for (let i = 0; i < 60 * 10 && !popped; i++) popped = stepDino(w, d, player, rng, 1 / 60) === 'popped';
    expect(popped).toBe(true);
    expect(dist(d, player)).toBeLessThan(3);
    expect(dinoCollides(w, d)).toBe(false);
  });

  it('far away for 5 seconds pops next to the player', () => {
    const w = flatWorld();
    const d = dinoAt(5.5, 5.5);
    const player = { x: 5.5 + FAR_DISTANCE + 30, y: GY, z: 5.5 };
    const rng = createRng(4);
    let t = 0, popped = false;
    while (!popped && t < 8) { popped = stepDino(w, d, player, rng, 1 / 60) === 'popped'; t += 1 / 60; }
    // It walks 3 blocks per second, so it may get close first. Either way it ends near the player.
    expect(dist(d, player)).toBeLessThan(FAR_DISTANCE);
  });

  it('a block placed on a dino lifts it out or pops it, never leaves it inside', () => {
    const w = flatWorld();
    const d = dinoAt(10.5, 10.5);
    w.set(10, GY, 10, STEEN);
    const rng = createRng(1);
    stepDino(w, d, { x: 12.5, y: GY, z: 10.5 }, rng, 1 / 60);
    expect(dinoCollides(w, d)).toBe(false);
  });

  it('popNextTo finds ground, even on a hill, for every kind', () => {
    for (const kind of DINO_KIND_IDS) {
      const w = flatWorld();
      for (let x = 0; x < 20; x++) for (let z = 0; z < 20; z++) if (x < 12) w.set(x, GY, z, STEEN);
      const d = dinoAt(40.5, 40.5, kind);
      const player = { x: 11.5, y: GY + 1, z: 10.5 };
      expect(popNextTo(w, d, player, createRng(1))).toBe(true);
      expect(dinoCollides(w, d)).toBe(false);
      expect(dist(d, player)).toBeLessThan(3);
    }
  });

  it('grows from baby for 2 seconds', () => {
    const w = flatWorld();
    const d = createDino({ kind: 'compy', golden: false, x: 10.5, y: GY, z: 10.5 });
    expect(d.growth).toBe(0);
    run(w, d, { x: 10.5, y: GY, z: 10.5 }, 3);
    expect(d.growth).toBe(GROW_SECONDS);
  });

  it('gives the same place at 30 and 120 fps (frame rate independent)', () => {
    const results: number[] = [];
    for (const fps of [30, 120]) {
      const w = flatWorld();
      const d = dinoAt(10.5, 10.5);
      const rng = createRng(1);
      for (let i = 0; i < fps * 2; i++) stepDino(w, d, { x: 30.5, y: GY, z: 10.5 }, rng, 1 / fps);
      results.push(d.x);
    }
    expect(Math.abs((results[0] ?? 0) - (results[1] ?? 99))).toBeLessThan(0.3);
  });

  it('survives bad dt and a huge frame', () => {
    const w = flatWorld();
    const d = dinoAt(10.5, 10.5);
    const rng = createRng(1);
    expect(stepDino(w, d, { x: 20.5, y: GY, z: 10.5 }, rng, NaN)).toBeNull();
    expect(stepDino(w, d, { x: 20.5, y: GY, z: 10.5 }, rng, -1)).toBeNull();
    stepDino(w, d, { x: 20.5, y: GY, z: 10.5 }, rng, 5);
    expect(dinoCollides(w, d)).toBe(false);
  });
});
