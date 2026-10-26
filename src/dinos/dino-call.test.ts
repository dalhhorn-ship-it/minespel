import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { AIR, STEEN } from '../world/blocks';
import { WORLD_HEIGHT, WORLD_SIZE } from '../world/terrain';
import { World } from '../world/world';
import { CALL_ARRIVED, CALL_SECONDS, CALL_SPEED, DINO_SPEED, callDino, createDino, isCalled, stepDino, type DinoState, type Point } from './dino-ai';

const FLOOR = 4;
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

const dist = (d: DinoState, p: Point) => Math.hypot(d.x - p.x, d.z - p.z);

function run(w: World, d: DinoState, player: Point, seconds: number, yaw?: number): 'popped' | null {
  const rng = createRng(7);
  let ev: 'popped' | null = null;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    ev = stepDino(w, d, player, rng, 1 / 60, { playerYaw: yaw }) ?? ev;
  }
  return ev;
}

describe('Dinofluit call (decision 114)', () => {
  it('walks slower than a normal dino', () => {
    expect(CALL_SPEED).toBeLessThan(DINO_SPEED);
  });

  it('turns a Blijf hier dino into a follower and starts the call', () => {
    const d = createDino({ kind: 'compy', golden: false, x: 10.5, y: GY, z: 10.5 }, true);
    d.mode = 'stay';
    callDino(d);
    expect(d.mode).toBe('follow');
    expect(isCalled(d)).toBe(true);
    expect(d.called).toBe(CALL_SECONDS);
  });

  it('walks to the kid at the slow speed and never pops while it can walk', () => {
    const w = flatWorld();
    const d = createDino({ kind: 'compy', golden: false, x: 10.5, y: GY, z: 30.5 }, true);
    const player = { x: 10.5, y: GY, z: 10.5 };
    run(w, d, player, 0.5);
    callDino(d);
    const start = dist(d, player);
    const ev = run(w, d, player, 2);
    // 2 seconds at CALL_SPEED, give or take a step: slow, not a jump.
    expect(start - dist(d, player)).toBeGreaterThan(CALL_SPEED * 2 * 0.8);
    expect(start - dist(d, player)).toBeLessThanOrEqual(CALL_SPEED * 2 + 0.1);
    expect(ev).toBeNull();
    // Far away for more than 5 seconds: a normal follower would pop, a called dino keeps walking.
    expect(run(w, d, player, 5, 0)).toBeNull();
    run(w, d, player, 10, 0);
    expect(isCalled(d)).toBe(false);
  });

  it('ends the call once it is near the kid', () => {
    const w = flatWorld();
    const d = createDino({ kind: 'compy', golden: false, x: 10.5, y: GY, z: 18.5 }, true);
    const player = { x: 10.5, y: GY, z: 10.5 };
    callDino(d);
    run(w, d, player, 6);
    expect(isCalled(d)).toBe(false);
    expect(dist(d, player)).toBeLessThanOrEqual(CALL_ARRIVED + 3);
  });

  it('stops calling after CALL_SECONDS even when the kid keeps running away', () => {
    const w = flatWorld();
    const d = createDino({ kind: 'compy', golden: false, x: 5.5, y: GY, z: 5.5 }, true);
    callDino(d);
    const rng = createRng(3);
    for (let i = 0; i < Math.round((CALL_SECONDS + 1) * 60); i++) {
      // The kid stays far ahead.
      stepDino(w, d, { x: d.x + 20, y: GY, z: d.z }, rng, 1 / 60);
    }
    expect(isCalled(d)).toBe(false);
  });
});
