import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { hazardAt } from '../dinos/dino-ai';
import { LAVA } from '../world/blocks';
import { START_SPOT } from '../world/terrain';
import { World } from '../world/world';
import { createKnightBody, stepKnight, stepToward } from './knight-ai';
import { KNIGHT_BOX, SALUTE_GAP_MS, type KnightMode, type KnightState } from './knight-types';

const DT = 1 / 30;
const STONE = 3;
function groundY(world: World, x: number, z: number): number {
  let y = 60;
  while (y > 0 && world.get(Math.floor(x), y - 1, Math.floor(z)) === 0) y--;
  return y;
}
function make(mode: KnightMode, x: number, z: number, world: World): KnightState {
  const y = groundY(world, x, z);
  const spot = mode === 'follow' ? null : { x, y, z };
  const body = createKnightBody({ x, y, z });
  body.stayX = x; body.stayZ = z;
  return { id: 'k', mode, spot, boughtFor: 0, body, chase: null, saluteClockMs: 0, visible: true };
}

describe('knight ai', () => {
  const sx = START_SPOT.x, sz = START_SPOT.z;
  it('AC204: a guard stays within 9 blocks of his spot over 2 minutes and moves every 10 seconds', () => {
    const world = new World();
    const k = make('guard', sx + 20, sz, world);
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const rng = createRng(7);
    let maxDist = 0, lastMove = 0, maxGap = 0, px = k.body.x, pz = k.body.z;
    for (let i = 0; i < 120 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      maxDist = Math.max(maxDist, Math.hypot(k.body.x - k.spot!.x, k.body.z - k.spot!.z));
      if (Math.hypot(k.body.x - px, k.body.z - pz) > 0.05) { px = k.body.x; pz = k.body.z; lastMove = i; }
      maxGap = Math.max(maxGap, (i - lastMove) * DT);
    }
    expect(maxDist).toBeLessThanOrEqual(9);
    expect(maxGap).toBeLessThanOrEqual(10);
  });
  it('AC204: a knight on Blijf hier stays within 1 block of his spot over 2 minutes', () => {
    const world = new World();
    const k = make('stay', sx + 20, sz, world);
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const rng = createRng(3);
    let maxDist = 0;
    for (let i = 0; i < 120 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      maxDist = Math.max(maxDist, Math.hypot(k.body.x - k.spot!.x, k.body.z - k.spot!.z));
    }
    expect(maxDist).toBeLessThanOrEqual(1);
  });
  it('AC204: a follower walks 3 blocks per second and ends up behind the kid', () => {
    const world = new World();
    const kid = { x: sx, y: START_SPOT.y, z: sz };
    const k = make('follow', sx - 3, sz, world);
    const rng = createRng(5);
    for (let i = 0; i < 90; i++) stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
    const start = { x: k.body.x, z: k.body.z };
    for (let i = 0; i < 5 * 30; i++) {
      kid.z += 3 * DT;
      kid.y = groundY(world, kid.x, kid.z);
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
    }
    const walked = Math.hypot(k.body.x - start.x, k.body.z - start.z);
    // He starts about 3 blocks behind and keeps pace: the kid walked 15 blocks.
    expect(walked).toBeGreaterThan(15 * 0.8 - 3);
    expect(walked).toBeLessThan(15 * 1.2);
    expect(k.body.z - kid.z).toBeLessThan(0);
  });
  it('AC204: stepToward pops next to a target behind a wall after 3 seconds', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    for (let yy = y - 4; yy < y + 8; yy++) for (let dz = -12; dz <= 12; dz++) world.set(Math.floor(sx) + 4, yy, Math.floor(sz) + dz, STONE);
    const cx = Math.floor(sx), cz = Math.floor(sz);
    const body = createKnightBody({ x: cx + 1.5, y, z: cz + 0.5 });
    const target = { x: cx + 8.5, y, z: cz + 0.5 };
    const rng = createRng(1);
    let t = 0, result = 'walking';
    while (result !== 'popped' && t < 10) {
      result = stepToward(world, body, target, rng, DT, { speed: 3, stuckSeconds: 3, arrive: 1.2, box: KNIGHT_BOX });
      t += DT;
    }
    expect(result).toBe('popped');
    // Walking to the wall takes about 1 s, then 3 s stuck (plus or minus 0.2).
    expect(t).toBeGreaterThan(3 - 0.2);
    expect(t).toBeLessThan(3 + 0.2 + 1.5);
    expect(Math.hypot(body.x - target.x, body.z - target.z)).toBeLessThanOrEqual(2.6);
  });
  it('AC204: a knight never walks into lava', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const kid = { x: sx, y, z: sz };
    const k = make('guard', sx + 2, sz, world);
    for (let dx = -8; dx <= 12; dx++) for (let dz = -8; dz <= 8; dz++) {
      if ((dx + dz) % 2 === 0 && Math.hypot(dx, dz) > 1.5) world.set(Math.floor(sx) + 2 + dx, y - 1, Math.floor(sz) + dz, LAVA);
    }
    expect(hazardAt(world, k.body.x, k.body.y, k.body.z, 0.6)).toBe(false);
    const rng = createRng(11);
    for (let i = 0; i < 60 * 30; i++) {
      stepKnight(k, { world, rng, player: kid, playerYaw: 0, dt: DT });
      expect(hazardAt(world, k.body.x, k.body.y, k.body.z, 0.6)).toBe(false);
    }
  });
  it('AC205: salutes within 3 blocks, not again within a minute, again after it', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const k = make('stay', sx, sz, world);
    k.saluteClockMs = SALUTE_GAP_MS;
    const rng = createRng(2);
    const run = (kidX: number, ms: number): number => {
      let n = 0;
      for (let t = 0; t < ms; t += 1000 * DT) {
        if (stepKnight(k, { world, rng, player: { x: kidX, y, z: sz }, playerYaw: 0, dt: DT }) === 'salute') n++;
      }
      return n;
    };
    expect(run(sx + 10, 2000)).toBe(0);
    expect(run(sx + 2, 1000)).toBe(1);
    expect(run(sx + 10, 5000)).toBe(0);
    expect(run(sx + 2, 5000)).toBe(0);
    expect(run(sx + 10, 55000)).toBe(0);
    expect(run(sx + 2, 1000)).toBe(1);
  });
  it('AC205: a follower never salutes', () => {
    const world = new World();
    const y = groundY(world, sx, sz);
    const k = make('follow', sx, sz, world);
    k.saluteClockMs = SALUTE_GAP_MS * 2;
    expect(stepKnight(k, { world, rng: createRng(1), player: { x: sx + 1, y, z: sz }, playerYaw: 0, dt: DT })).toBeNull();
  });
});
