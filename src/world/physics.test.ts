import { describe, expect, it } from 'vitest';
import { AIR, LAVA, STEEN, VUUR, WATER } from './blocks';
import {
  PLAYER_HEIGHT, PLAYER_WIDTH, collides, createPlayer, stepPlayer, type PlayerInput, type PlayerState,
} from './physics';
import { WORLD_HEIGHT, WORLD_SIZE } from './terrain';
import { World } from './world';

const FLOOR = 4; // top of the floor is y = 5
const none: PlayerInput = { moveX: 0, moveZ: 0, jump: false };

function flatWorld(): World {
  const w = new World();
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let z = 0; z < WORLD_SIZE; z++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) w.set(x, y, z, y <= FLOOR ? STEEN : AIR);
    }
  }
  return w;
}

function run(world: World, p: PlayerState, input: PlayerInput, seconds: number, fps: number): void {
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i++) stepPlayer(world, p, input, 1 / fps);
}

describe('player physics', () => {
  it('falls and rests on the floor', () => {
    const w = flatWorld();
    const p = createPlayer(10.5, 12, 10.5);
    run(w, p, none, 2, 60);
    expect(p.y).toBeCloseTo(FLOOR + 1, 3);
    expect(p.onGround).toBe(true);
  });

  it('walls at all four edges: cannot leave the world (AC2)', () => {
    const w = flatWorld();
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [mx, mz] of dirs) {
      const p = createPlayer(WORLD_SIZE / 2, FLOOR + 1, WORLD_SIZE / 2);
      run(w, p, { moveX: mx, moveZ: mz, jump: false }, 20, 60);
      const h = PLAYER_WIDTH / 2;
      expect(p.x - h).toBeGreaterThanOrEqual(0);
      expect(p.z - h).toBeGreaterThanOrEqual(0);
      expect(p.x + h).toBeLessThanOrEqual(WORLD_SIZE);
      expect(p.z + h).toBeLessThanOrEqual(WORLD_SIZE);
      expect(Math.abs(mx * (p.x - WORLD_SIZE / 2) + mz * (p.z - WORLD_SIZE / 2))).toBeGreaterThan(WORLD_SIZE / 2 - 1);
    }
  });

  it('cannot fall out of the bottom of the world', () => {
    const w = new World();
    for (let y = 0; y < WORLD_HEIGHT; y++) w.set(3, y, 3, AIR);
    const p = createPlayer(3.5, 20, 3.5);
    run(w, p, none, 5, 60);
    expect(p.y).toBeGreaterThanOrEqual(0);
  });

  it('jump lands on a block one higher (AC9)', () => {
    const w = flatWorld();
    w.set(10, FLOOR + 1, 10, STEEN);
    const p = createPlayer(8.5, FLOOR + 1, 10.5);
    run(w, p, none, 0.5, 60);
    expect(p.onGround).toBe(true);
    // Jump and walk toward the block.
    stepPlayer(w, p, { moveX: 1, moveZ: 0, jump: true }, 1 / 60);
    run(w, p, { moveX: 1, moveZ: 0, jump: false }, 0.5, 60);
    expect(p.onGround).toBe(true);
    expect(p.y).toBeCloseTo(FLOOR + 2, 3);
    expect(p.x).toBeGreaterThan(10);
  });

  it('cannot walk up a one block step without jumping', () => {
    const w = flatWorld();
    w.set(10, FLOOR + 1, 10, STEEN);
    const p = createPlayer(8.5, FLOOR + 1, 10.5);
    run(w, p, { moveX: 1, moveZ: 0, jump: false }, 2, 60);
    expect(p.y).toBeCloseTo(FLOOR + 1, 3);
    expect(p.x + PLAYER_WIDTH / 2).toBeLessThanOrEqual(10);
  });

  it('cannot jump up two blocks', () => {
    const w = flatWorld();
    w.set(10, FLOOR + 1, 10, STEEN);
    w.set(10, FLOOR + 2, 10, STEEN);
    const p = createPlayer(8.5, FLOOR + 1, 10.5);
    run(w, p, none, 0.5, 60);
    for (let i = 0; i < 180; i++) {
      stepPlayer(w, p, { moveX: 1, moveZ: 0, jump: true }, 1 / 60);
      expect(p.x + PLAYER_WIDTH / 2).toBeLessThanOrEqual(10);
      expect(p.y).toBeLessThan(FLOOR + 1 + 1.5);
    }
  });

  it('does not jump in mid air', () => {
    const w = flatWorld();
    const p = createPlayer(10.5, FLOOR + 5, 10.5);
    stepPlayer(w, p, { ...none, jump: true }, 1 / 60);
    expect(p.vy).toBeLessThan(0);
  });

  it('stops under a ceiling', () => {
    const w = flatWorld();
    w.set(10, FLOOR + 3, 10, STEEN); // ceiling 2 above the floor: head room 2 blocks
    const p = createPlayer(10.5, FLOOR + 1, 10.5);
    for (let i = 0; i < 60; i++) stepPlayer(w, p, { ...none, jump: true }, 1 / 60);
    expect(collides(w, p.x, p.y, p.z)).toBe(false);
    expect(p.y + PLAYER_HEIGHT).toBeLessThanOrEqual(FLOOR + 3 + 1e-6);
  });

  it('building up: place under your feet and stand on it', () => {
    const w = flatWorld();
    const p = createPlayer(10.5, FLOOR + 1, 10.5);
    stepPlayer(w, p, { ...none, jump: true }, 1 / 60);
    run(w, p, none, 0.2, 60);
    w.set(10, FLOOR + 1, 10, STEEN);
    run(w, p, none, 1, 60);
    expect(p.onGround).toBe(true);
    expect(p.y).toBeCloseTo(FLOOR + 2, 3);
  });

  it('is frame rate independent', () => {
    const results = [30, 60, 120].map((fps) => {
      const w = flatWorld();
      const p = createPlayer(10.5, FLOOR + 1, 10.5);
      run(w, p, none, 0.5, fps);
      stepPlayer(w, p, { moveX: 1, moveZ: 0.5, jump: true }, 1 / fps);
      run(w, p, { moveX: 1, moveZ: 0.5, jump: false }, 0.5 - 1 / fps, fps);
      return p;
    });
    for (const r of results) {
      expect(r.x).toBeCloseTo(results[0]!.x, 1);
      expect(r.y).toBeCloseTo(results[0]!.y, 1);
      expect(r.z).toBeCloseTo(results[0]!.z, 1);
    }
  });

  it('a very long frame is capped and does not tunnel through the floor', () => {
    const w = flatWorld();
    const p = createPlayer(10.5, FLOOR + 3, 10.5);
    stepPlayer(w, p, none, 5);
    run(w, p, none, 1, 60);
    expect(p.y).toBeCloseTo(FLOOR + 1, 3);
  });

  it('ignores bad input', () => {
    const w = flatWorld();
    const p = createPlayer(10.5, FLOOR + 1, 10.5);
    stepPlayer(w, p, { moveX: NaN, moveZ: Infinity, jump: false }, 1 / 60);
    stepPlayer(w, p, none, -1);
    expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
  });

  it('AC157: player cannot walk into a cell holding water, lava or vuur (G1)', () => {
    for (const id of [WATER, LAVA, VUUR]) {
      const w = flatWorld();
      w.set(10, FLOOR + 1, 10, id);
      const p = createPlayer(8.5, FLOOR + 1, 10.5);
      run(w, p, { moveX: 1, moveZ: 0, jump: false }, 2, 60);
      expect(p.x + PLAYER_WIDTH / 2).toBeLessThanOrEqual(10);
      expect(collides(w, p.x, p.y, p.z)).toBe(false);
    }
  });

  it('AC158: after placing water, lava and vuur and stepping for 60s, no other cell changes (G1)', () => {
    const w = flatWorld();
    w.set(12, FLOOR + 1, 10, WATER);
    w.set(14, FLOOR + 1, 10, LAVA);
    w.set(16, FLOOR + 1, 10, VUUR);
    const before = w.diff();
    const p = createPlayer(10.5, FLOOR + 1, 10.5);
    run(w, p, none, 60, 60);
    expect(w.diff()).toEqual(before);
  });
});
